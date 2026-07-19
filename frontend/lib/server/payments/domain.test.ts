import assert from "node:assert/strict"
import test from "node:test"
import {
  CheckoutInputError,
  checkoutRequestSchema,
  classifyPaystackInitializationFailure,
  classifyCheckoutReplay,
  createPaymentReference,
  createPaystackEventKey,
  deliveryFeeForSubtotal,
  inspectPaystackWebhookEnvelope,
  isAllowedPaystackCallbackUrl,
  isMatchingPaystackRefundEventStatus,
  normalizeCheckoutItems,
  paymentReferenceSchema,
  publicPaymentStatusForProviderStatus,
  publicPaymentStatusForReconciliation,
  providerStatusForPaystackDisputeEvent,
  shouldReleaseTerminalUnpaidPayment,
} from "./domain"

test("payment references are deterministic, Paystack-safe, and key-specific", () => {
  const first = createPaymentReference("05650426-a4c2-45be-b49f-b16fb0edab24")
  const replay = createPaymentReference("05650426-a4c2-45be-b49f-b16fb0edab24")
  const other = createPaymentReference("4fe5a38e-44f5-4626-b248-303d0cf6490d")

  assert.equal(first, replay)
  assert.notEqual(first, other)
  assert.match(first, /^ekana-[a-f0-9]{40}$/)
  assert.equal(paymentReferenceSchema.safeParse("legacy_order_123").success, true)
})

test("checkout requires the total quoted to the shopper", () => {
  const request = {
    customer: {
      firstName: "Ada",
      lastName: "Okafor",
      email: "ada@example.com",
      phone: "+2348000000000",
      address: "1 Ekana Close",
      city: "Lagos",
    },
    quotedTotal: 12_500,
    items: [{ productId: "serum", quantity: 1 }],
  }

  assert.equal(checkoutRequestSchema.safeParse(request).success, true)
  assert.equal(
    checkoutRequestSchema.safeParse({
      customer: request.customer,
      items: request.items,
    }).success,
    false
  )
  assert.equal(
    checkoutRequestSchema.safeParse({ ...request, quotedTotal: 0 }).success,
    false
  )
  assert.equal(
    checkoutRequestSchema.safeParse({ ...request, quotedTotal: 12_500.5 })
      .success,
    false
  )
})

test("callback URLs require HTTPS except test-mode loopback hosts", () => {
  assert.equal(
    isAllowedPaystackCallbackUrl("https://shop.example.com/checkout", "live"),
    true
  )
  assert.equal(
    isAllowedPaystackCallbackUrl("http://localhost:3000/checkout", "test"),
    true
  )
  assert.equal(
    isAllowedPaystackCallbackUrl("http://127.0.0.1:3000/checkout", "test"),
    true
  )
  assert.equal(
    isAllowedPaystackCallbackUrl("http://[::1]:3000/checkout", "test"),
    true
  )
  assert.equal(
    isAllowedPaystackCallbackUrl("http://shop.example.com/checkout", "test"),
    false
  )
  assert.equal(
    isAllowedPaystackCallbackUrl("http://localhost:3000/checkout", "live"),
    false
  )
})

test("reversed payments release only after the exact safe reconciliation state", () => {
  assert.equal(
    shouldReleaseTerminalUnpaidPayment({
      providerStatus: "reversed",
      reconciliationOk: true,
      attemptStatus: "cancelled",
      orderPaymentStatus: "reversed",
    }),
    true
  )
  assert.equal(
    shouldReleaseTerminalUnpaidPayment({
      providerStatus: "reversed",
      reconciliationOk: true,
      attemptStatus: "review",
      orderPaymentStatus: "reversed",
    }),
    false
  )
  assert.equal(
    shouldReleaseTerminalUnpaidPayment({
      providerStatus: "failed",
      reconciliationOk: true,
      attemptStatus: "failed",
      orderPaymentStatus: "failed",
    }),
    true
  )
})

test("duplicate cart lines are canonicalized and capped after aggregation", () => {
  assert.deepEqual(
    normalizeCheckoutItems([
      { productId: "serum", quantity: 2 },
      { productId: "cleanser", quantity: 1 },
      { productId: "serum", quantity: 3 },
    ]),
    [
      { productId: "cleanser", quantity: 1 },
      { productId: "serum", quantity: 5 },
    ]
  )

  assert.throws(
    () =>
      normalizeCheckoutItems([
        { productId: "serum", quantity: 20 },
        { productId: "serum", quantity: 1 },
      ]),
    CheckoutInputError
  )
})

test("delivery fee applies around the trusted subtotal threshold", () => {
  assert.equal(deliveryFeeForSubtotal(19_999), 2_500)
  assert.equal(deliveryFeeForSubtotal(20_000), 0)
})

test("signed webhook envelope inspection distinguishes unsupported from malformed", () => {
  assert.deepEqual(
    inspectPaystackWebhookEnvelope('{"event":"transfer.success","data":{}}'),
    { kind: "unsupported", event: "transfer.success" }
  )
  assert.deepEqual(
    inspectPaystackWebhookEnvelope('{"event":"charge.success","data":{}}'),
    { kind: "supported", event: "charge.success" }
  )
  assert.deepEqual(
    inspectPaystackWebhookEnvelope(
      '{"event":"charge.dispute.create","data":{}}'
    ),
    { kind: "supported", event: "charge.dispute.create" }
  )
  assert.deepEqual(inspectPaystackWebhookEnvelope("not-json"), {
    kind: "malformed",
  })
})

test("refund event names must agree with the embedded refund status", () => {
  assert.equal(
    isMatchingPaystackRefundEventStatus("refund.processed", "processed"),
    true
  )
  assert.equal(
    isMatchingPaystackRefundEventStatus("refund.processed", "failed"),
    false
  )
  assert.equal(
    isMatchingPaystackRefundEventStatus(
      "refund.needs-attention",
      "needs-attention"
    ),
    true
  )
})

test("event keys prefer stable provider identities and hash body as a fallback", () => {
  const base = {
    domain: "test" as const,
    eventType: "charge.success",
    source: "webhook" as const,
    reference: "ekana-123",
    providerStatus: "success",
    providerTransactionId: "991",
  }

  assert.equal(createPaystackEventKey(base), createPaystackEventKey(base))
  assert.equal(
    createPaystackEventKey({ ...base, rawBody: '{"amount":100}' }),
    createPaystackEventKey({ ...base, rawBody: '{"amount":200}' })
  )
  assert.notEqual(
    createPaystackEventKey({
      ...base,
      providerTransactionId: null,
      rawBody: '{"amount":100}',
    }),
    createPaystackEventKey({
      ...base,
      providerTransactionId: null,
      rawBody: '{"amount":200}',
    })
  )
})

test("provider statuses map to deliberately narrow public states", () => {
  assert.equal(publicPaymentStatusForProviderStatus("success"), "paid")
  assert.equal(publicPaymentStatusForProviderStatus("ongoing"), "processing")
  assert.equal(publicPaymentStatusForProviderStatus("failed"), "failed")
  assert.equal(
    publicPaymentStatusForProviderStatus("reversal_pending"),
    "processing"
  )
  assert.equal(publicPaymentStatusForProviderStatus("mystery"), "review")
})

test("initialization failures release only after deterministic rejection", () => {
  assert.equal(
    classifyPaystackInitializationFailure({ code: "configuration" }),
    "deterministic"
  )
  assert.equal(
    classifyPaystackInitializationFailure({
      code: "provider_rejected",
      providerStatus: 400,
      providerMessage: "The amount is invalid.",
    }),
    "deterministic"
  )

  for (const failure of [
    { code: "network" },
    { code: "timeout" },
    { code: "invalid_response", providerStatus: 200 },
    { code: "provider_rejected", providerStatus: 429 },
    { code: "provider_rejected", providerStatus: 503 },
    {
      code: "provider_rejected",
      providerStatus: 400,
      providerMessage: "Duplicate reference. Kindly enter a unique reference.",
    },
  ]) {
    assert.equal(
      classifyPaystackInitializationFailure(failure),
      "indeterminate"
    )
  }
})

test("dispute events map to sticky review provider markers", () => {
  assert.equal(
    providerStatusForPaystackDisputeEvent("charge.dispute.create"),
    "dispute_opened"
  )
  assert.equal(
    providerStatusForPaystackDisputeEvent("charge.dispute.remind"),
    "dispute_reminder"
  )
  assert.equal(
    providerStatusForPaystackDisputeEvent("charge.dispute.resolve"),
    "dispute_resolved"
  )
})

test("checkout replays use active URLs but never terminal transaction URLs", () => {
  assert.deepEqual(
    classifyCheckoutReplay({
      authorizationUrl: "https://checkout.paystack.com/existing",
      attemptStatus: "initialized",
      paymentStatus: "pending",
    }),
    {
      kind: "return_existing",
      authorizationUrl: "https://checkout.paystack.com/existing",
    }
  )
  assert.deepEqual(
    classifyCheckoutReplay({
      authorizationUrl: "https://checkout.paystack.com/failed",
      attemptStatus: "failed",
      paymentStatus: "failed",
    }),
    { kind: "fresh_attempt" }
  )
  assert.deepEqual(
    classifyCheckoutReplay({
      authorizationUrl: "https://checkout.paystack.com/paid",
      attemptStatus: "succeeded",
      paymentStatus: "paid",
    }),
    { kind: "return_status", paymentStatus: "paid" }
  )
  assert.deepEqual(
    classifyCheckoutReplay({
      authorizationUrl: "https://checkout.paystack.com/review",
      attemptStatus: "review",
      paymentStatus: "review",
    }),
    { kind: "return_status", paymentStatus: "review" }
  )
})

test("rejected reconciliation is always surfaced as review", () => {
  assert.equal(
    publicPaymentStatusForReconciliation({
      eventOutcome: "rejected",
      ok: false,
      orderPaymentStatus: "pending",
      providerStatus: "pending",
    }),
    "review"
  )
})
