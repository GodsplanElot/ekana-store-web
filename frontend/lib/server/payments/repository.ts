import "server-only"

import { z } from "zod"
import type { PaystackDomain } from "@/lib/server/paystack"
import { deliveryFeeForSubtotal } from "@/lib/server/payments/domain"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

const paymentAttemptStatusSchema = z.enum([
  "created",
  "initializing",
  "initialized",
  "pending",
  "processing",
  "succeeded",
  "failed",
  "abandoned",
  "cancelled",
  "released",
  "review",
  "refund_pending",
  "refunded",
  "partially_refunded",
])

const orderPaymentStatusSchema = z.enum([
  "pending",
  "processing",
  "paid",
  "failed",
  "abandoned",
  "cancelled",
  "refunded",
  "partially_refunded",
  "refund_pending",
  "reversed",
  "review",
])

const orderItemSnapshotSchema = z
  .object({
    productId: z.string().min(1),
    name: z.string().min(1),
    price: z.number().int().nonnegative(),
    quantity: z.number().int().positive(),
    lineTotal: z.number().int().nonnegative(),
  })
  .strict()

const paymentOrderSchema = z
  .object({
    ok: z.literal(true),
    replayed: z.boolean(),
    orderId: z.string().uuid(),
    orderReference: z.string().min(1),
    paymentAttemptId: z.string().uuid(),
    paymentReference: z.string().min(1),
    paymentStatus: orderPaymentStatusSchema,
    attemptStatus: paymentAttemptStatusSchema,
    subtotal: z.number().int().positive(),
    deliveryFee: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    expectedAmountKobo: z.number().int().positive(),
    currency: z.literal("NGN"),
    providerDomain: z.enum(["test", "live"]),
    reservationExpiresAt: z.string().datetime({ offset: true }),
    authorizationUrl: z.string().url().nullable(),
    accessCode: z.string().min(1).nullable(),
    items: z.array(orderItemSnapshotSchema).min(1),
  })
  .strict()

const initializationResultSchema = z
  .object({
    ok: z.literal(true),
    replayed: z.boolean(),
    paymentAttemptId: z.string().uuid(),
    paymentReference: z.string().min(1),
    attemptStatus: paymentAttemptStatusSchema,
    providerDomain: z.enum(["test", "live"]),
    providerStatus: z.string().nullable(),
    authorizationUrl: z.string().url(),
    accessCode: z.string().min(1),
    initializedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict()

const initializationClaimSchema = z
  .object({
    ok: z.literal(true),
    claimed: z.boolean(),
    claimReason: z.enum([
      "already_initialized",
      "attempt_terminal",
      "reservation_expired",
      "claim_in_progress",
      "claim_acquired",
      "claim_reclaimed",
      "attempt_not_claimable",
    ]),
    claimExpiresAt: z.string().datetime({ offset: true }).nullable(),
    paymentAttemptId: z.string().uuid(),
    paymentReference: z.string().min(1),
    attemptStatus: paymentAttemptStatusSchema,
    providerDomain: z.enum(["test", "live"]),
    authorizationUrl: z.string().url().nullable(),
    accessCode: z.string().min(1).nullable(),
  })
  .strict()

const releaseResultSchema = z
  .object({
    ok: z.boolean(),
    replayed: z.boolean(),
    paymentAttemptId: z.string().uuid(),
    paymentReference: z.string().min(1),
    attemptStatus: paymentAttemptStatusSchema,
    providerDomain: z.enum(["test", "live"]),
    orderPaymentStatus: orderPaymentStatusSchema,
    releasedReservations: z.number().int().nonnegative(),
    releasedUnits: z.number().int().nonnegative(),
  })
  .strict()

const expiredReleaseResultSchema = z
  .object({
    ok: z.literal(true),
    releasedAttempts: z.number().int().nonnegative(),
    releasedReservations: z.number().int().nonnegative(),
    releasedUnits: z.number().int().nonnegative(),
  })
  .strict()

const reconciliationResultSchema = z
  .object({
    ok: z.boolean(),
    replayed: z.boolean(),
    eventOutcome: z.enum(["applied", "duplicate", "ignored", "rejected", "error"]),
    eventReason: z.string().nullable(),
    providerDomain: z.enum(["test", "live"]).nullable().optional(),
    paymentAttemptId: z.string().uuid().nullable(),
    orderId: z.string().uuid().nullable().optional(),
    paymentReference: z.string().min(1),
    attemptStatus: paymentAttemptStatusSchema.nullable(),
    orderPaymentStatus: orderPaymentStatusSchema.nullable(),
    paidAt: z.string().datetime({ offset: true }).nullable().optional(),
    capturedReservations: z.number().int().nonnegative().optional(),
  })
  .strict()

const quotedProductSchema = z
  .object({
    id: z.string().min(1),
    price: z.number().int().positive(),
    is_active: z.boolean(),
    inventory_count: z.number().int().nonnegative(),
  })
  .strict()

const notificationPayloadSchema = z
  .object({
    reference: z.string().min(1),
    customerName: z.string().min(1),
    total: z.number().int().positive(),
    totalKobo: z.number().int().positive(),
    currency: z.literal("NGN"),
    paidAt: z.string().datetime({ offset: true }).nullable(),
    reviewReason: z.string().optional(),
  })
  .strict()

export const ORDER_NOTIFICATION_EMAIL_RECIPIENT =
  "ORDER_NOTIFICATION_EMAIL" as const

const notificationOutboxRowSchema = z
  .object({
    id: z.string().uuid(),
    order_id: z.string().uuid(),
    payment_attempt_id: z.string().uuid().nullable(),
    template_key: z.enum([
      "payment_confirmation",
      "payment_review",
      "admin_payment_confirmation",
      "admin_payment_review",
    ]),
    recipient: z.union([
      z.string().email(),
      z.literal(ORDER_NOTIFICATION_EMAIL_RECIPIENT),
    ]),
    dedupe_key: z.string().min(1).max(300),
    payload: notificationPayloadSchema,
    status: z.enum(["pending", "processing", "sent", "failed", "dead"]),
    attempt_count: z.number().int().nonnegative(),
    max_attempts: z.number().int().positive(),
    next_attempt_at: z.string().datetime({ offset: true }),
    locked_at: z.string().datetime({ offset: true }).nullable(),
    locked_by: z.string().nullable(),
  })
  .strict()
  .superRefine((row, context) => {
    const isAdminTemplate = row.template_key.startsWith("admin_")
    const usesAdminSentinel =
      row.recipient === ORDER_NOTIFICATION_EMAIL_RECIPIENT
    if (isAdminTemplate !== usesAdminSentinel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipient"],
        message: "Notification template and recipient contract do not match.",
      })
    }
  })

const dueNotificationAttemptSchema = z
  .object({
    payment_attempt_id: z.string().uuid(),
    status: z.enum(["pending", "failed", "processing"]),
    next_attempt_at: z.string().datetime({ offset: true }),
    locked_at: z.string().datetime({ offset: true }).nullable(),
  })
  .strict()

export type PaymentOrderRecord = z.infer<typeof paymentOrderSchema>
export type PaymentInitializationRecord = z.infer<
  typeof initializationResultSchema
>
export type PaymentInitializationClaim = z.infer<
  typeof initializationClaimSchema
>
export type PaymentReleaseRecord = z.infer<typeof releaseResultSchema>
export type PaymentReconciliationRecord = z.infer<
  typeof reconciliationResultSchema
>
export type NotificationOutboxRow = z.infer<
  typeof notificationOutboxRowSchema
>

export type PaymentRepositoryErrorCode =
  | "unavailable_products"
  | "idempotency_conflict"
  | "cart_changed"
  | "attempt_not_found"
  | "initialization_conflict"
  | "initialization_claim_invalid"
  | "initialization_claim_not_owned"
  | "attempt_not_initializable"
  | "contract"
  | "unavailable"

const repositoryErrorDetails: Record<
  PaymentRepositoryErrorCode,
  { message: string; status: number; retryable: boolean }
> = {
  unavailable_products: {
    message: "One or more cart items are unavailable.",
    status: 409,
    retryable: false,
  },
  idempotency_conflict: {
    message: "This checkout key was already used for different details.",
    status: 409,
    retryable: false,
  },
  cart_changed: {
    message: "Cart pricing changed. Please review your cart and retry.",
    status: 409,
    retryable: true,
  },
  attempt_not_found: {
    message: "The payment attempt could not be found.",
    status: 404,
    retryable: false,
  },
  initialization_conflict: {
    message: "Payment initialization is already in progress.",
    status: 409,
    retryable: true,
  },
  initialization_claim_invalid: {
    message: "The payment initialization claim is invalid.",
    status: 409,
    retryable: false,
  },
  initialization_claim_not_owned: {
    message: "Payment initialization is already in progress.",
    status: 409,
    retryable: true,
  },
  attempt_not_initializable: {
    message: "This payment attempt can no longer be initialized.",
    status: 409,
    retryable: false,
  },
  contract: {
    message: "Payment storage returned an invalid response.",
    status: 503,
    retryable: true,
  },
  unavailable: {
    message: "Payment storage is temporarily unavailable.",
    status: 503,
    retryable: true,
  },
}

export class PaymentRepositoryError extends Error {
  readonly code: PaymentRepositoryErrorCode
  readonly status: number
  readonly retryable: boolean

  constructor(code: PaymentRepositoryErrorCode) {
    const details = repositoryErrorDetails[code]
    super(details.message)
    this.name = "PaymentRepositoryError"
    this.code = code
    this.status = details.status
    this.retryable = details.retryable
  }
}

function repositoryErrorFromUnknown(error: unknown): PaymentRepositoryError {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : ""

  if (message.includes("products_unavailable")) {
    return new PaymentRepositoryError("unavailable_products")
  }
  if (message.includes("idempotency_key_conflict")) {
    return new PaymentRepositoryError("idempotency_conflict")
  }
  if (
    message.includes("delivery_fee_mismatch") ||
    message.includes("order_total_out_of_range")
  ) {
    return new PaymentRepositoryError("cart_changed")
  }
  if (message.includes("payment_attempt_not_found")) {
    return new PaymentRepositoryError("attempt_not_found")
  }
  if (message.includes("paystack_initialization_conflict")) {
    return new PaymentRepositoryError("initialization_conflict")
  }
  if (message.includes("initialization_claim_invalid")) {
    return new PaymentRepositoryError("initialization_claim_invalid")
  }
  if (message.includes("initialization_claim_not_owned")) {
    return new PaymentRepositoryError("initialization_claim_not_owned")
  }
  if (message.includes("payment_attempt_not_initializable")) {
    return new PaymentRepositoryError("attempt_not_initializable")
  }
  return new PaymentRepositoryError("unavailable")
}

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdmin>>

function requireAdminClient(): AdminClient {
  const client = createSupabaseAdmin()
  if (!client) throw new PaymentRepositoryError("unavailable")
  return client
}

async function callRpc<TSchema extends z.ZodTypeAny>(
  client: AdminClient,
  functionName: string,
  args: Record<string, unknown>,
  schema: TSchema
): Promise<z.output<TSchema>> {
  const { data, error } = await client.rpc(functionName, args)
  if (error) throw repositoryErrorFromUnknown(error)

  const parsed = schema.safeParse(data)
  if (!parsed.success) throw new PaymentRepositoryError("contract")
  return parsed.data
}

export type CreatePaymentOrderInput = {
  reference: string
  idempotencyKey: string
  customerEmail: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryCity: string
  orderNotes?: string
  deliveryFee: number
  items: Array<{ productId: string; quantity: number }>
  providerDomain: PaystackDomain
  reservationTtlSeconds: number
}

export type FinalizePaymentInput = {
  reference: string
  eventKey: string
  providerTransactionId: string
  amountKobo: number
  currency: string
  providerStatus: string
  providerDomain: PaystackDomain
  paidAt: string | null
  eventSource: "webhook" | "verification" | "reconciliation"
  eventSummary: Record<string, unknown>
}

export type RecordPaymentStatusInput = {
  reference: string
  eventKey: string
  eventType: string
  providerStatus: string
  providerTransactionId: string | null
  amountKobo: number | null
  currency: string | null
  providerDomain: PaystackDomain
  eventSource: "webhook" | "verification" | "reconciliation"
  occurredAt: string | null
  eventSummary: Record<string, unknown>
}

export class PaymentRepository {
  private readonly client: AdminClient

  constructor(client: AdminClient = requireAdminClient()) {
    this.client = client
  }

  async quoteDeliveryFee(
    items: Array<{ productId: string; quantity: number }>
  ): Promise<number> {
    const productIds = items.map((item) => item.productId)
    const { data, error } = await this.client
      .from("products")
      .select("id,price,is_active,inventory_count")
      .in("id", productIds)

    if (error) throw new PaymentRepositoryError("unavailable")

    const parsed = z.array(quotedProductSchema).safeParse(data)
    if (!parsed.success) throw new PaymentRepositoryError("contract")

    const rowsById = new Map(parsed.data.map((row) => [row.id, row]))
    let subtotal = 0
    for (const item of items) {
      const product = rowsById.get(item.productId)
      if (
        !product ||
        !product.is_active ||
        product.inventory_count < item.quantity
      ) {
        throw new PaymentRepositoryError("unavailable_products")
      }
      subtotal += product.price * item.quantity
      if (!Number.isSafeInteger(subtotal)) {
        throw new PaymentRepositoryError("cart_changed")
      }
    }

    return deliveryFeeForSubtotal(subtotal)
  }

  createPaymentOrder(input: CreatePaymentOrderInput) {
    return callRpc(
      this.client,
      "create_payment_order",
      {
        p_reference: input.reference,
        p_idempotency_key: input.idempotencyKey,
        p_customer_email: input.customerEmail,
        p_customer_name: input.customerName,
        p_customer_phone: input.customerPhone,
        p_delivery_address: input.deliveryAddress,
        p_delivery_city: input.deliveryCity,
        p_order_notes: input.orderNotes ?? null,
        p_delivery_fee: input.deliveryFee,
        p_items: input.items,
        p_provider_domain: input.providerDomain,
        p_reservation_ttl_seconds: input.reservationTtlSeconds,
      },
      paymentOrderSchema
    )
  }

  claimPaystackInitialization(input: {
    reference: string
    claimToken: string
    leaseSeconds: number
  }) {
    return callRpc(
      this.client,
      "claim_paystack_initialization",
      {
        p_reference: input.reference,
        p_claim_token: input.claimToken,
        p_lease_seconds: input.leaseSeconds,
      },
      initializationClaimSchema
    )
  }

  savePaystackInitialization(input: {
    reference: string
    authorizationUrl: string
    accessCode: string
    claimToken: string
    providerStatus?: string
    providerTransactionId?: string | null
  }) {
    return callRpc(
      this.client,
      "save_paystack_initialization",
      {
        p_reference: input.reference,
        p_authorization_url: input.authorizationUrl,
        p_access_code: input.accessCode,
        p_claim_token: input.claimToken,
        p_provider_status: input.providerStatus ?? "pending",
        p_provider_transaction_id: input.providerTransactionId ?? null,
      },
      initializationResultSchema
    )
  }

  releasePaymentAttempt(
    reference: string,
    reason: string,
    claimToken?: string
  ) {
    return callRpc(
      this.client,
      "release_payment_attempt",
      {
        p_reference: reference,
        p_reason: reason,
        p_claim_token: claimToken ?? null,
      },
      releaseResultSchema
    )
  }

  releaseExpiredPaymentReservations(limit = 100) {
    return callRpc(
      this.client,
      "release_expired_payment_reservations",
      { p_limit: limit },
      expiredReleaseResultSchema
    )
  }

  async listDueNotificationAttemptIds(
    now: Date,
    staleBefore: Date,
    limit = 20
  ): Promise<string[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new PaymentRepositoryError("contract")
    }

    const selectedColumns =
      "payment_attempt_id,status,next_attempt_at,locked_at"
    const [readyResult, staleResult] = await Promise.all([
      this.client
        .from("notification_outbox")
        .select(selectedColumns)
        .in("status", ["pending", "failed"])
        .lte("next_attempt_at", now.toISOString())
        .not("payment_attempt_id", "is", null)
        .order("next_attempt_at", { ascending: true })
        .limit(limit),
      this.client
        .from("notification_outbox")
        .select(selectedColumns)
        .eq("status", "processing")
        .lt("locked_at", staleBefore.toISOString())
        .not("payment_attempt_id", "is", null)
        .order("locked_at", { ascending: true })
        .limit(limit),
    ])

    if (readyResult.error || staleResult.error) {
      throw new PaymentRepositoryError("unavailable")
    }

    const parsed = z
      .array(dueNotificationAttemptSchema)
      .safeParse([...(readyResult.data ?? []), ...(staleResult.data ?? [])])
    if (!parsed.success) throw new PaymentRepositoryError("contract")

    return Array.from(
      new Set(parsed.data.map((row) => row.payment_attempt_id))
    ).slice(0, limit)
  }

  finalizePaystackPayment(input: FinalizePaymentInput) {
    return callRpc(
      this.client,
      "finalize_paystack_payment",
      {
        p_reference: input.reference,
        p_event_key: input.eventKey,
        p_provider_transaction_id: input.providerTransactionId,
        p_amount_kobo: input.amountKobo,
        p_currency: input.currency,
        p_provider_status: input.providerStatus,
        p_provider_domain: input.providerDomain,
        p_paid_at: input.paidAt,
        p_event_source: input.eventSource,
        p_event_summary: input.eventSummary,
      },
      reconciliationResultSchema
    )
  }

  recordPaystackPaymentStatus(input: RecordPaymentStatusInput) {
    return callRpc(
      this.client,
      "record_paystack_payment_status",
      {
        p_reference: input.reference,
        p_event_key: input.eventKey,
        p_event_type: input.eventType,
        p_provider_status: input.providerStatus,
        p_provider_transaction_id: input.providerTransactionId,
        p_amount_kobo: input.amountKobo,
        p_currency: input.currency,
        p_provider_domain: input.providerDomain,
        p_event_source: input.eventSource,
        p_occurred_at: input.occurredAt,
        p_event_summary: input.eventSummary,
      },
      reconciliationResultSchema
    )
  }

  async claimNotificationForAttempt(
    paymentAttemptId: string,
    workerId: string,
    now: Date,
    staleBefore: Date
  ): Promise<NotificationOutboxRow | null> {
    const selectedColumns =
      "id,order_id,payment_attempt_id,template_key,recipient,dedupe_key,payload,status,attempt_count,max_attempts,next_attempt_at,locked_at,locked_by"
    const { data, error } = await this.client
      .from("notification_outbox")
      .select(selectedColumns)
      .eq("payment_attempt_id", paymentAttemptId)
      .in("status", ["pending", "failed", "processing"])
      .order("created_at", { ascending: true })
      .limit(10)

    if (error) throw new PaymentRepositoryError("unavailable")
    const candidates = z.array(notificationOutboxRowSchema).safeParse(data)
    if (!candidates.success) throw new PaymentRepositoryError("contract")

    const nowIso = now.toISOString()
    const staleIso = staleBefore.toISOString()
    for (const candidate of candidates.data) {
      const nextAttemptAt = Date.parse(candidate.next_attempt_at)
      const lockedAt = candidate.locked_at
        ? Date.parse(candidate.locked_at)
        : Number.NaN
      if (!Number.isFinite(nextAttemptAt)) {
        throw new PaymentRepositoryError("contract")
      }
      if (candidate.locked_at && !Number.isFinite(lockedAt)) {
        throw new PaymentRepositoryError("contract")
      }

      const ready =
        candidate.status === "pending" || candidate.status === "failed"
          ? nextAttemptAt <= now.getTime()
          : Number.isFinite(lockedAt) && lockedAt < staleBefore.getTime()
      if (!ready) continue

      if (candidate.attempt_count >= candidate.max_attempts) {
        await this.client
          .from("notification_outbox")
          .update({ status: "dead", locked_at: null, locked_by: null })
          .eq("id", candidate.id)
          .eq("status", candidate.status)
          .eq("attempt_count", candidate.attempt_count)
        continue
      }

      let claim = this.client
        .from("notification_outbox")
        .update({
          status: "processing",
          attempt_count: candidate.attempt_count + 1,
          locked_at: nowIso,
          locked_by: workerId,
        })
        .eq("id", candidate.id)
        .eq("status", candidate.status)
        .eq("attempt_count", candidate.attempt_count)

      claim =
        candidate.status === "processing"
          ? claim.lt("locked_at", staleIso)
          : claim.lte("next_attempt_at", nowIso)

      const { data: claimed, error: claimError } = await claim
        .select(selectedColumns)
        .maybeSingle()

      if (claimError) throw new PaymentRepositoryError("unavailable")
      if (!claimed) continue

      const parsedClaim = notificationOutboxRowSchema.safeParse(claimed)
      if (!parsedClaim.success) throw new PaymentRepositoryError("contract")
      return parsedClaim.data
    }

    return null
  }

  async markNotificationSent(
    row: NotificationOutboxRow,
    workerId: string,
    sentAt: Date
  ): Promise<void> {
    if (row.template_key === "payment_confirmation") {
      const { error: orderError } = await this.client
        .from("orders")
        .update({ payment_confirmation_sent_at: sentAt.toISOString() })
        .eq("id", row.order_id)
        .is("payment_confirmation_sent_at", null)

      if (orderError) throw new PaymentRepositoryError("unavailable")
    }

    const { data, error } = await this.client
      .from("notification_outbox")
      .update({
        status: "sent",
        sent_at: sentAt.toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: null,
      })
      .eq("id", row.id)
      .eq("status", "processing")
      .eq("locked_by", workerId)
      .select("id")
      .maybeSingle()

    if (error) throw new PaymentRepositoryError("unavailable")
    if (!data) throw new PaymentRepositoryError("unavailable")
  }

  async markNotificationFailed(
    row: NotificationOutboxRow,
    workerId: string,
    nextAttemptAt: Date
  ): Promise<void> {
    const exhausted = row.attempt_count >= row.max_attempts
    const { error } = await this.client
      .from("notification_outbox")
      .update({
        status: exhausted ? "dead" : "failed",
        next_attempt_at: nextAttemptAt.toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: "email_delivery_failed",
      })
      .eq("id", row.id)
      .eq("status", "processing")
      .eq("locked_by", workerId)

    if (error) throw new PaymentRepositoryError("unavailable")
  }
}
