import { createHash } from "node:crypto"
import { z } from "zod"

export const CHECKOUT_RESERVATION_TTL_SECONDS = 30 * 60
export const FREE_DELIVERY_THRESHOLD_NAIRA = 20_000
export const STANDARD_DELIVERY_FEE_NAIRA = 2_500

export const checkoutRequestSchema = z
  .object({
    customer: z
      .object({
        firstName: z.string().trim().min(1).max(120),
        lastName: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().min(5).max(50),
        address: z.string().trim().min(3).max(1_000),
        city: z.string().trim().min(2).max(160),
        notes: z.string().trim().max(1_000).optional(),
      })
      .strict(),
    quotedTotal: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    items: z
      .array(
        z
          .object({
            productId: z.string().trim().min(1).max(200),
            quantity: z.number().int().min(1).max(20),
          })
          .strict()
      )
      .min(1)
      .max(50),
  })
  .strict()

export const checkoutIdempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(200)
  .regex(/^[A-Za-z0-9.=:_-]+$/)

export const paymentReferenceSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._=-]+$/)

export const paymentReferenceRequestSchema = z
  .object({
    reference: paymentReferenceSchema,
  })
  .strict()

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>
export type CheckoutItemRequest = CheckoutRequest["items"][number]
export type NormalizedCheckoutItem = CheckoutItemRequest

export function isAllowedPaystackCallbackUrl(
  value: string,
  providerDomain: "test" | "live"
): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.protocol === "https:") return true
  if (providerDomain === "live" || url.protocol !== "http:") return false

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  return ["localhost", "127.0.0.1", "::1"].includes(hostname)
}

export class CheckoutInputError extends Error {
  readonly code: "item_limit"

  constructor() {
    super("A cart item exceeds the purchase limit.")
    this.name = "CheckoutInputError"
    this.code = "item_limit"
  }
}

export function normalizeCheckoutItems(
  items: readonly CheckoutItemRequest[]
): NormalizedCheckoutItem[] {
  const quantitiesByProduct = new Map<string, number>()

  for (const item of items) {
    const quantity = (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity
    if (quantity > 20) throw new CheckoutInputError()
    quantitiesByProduct.set(item.productId, quantity)
  }

  return Array.from(quantitiesByProduct, ([productId, quantity]) => ({
    productId,
    quantity,
  })).sort((left, right) => left.productId.localeCompare(right.productId))
}

export function createPaymentReference(idempotencyKey: string): string {
  const key = checkoutIdempotencyKeySchema.parse(idempotencyKey)
  const digest = createHash("sha256").update(key, "utf8").digest("hex")
  return `ekana-${digest.slice(0, 40)}`
}

export function deliveryFeeForSubtotal(subtotalNaira: number): number {
  if (!Number.isSafeInteger(subtotalNaira) || subtotalNaira <= 0) {
    throw new TypeError("Subtotal must be a positive integer.")
  }
  return subtotalNaira >= FREE_DELIVERY_THRESHOLD_NAIRA
    ? 0
    : STANDARD_DELIVERY_FEE_NAIRA
}

export const supportedPaystackWebhookEventNames = [
  "charge.success",
  "charge.dispute.create",
  "charge.dispute.remind",
  "charge.dispute.resolve",
  "refund.pending",
  "refund.processing",
  "refund.processed",
  "refund.failed",
  "refund.needs-attention",
] as const

export type SupportedPaystackWebhookEventName =
  (typeof supportedPaystackWebhookEventNames)[number]

export function isMatchingPaystackRefundEventStatus(
  eventType: string,
  status: string
): boolean {
  return eventType === `refund.${status}`
}

const supportedWebhookNames = new Set<string>(supportedPaystackWebhookEventNames)
const webhookEnvelopeSchema = z
  .object({
    event: z.string().min(1).max(120),
  })
  .passthrough()

export type PaystackWebhookEnvelopeResult =
  | { kind: "malformed" }
  | { kind: "unsupported"; event: string }
  | { kind: "supported"; event: SupportedPaystackWebhookEventName }

export function inspectPaystackWebhookEnvelope(
  rawBody: string
): PaystackWebhookEnvelopeResult {
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { kind: "malformed" }
  }

  const parsed = webhookEnvelopeSchema.safeParse(payload)
  if (!parsed.success) return { kind: "malformed" }
  if (!supportedWebhookNames.has(parsed.data.event)) {
    return { kind: "unsupported", event: parsed.data.event }
  }
  return {
    kind: "supported",
    event: parsed.data.event as SupportedPaystackWebhookEventName,
  }
}

type PaystackEventKeyInput = {
  domain: "test" | "live"
  eventType: string
  source: "webhook" | "verification" | "reconciliation"
  providerTransactionId?: string | null
  reference: string
  providerStatus: string
  rawBody?: string
}

export function createPaystackEventKey(input: PaystackEventKeyInput): string {
  const identity = input.providerTransactionId
    ? [
        input.providerTransactionId ?? "none",
        input.reference,
        input.providerStatus,
      ].join(":")
    : input.rawBody
      ? createHash("sha256").update(input.rawBody, "utf8").digest("hex")
      : ["none", input.reference, input.providerStatus].join(":")

  const digest = createHash("sha256").update(identity, "utf8").digest("hex")
  return `paystack:${input.domain}:${input.source}:${input.eventType}:${digest}`
}

export type PaystackInitializationFailureDisposition =
  | "deterministic"
  | "indeterminate"

const referenceConflictPattern =
  /(?:duplicate|already(?:\s+been)?\s+(?:used|exists?)|reference\s+exists?)/iu

export function isPaystackReferenceConflictMessage(
  providerMessage: string | undefined
): boolean {
  return Boolean(
    providerMessage &&
      /reference/iu.test(providerMessage) &&
      referenceConflictPattern.test(providerMessage)
  )
}

export function classifyPaystackInitializationFailure(input: {
  code: string
  providerStatus?: number
  providerMessage?: string
}): PaystackInitializationFailureDisposition {
  if (input.code === "configuration" || input.code === "invalid_input") {
    return "deterministic"
  }

  if (input.code !== "provider_rejected") return "indeterminate"

  const status = input.providerStatus
  if (
    status === undefined ||
    status < 400 ||
    status >= 500 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    isPaystackReferenceConflictMessage(input.providerMessage)
  ) {
    return "indeterminate"
  }

  return "deterministic"
}

export function providerStatusForPaystackDisputeEvent(
  eventType:
    | "charge.dispute.create"
    | "charge.dispute.remind"
    | "charge.dispute.resolve"
): "dispute_opened" | "dispute_reminder" | "dispute_resolved" {
  if (eventType === "charge.dispute.create") return "dispute_opened"
  if (eventType === "charge.dispute.remind") return "dispute_reminder"
  return "dispute_resolved"
}

export function publicPaymentStatusForProviderStatus(status: string): string {
  if (status === "success") return "paid"
  if (
    [
      "pending",
      "ongoing",
      "processing",
      "queued",
      "reversal_pending",
    ].includes(status)
  ) {
    return "processing"
  }
  if (["failed", "abandoned", "reversed"].includes(status)) return status
  return "review"
}

export function isTerminalUnpaidProviderStatus(status: string): boolean {
  return ["failed", "abandoned", "reversed"].includes(status)
}

export function shouldReleaseTerminalUnpaidPayment(input: {
  providerStatus: string
  reconciliationOk: boolean
  attemptStatus: string | null
  orderPaymentStatus: string | null
}): boolean {
  if (
    !input.reconciliationOk ||
    !isTerminalUnpaidProviderStatus(input.providerStatus)
  ) {
    return false
  }

  if (input.providerStatus === "reversed") {
    return (
      input.attemptStatus === "cancelled" &&
      input.orderPaymentStatus === "reversed"
    )
  }

  return ["failed", "abandoned", "cancelled"].includes(
    input.orderPaymentStatus ?? ""
  )
}

export type CheckoutReplayDecision =
  | { kind: "continue" }
  | { kind: "fresh_attempt" }
  | { kind: "invalid" }
  | { kind: "return_existing"; authorizationUrl: string }
  | { kind: "return_status"; paymentStatus: string }

const durableOrderPaymentStatuses = new Set([
  "paid",
  "review",
  "refund_pending",
  "refunded",
  "partially_refunded",
  "reversed",
])
const durableAttemptStatuses = new Set([
  "succeeded",
  "review",
  "refund_pending",
  "refunded",
  "partially_refunded",
])
const terminalUnpaidStatuses = new Set([
  "failed",
  "abandoned",
  "cancelled",
  "released",
])
const activeAuthorizationStatuses = new Set([
  "initialized",
  "pending",
  "processing",
])

export function classifyCheckoutReplay(input: {
  authorizationUrl: string | null
  attemptStatus: string
  paymentStatus: string
}): CheckoutReplayDecision {
  if (durableOrderPaymentStatuses.has(input.paymentStatus)) {
    return { kind: "return_status", paymentStatus: input.paymentStatus }
  }
  if (durableAttemptStatuses.has(input.attemptStatus)) {
    return { kind: "return_status", paymentStatus: "review" }
  }
  if (
    terminalUnpaidStatuses.has(input.attemptStatus) ||
    terminalUnpaidStatuses.has(input.paymentStatus)
  ) {
    return { kind: "fresh_attempt" }
  }
  if (input.authorizationUrl) {
    return activeAuthorizationStatuses.has(input.attemptStatus)
      ? {
          kind: "return_existing",
          authorizationUrl: input.authorizationUrl,
        }
      : { kind: "invalid" }
  }
  return { kind: "continue" }
}

export function publicPaymentStatusForReconciliation(input: {
  eventOutcome: "applied" | "duplicate" | "ignored" | "rejected" | "error"
  ok: boolean
  orderPaymentStatus: string | null
  providerStatus: string
}): string {
  if (
    !input.ok ||
    input.eventOutcome === "rejected" ||
    input.eventOutcome === "error"
  ) {
    return "review"
  }
  return (
    input.orderPaymentStatus ??
    publicPaymentStatusForProviderStatus(input.providerStatus)
  )
}
