import "server-only"

import { randomUUID } from "node:crypto"
import {
  getConfiguredPaystackDomain,
  initializePaystackPayment,
  PaystackError,
  paystackRefundEventSchema,
  type PaystackVerifiedPayment,
  type PaystackWebhookEvent,
  verifyPaystackPayment,
} from "@/lib/server/paystack"
import {
  CHECKOUT_RESERVATION_TTL_SECONDS,
  classifyPaystackInitializationFailure,
  classifyCheckoutReplay,
  createPaymentReference,
  createPaystackEventKey,
  isAllowedPaystackCallbackUrl,
  normalizeCheckoutItems,
  providerStatusForPaystackDisputeEvent,
  publicPaymentStatusForReconciliation,
  shouldReleaseTerminalUnpaidPayment,
  type CheckoutRequest,
} from "@/lib/server/payments/domain"
import {
  PaymentRepository,
  PaymentRepositoryError,
  type PaymentReconciliationRecord,
} from "@/lib/server/payments/repository"

const INITIALIZATION_LEASE_SECONDS = 45

type RetryDisposition = "fresh-attempt"

type PaymentServiceErrorCode =
  | "checkout_unavailable"
  | "cart_total_changed"
  | "initialization_in_progress"
  | "initialization_ended"
  | "provider_initialization_failed"
  | "webhook_domain_mismatch"
  | "payment_contract"

const serviceErrorDetails: Record<
  PaymentServiceErrorCode,
  { message: string; status: number; retryable: boolean }
> = {
  checkout_unavailable: {
    message: "Checkout is temporarily unavailable.",
    status: 503,
    retryable: true,
  },
  cart_total_changed: {
    message: "Your cart total changed. Please review your cart and try again.",
    status: 409,
    retryable: false,
  },
  initialization_in_progress: {
    message: "Payment initialization is already in progress. Please retry shortly.",
    status: 409,
    retryable: true,
  },
  initialization_ended: {
    message: "This checkout attempt has ended. Please start a fresh attempt.",
    status: 409,
    retryable: false,
  },
  provider_initialization_failed: {
    message: "Secure checkout could not be started. Please start a fresh attempt.",
    status: 502,
    retryable: false,
  },
  webhook_domain_mismatch: {
    message: "The webhook environment does not match this deployment.",
    status: 400,
    retryable: false,
  },
  payment_contract: {
    message: "Payment processing returned an invalid state.",
    status: 503,
    retryable: true,
  },
}

export class PaymentServiceError extends Error {
  readonly code: PaymentServiceErrorCode
  readonly status: number
  readonly retryable: boolean
  readonly retryDisposition?: RetryDisposition

  constructor(
    code: PaymentServiceErrorCode,
    retryDisposition?: RetryDisposition
  ) {
    const details = serviceErrorDetails[code]
    super(details.message)
    this.name = "PaymentServiceError"
    this.code = code
    this.status = details.status
    this.retryable = details.retryable
    this.retryDisposition = retryDisposition
  }
}

export type PublicPaymentError = {
  message: string
  status: number
  retryable: boolean
  source: "service" | "storage" | "provider" | "internal"
  retryDisposition?: RetryDisposition
}

export function getPublicPaymentError(error: unknown): PublicPaymentError {
  if (error instanceof PaymentServiceError) {
    return {
      message: error.message,
      status: error.status,
      retryable: error.retryable,
      source: "service",
      ...(error.retryDisposition
        ? { retryDisposition: error.retryDisposition }
        : {}),
    }
  }
  if (error instanceof PaymentRepositoryError) {
    return {
      message: error.message,
      status: error.status,
      retryable: error.retryable,
      source: "storage",
    }
  }
  if (error instanceof PaystackError) {
    if (error.code === "configuration") {
      return {
        message: "Checkout is temporarily unavailable.",
        status: 503,
        retryable: true,
        source: "provider",
      }
    }
    if (error.code === "invalid_input" || error.code === "invalid_webhook") {
      return {
        message: "The payment request is invalid.",
        status: 400,
        retryable: false,
        source: "provider",
      }
    }
    return {
      message: "Paystack could not complete the request. Please retry shortly.",
      status: 502,
      retryable: error.retryable,
      source: "provider",
    }
  }
  return {
    message: "Payment processing is temporarily unavailable.",
    status: 500,
    retryable: true,
    source: "internal",
  }
}

function requireConfiguredDomain() {
  const domain = getConfiguredPaystackDomain()
  if (!domain) throw new PaymentServiceError("checkout_unavailable")
  return domain
}

function requireCheckoutEnabled() {
  if (process.env.PAYSTACK_CHECKOUT_ENABLED !== "true") {
    throw new PaymentServiceError("checkout_unavailable")
  }
}

function requireMatchingDomain(
  actual: "test" | "live",
  expected: "test" | "live"
) {
  if (actual !== expected) {
    throw new PaymentServiceError("payment_contract")
  }
}

function callbackUrlForReference(
  appOrigin: string,
  reference: string,
  providerDomain: "test" | "live"
): string {
  let callbackUrl: URL
  try {
    callbackUrl = new URL("/checkout", appOrigin)
  } catch {
    throw new PaymentServiceError("checkout_unavailable")
  }
  if (!isAllowedPaystackCallbackUrl(callbackUrl.toString(), providerDomain)) {
    throw new PaymentServiceError("checkout_unavailable")
  }
  callbackUrl.searchParams.set("reference", reference)
  return callbackUrl.toString()
}

function isDeterministicInitializationFailure(error: PaystackError): boolean {
  return (
    classifyPaystackInitializationFailure({
      code: error.code,
      providerStatus: error.providerStatus,
      providerMessage: error.providerMessage,
    }) === "deterministic"
  )
}

function checkoutResponse(
  order: {
    paymentReference: string
    paymentStatus: string
    total: number
    replayed: boolean
  },
  authorizationUrl?: string
) {
  return {
    ok: true as const,
    replayed: order.replayed,
    reference: order.paymentReference,
    total: order.total,
    paymentStatus: order.paymentStatus,
    ...(authorizationUrl ? { payment: { authorizationUrl } } : {}),
  }
}

export async function createCheckoutPayment(
  request: CheckoutRequest,
  idempotencyKey: string,
  appOrigin: string
) {
  requireCheckoutEnabled()
  const providerDomain = requireConfiguredDomain()
  const items = normalizeCheckoutItems(request.items)
  const reference = createPaymentReference(idempotencyKey)
  const callbackUrl = callbackUrlForReference(
    appOrigin,
    reference,
    providerDomain
  )
  const repository = new PaymentRepository()
  await repository.releaseExpiredPaymentReservations()
  const deliveryFee = await repository.quoteDeliveryFee(items)
  const customerName =
    `${request.customer.firstName} ${request.customer.lastName}`.trim()

  const order = await repository.createPaymentOrder({
    reference,
    idempotencyKey,
    customerEmail: request.customer.email,
    customerName,
    customerPhone: request.customer.phone,
    deliveryAddress: request.customer.address,
    deliveryCity: request.customer.city,
    orderNotes: request.customer.notes,
    deliveryFee,
    items,
    providerDomain,
    reservationTtlSeconds: CHECKOUT_RESERVATION_TTL_SECONDS,
  })
  requireMatchingDomain(order.providerDomain, providerDomain)

  if (order.total !== request.quotedTotal) {
    const released = await repository.releasePaymentAttempt(
      order.paymentReference,
      "checkout_quoted_total_changed"
    )
    if (!released.ok || released.attemptStatus !== "released") {
      throw new PaymentServiceError("payment_contract")
    }
    throw new PaymentServiceError("cart_total_changed", "fresh-attempt")
  }

  const orderReplay = classifyCheckoutReplay({
    authorizationUrl: order.authorizationUrl,
    attemptStatus: order.attemptStatus,
    paymentStatus: order.paymentStatus,
  })
  if (orderReplay.kind === "return_existing") {
    return checkoutResponse(order, orderReplay.authorizationUrl)
  }
  if (orderReplay.kind === "return_status") {
    return checkoutResponse({
      ...order,
      paymentStatus: orderReplay.paymentStatus,
    })
  }
  if (orderReplay.kind === "fresh_attempt") {
    throw new PaymentServiceError("initialization_ended", "fresh-attempt")
  }
  if (orderReplay.kind === "invalid") {
    throw new PaymentServiceError("payment_contract")
  }

  const claimToken = randomUUID()
  const claim = await repository.claimPaystackInitialization({
    reference: order.paymentReference,
    claimToken,
    leaseSeconds: INITIALIZATION_LEASE_SECONDS,
  })
  requireMatchingDomain(claim.providerDomain, providerDomain)

  const claimReplay = classifyCheckoutReplay({
    authorizationUrl: claim.authorizationUrl,
    attemptStatus: claim.attemptStatus,
    paymentStatus: order.paymentStatus,
  })
  if (claimReplay.kind === "return_existing") {
    return checkoutResponse(order, claimReplay.authorizationUrl)
  }
  if (claimReplay.kind === "return_status") {
    return checkoutResponse({
      ...order,
      paymentStatus: claimReplay.paymentStatus,
    })
  }
  if (claimReplay.kind === "fresh_attempt") {
    throw new PaymentServiceError("initialization_ended", "fresh-attempt")
  }
  if (claimReplay.kind === "invalid") {
    throw new PaymentServiceError("payment_contract")
  }

  if (
    !claim.claimed &&
    claim.claimReason === "attempt_not_claimable"
  ) {
    throw new PaymentServiceError("payment_contract")
  }

  if (!claim.claimed) {
    if (claim.claimReason === "reservation_expired") {
      try {
        await repository.releaseExpiredPaymentReservations()
        const refreshed = await repository.claimPaystackInitialization({
          reference: order.paymentReference,
          claimToken,
          leaseSeconds: INITIALIZATION_LEASE_SECONDS,
        })
        requireMatchingDomain(refreshed.providerDomain, providerDomain)
        const refreshedReplay = classifyCheckoutReplay({
          authorizationUrl: refreshed.authorizationUrl,
          attemptStatus: refreshed.attemptStatus,
          paymentStatus: order.paymentStatus,
        })
        if (refreshedReplay.kind === "fresh_attempt") {
          throw new PaymentServiceError(
            "initialization_ended",
            "fresh-attempt"
          )
        }
        if (refreshedReplay.kind === "return_existing") {
          return checkoutResponse(order, refreshedReplay.authorizationUrl)
        }
        if (refreshedReplay.kind === "return_status") {
          return checkoutResponse({
            ...order,
            paymentStatus: refreshedReplay.paymentStatus,
          })
        }
        if (refreshedReplay.kind === "invalid") {
          throw new PaymentServiceError("payment_contract")
        }
      } catch (error) {
        if (error instanceof PaymentServiceError) throw error
        if (error instanceof PaymentRepositoryError) throw error
      }
    }

    throw new PaymentServiceError("initialization_in_progress")
  }

  let initialized
  try {
    initialized = await initializePaystackPayment({
      email: request.customer.email,
      amount: order.expectedAmountKobo,
      currency: order.currency,
      reference: order.paymentReference,
      callbackUrl,
      metadata: {
        orderId: order.orderId,
        orderReference: order.orderReference,
      },
    })
  } catch (error) {
    if (
      error instanceof PaystackError &&
      isDeterministicInitializationFailure(error)
    ) {
      let durablyReleased = false
      try {
        const released = await repository.releasePaymentAttempt(
          order.paymentReference,
          `paystack_initialization_${error.code}`,
          claimToken
        )
        durablyReleased = released.attemptStatus === "released"
      } catch {
        // Reservation expiry is the safe fallback if release storage is unavailable.
      }
      if (durablyReleased) {
        throw new PaymentServiceError(
          "provider_initialization_failed",
          "fresh-attempt"
        )
      }
    }
    throw error
  }

  const saved = await repository.savePaystackInitialization({
    reference: order.paymentReference,
    authorizationUrl: initialized.authorizationUrl,
    accessCode: initialized.accessCode,
    claimToken,
  })
  requireMatchingDomain(saved.providerDomain, providerDomain)

  return checkoutResponse(order, saved.authorizationUrl)
}

function safeVerificationSummary(payment: PaystackVerifiedPayment) {
  return {
    channel: payment.channel?.slice(0, 120) ?? null,
    gatewayResponse: payment.gatewayResponse?.slice(0, 240) ?? null,
  }
}

function notificationAttemptId(
  result: PaymentReconciliationRecord
): string | undefined {
  if (
    result.paymentAttemptId &&
    (result.attemptStatus === "review" ||
      result.orderPaymentStatus === "paid" ||
      result.orderPaymentStatus === "review")
  ) {
    return result.paymentAttemptId
  }
  return undefined
}

export async function verifyAndReconcilePayment(reference: string) {
  const providerDomain = requireConfiguredDomain()
  const payment = await verifyPaystackPayment(reference)
  requireMatchingDomain(payment.domain, providerDomain)
  const repository = new PaymentRepository()
  const summary = safeVerificationSummary(payment)

  let result: PaymentReconciliationRecord
  if (payment.status === "success") {
    result = await repository.finalizePaystackPayment({
      reference: payment.reference,
      eventKey: createPaystackEventKey({
        domain: payment.domain,
        eventType: "charge.success",
        source: "verification",
        providerTransactionId: payment.providerTransactionId,
        reference: payment.reference,
        providerStatus: payment.status,
      }),
      providerTransactionId: payment.providerTransactionId,
      amountKobo: payment.amount,
      currency: payment.currency,
      providerStatus: payment.status,
      providerDomain: payment.domain,
      paidAt: payment.paidAt,
      eventSource: "verification",
      eventSummary: summary,
    })
  } else {
    result = await repository.recordPaystackPaymentStatus({
      reference: payment.reference,
      eventKey: createPaystackEventKey({
        domain: payment.domain,
        eventType: "transaction.verify",
        source: "verification",
        providerTransactionId: payment.providerTransactionId,
        reference: payment.reference,
        providerStatus: payment.status,
      }),
      eventType: "transaction.verify",
      providerStatus: payment.status,
      providerTransactionId: payment.providerTransactionId,
      amountKobo: payment.amount,
      currency: payment.currency,
      providerDomain: payment.domain,
      eventSource: "verification",
      occurredAt: payment.paidAt,
      eventSummary: summary,
    })

    if (
      shouldReleaseTerminalUnpaidPayment({
        providerStatus: payment.status,
        reconciliationOk: result.ok,
        attemptStatus: result.attemptStatus,
        orderPaymentStatus: result.orderPaymentStatus,
      })
    ) {
      const released = await repository.releasePaymentAttempt(
        payment.reference,
        `paystack_verification_${payment.status}`
      )
      result = {
        ...result,
        replayed: result.replayed && released.replayed,
        attemptStatus: released.attemptStatus,
        orderPaymentStatus: released.orderPaymentStatus,
      }
    }
  }

  const paymentStatus = publicPaymentStatusForReconciliation({
    eventOutcome: result.eventOutcome,
    ok: result.ok,
    orderPaymentStatus: result.orderPaymentStatus,
    providerStatus: payment.status,
  })

  return {
    ok: true as const,
    reference: payment.reference,
    paymentStatus,
    replayed: result.replayed,
    notificationPaymentAttemptId: notificationAttemptId(result),
  }
}

export type PaystackWebhookProcessingResult = {
  notificationPaymentAttemptId?: string
  ignored: boolean
}

export async function processPaystackWebhookEvent(
  event: PaystackWebhookEvent,
  rawBody: string
): Promise<PaystackWebhookProcessingResult> {
  const providerDomain = requireConfiguredDomain()
  if (event.data.domain !== providerDomain) {
    throw new PaymentServiceError("webhook_domain_mismatch")
  }

  const repository = new PaymentRepository()
  if (event.event === "charge.success") {
    const result = await repository.finalizePaystackPayment({
      reference: event.data.reference,
      eventKey: createPaystackEventKey({
        domain: event.data.domain,
        eventType: event.event,
        source: "webhook",
        providerTransactionId: event.data.id,
        reference: event.data.reference,
        providerStatus: event.data.status,
        rawBody,
      }),
      providerTransactionId: event.data.id,
      amountKobo: event.data.amount,
      currency: event.data.currency,
      providerStatus: event.data.status,
      providerDomain: event.data.domain,
      paidAt: event.data.paid_at,
      eventSource: "webhook",
      eventSummary: {
        channel: event.data.channel.slice(0, 120),
        gatewayResponse: event.data.gateway_response?.slice(0, 240) ?? null,
      },
    })

    return {
      ignored: result.eventOutcome === "ignored",
      ...(notificationAttemptId(result)
        ? { notificationPaymentAttemptId: notificationAttemptId(result) }
        : {}),
    }
  }

  if (
    event.event === "charge.dispute.create" ||
    event.event === "charge.dispute.remind" ||
    event.event === "charge.dispute.resolve"
  ) {
    const transaction = event.data.transaction
    const providerStatus = providerStatusForPaystackDisputeEvent(event.event)
    const result = await repository.recordPaystackPaymentStatus({
      reference: transaction.reference,
      eventKey: createPaystackEventKey({
        domain: event.data.domain,
        eventType: event.event,
        source: "webhook",
        providerTransactionId: null,
        reference: transaction.reference,
        providerStatus,
        rawBody,
      }),
      eventType: event.event,
      providerStatus,
      providerTransactionId: transaction.id,
      amountKobo: transaction.amount,
      currency: transaction.currency,
      providerDomain: event.data.domain,
      eventSource: "webhook",
      occurredAt:
        event.data.resolvedAt ??
        event.data.updatedAt ??
        event.data.createdAt ??
        null,
      eventSummary: {
        disputeId: event.data.id,
        disputeStatus: event.data.status,
        resolution: event.data.resolution ?? null,
        category: event.data.category ?? null,
        dueAt: event.data.dueAt ?? null,
        resolvedAt: event.data.resolvedAt ?? null,
      },
    })

    return {
      ignored: result.eventOutcome !== "applied",
      ...(notificationAttemptId(result)
        ? { notificationPaymentAttemptId: notificationAttemptId(result) }
        : {}),
    }
  }

  const parsedRefundEvent = paystackRefundEventSchema.safeParse(event)
  if (!parsedRefundEvent.success) {
    throw new PaymentServiceError("payment_contract")
  }

  const refundEvent = parsedRefundEvent.data
  const refund = refundEvent.data
  const reference = refund.transaction_reference
  const providerStatus =
    refund.status === "needs-attention"
      ? "needs_attention"
      : refund.status
  const result = await repository.recordPaystackPaymentStatus({
    reference,
    eventKey: createPaystackEventKey({
      domain: refund.domain,
      eventType: refundEvent.event,
      source: "webhook",
      providerTransactionId: refund.refund_reference ?? null,
      reference,
      providerStatus,
      rawBody,
    }),
    eventType: refundEvent.event,
    providerStatus,
    providerTransactionId: refund.refund_reference ?? null,
    amountKobo: refund.amount,
    currency: refund.currency,
    providerDomain: refund.domain,
    eventSource: "webhook",
    occurredAt: null,
    eventSummary: {},
  })

  return {
    ignored: result.eventOutcome !== "applied",
    ...(notificationAttemptId(result)
      ? { notificationPaymentAttemptId: notificationAttemptId(result) }
      : {}),
  }
}
