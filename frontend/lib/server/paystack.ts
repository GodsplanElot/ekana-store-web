import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { getOptionalEnv } from "@/lib/server/env"
import {
  isMatchingPaystackRefundEventStatus,
  isPaystackReferenceConflictMessage,
} from "@/lib/server/payments/domain"

const PAYSTACK_API_BASE_URL = "https://api.paystack.co"

export const PAYSTACK_REQUEST_TIMEOUT_MS = 15_000
export const PAYSTACK_REFERENCE_MAX_LENGTH = 100

export const paystackReferenceSchema = z
  .string()
  .min(1)
  .max(PAYSTACK_REFERENCE_MAX_LENGTH)
  .regex(/^[A-Za-z0-9._=-]+$/)

const paystackDomainSchema = z.enum(["test", "live"])
const paystackCurrencySchema = z.string().regex(/^[A-Z]{3}$/)
const paystackTransactionStatusSchema = z.enum([
  "abandoned",
  "failed",
  "ongoing",
  "pending",
  "processing",
  "queued",
  "reversal pending",
  "reversal_pending",
  "reversed",
  "success",
]).transform((status) =>
  status === "reversal pending" || status === "reversal_pending"
    ? ("reversal_pending" as const)
    : status
)

const positiveSubunitAmountSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)

const providerSubunitAmountSchema = z
  .union([
    positiveSubunitAmountSchema,
    z.string().regex(/^[1-9]\d*$/),
  ])
  .transform((amount) =>
    typeof amount === "number" ? amount : Number(amount)
  )
  .refine(Number.isSafeInteger)

const paystackTransactionIdSchema = z
  .union([
    z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    z.string().regex(/^\d+$/),
  ])
  .transform(String)

const paystackTimestampSchema = z.string().datetime({ offset: true })

type JsonPrimitive = boolean | number | string | null
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
)

const callbackUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === "https:" || protocol === "http:"
  })

const authorizationUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === "checkout.paystack.com"
  })

const initializePaystackPaymentInputSchema = z
  .object({
    email: z.string().email().max(254),
    amount: positiveSubunitAmountSchema,
    reference: paystackReferenceSchema,
    callbackUrl: callbackUrlSchema,
    metadata: z.record(jsonValueSchema),
    currency: paystackCurrencySchema.optional().default("NGN"),
  })
  .strict()

export const paystackInitializeResponseSchema = z
  .object({
    status: z.literal(true),
    message: z.string(),
    data: z
      .object({
        authorization_url: authorizationUrlSchema,
        access_code: z.string().min(1).max(255),
        reference: paystackReferenceSchema,
      })
      .strict(),
  })
  .strict()

const paystackCustomerSchema = z
  .object({
    email: z.string().email().nullable().optional(),
  })
  .nullable()
  .optional()

const paystackVerifyDataSchema = z.object({
  id: paystackTransactionIdSchema,
  status: paystackTransactionStatusSchema,
  reference: paystackReferenceSchema,
  amount: positiveSubunitAmountSchema,
  currency: paystackCurrencySchema,
  domain: paystackDomainSchema,
  channel: z.string().min(1).nullable(),
  paid_at: paystackTimestampSchema.nullable(),
  gateway_response: z.string().nullable(),
  customer: paystackCustomerSchema,
})

export const paystackVerifyResponseSchema = z
  .object({
    status: z.literal(true),
    message: z.string(),
    data: paystackVerifyDataSchema,
  })
  .strict()

const paystackChargeSuccessDataSchema = z.object({
  id: paystackTransactionIdSchema,
  status: z.literal("success"),
  reference: paystackReferenceSchema,
  amount: positiveSubunitAmountSchema,
  currency: paystackCurrencySchema,
  domain: paystackDomainSchema,
  channel: z.string().min(1),
  paid_at: paystackTimestampSchema,
  gateway_response: z.string().nullable(),
  customer: paystackCustomerSchema,
})

export const paystackChargeSuccessEventSchema = z
  .object({
    event: z.literal("charge.success"),
    data: paystackChargeSuccessDataSchema,
  })
  .strict()

const refundStatusSchema = z.enum([
  "pending",
  "processing",
  "processed",
  "failed",
  "needs-attention",
])

const paystackRefundDataSchema = z.object({
  status: refundStatusSchema,
  transaction_reference: paystackReferenceSchema,
  refund_reference: z.string().min(1).max(255).nullable().optional(),
  amount: providerSubunitAmountSchema,
  currency: paystackCurrencySchema,
  domain: paystackDomainSchema,
})

export const paystackRefundEventSchema = z
  .object({
    event: z.enum([
      "refund.pending",
      "refund.processing",
      "refund.processed",
      "refund.failed",
      "refund.needs-attention",
    ]),
    data: paystackRefundDataSchema,
  })
  .superRefine((event, context) => {
    if (!isMatchingPaystackRefundEventStatus(event.event, event.data.status)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Refund event and status must match.",
        path: ["data", "status"],
      })
    }
  })

const boundedProviderTextSchema = z.string().trim().min(1).max(500)
const nullableProviderTextSchema = boundedProviderTextSchema.nullable().optional()

const paystackDisputeTransactionSchema = z
  .object({
    id: paystackTransactionIdSchema,
    reference: paystackReferenceSchema,
    amount: providerSubunitAmountSchema,
    currency: paystackCurrencySchema,
    domain: paystackDomainSchema,
  })
  .passthrough()

const paystackDisputeDataSchema = z
  .object({
    id: paystackTransactionIdSchema,
    domain: paystackDomainSchema,
    status: boundedProviderTextSchema,
    resolution: nullableProviderTextSchema,
    category: nullableProviderTextSchema,
    dueAt: paystackTimestampSchema.nullable().optional(),
    resolvedAt: paystackTimestampSchema.nullable().optional(),
    createdAt: paystackTimestampSchema.nullable().optional(),
    updatedAt: paystackTimestampSchema.nullable().optional(),
    transaction: paystackDisputeTransactionSchema,
  })
  .passthrough()
  .superRefine((data, context) => {
    if (data.transaction.domain !== data.domain) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dispute and transaction domains must match.",
        path: ["transaction", "domain"],
      })
    }
  })

const paystackDisputeCreateEventSchema = z
  .object({
    event: z.literal("charge.dispute.create"),
    data: paystackDisputeDataSchema,
  })
  .strict()

const paystackDisputeRemindEventSchema = z
  .object({
    event: z.literal("charge.dispute.remind"),
    data: paystackDisputeDataSchema,
  })
  .strict()

const paystackDisputeResolveEventSchema = z
  .object({
    event: z.literal("charge.dispute.resolve"),
    data: paystackDisputeDataSchema,
  })
  .strict()

export const paystackWebhookEventSchema = z.union([
  paystackChargeSuccessEventSchema,
  paystackRefundEventSchema,
  paystackDisputeCreateEventSchema,
  paystackDisputeRemindEventSchema,
  paystackDisputeResolveEventSchema,
])

const paystackResponseEnvelopeSchema = z
  .object({
    status: z.boolean(),
    message: z.string(),
  })
  .passthrough()

export type PaystackDomain = z.infer<typeof paystackDomainSchema>
export type PaystackTransactionStatus = z.infer<
  typeof paystackTransactionStatusSchema
>
export type PaystackWebhookEvent = z.infer<
  typeof paystackWebhookEventSchema
>

export interface InitializePaystackPaymentInput {
  email: string
  amount: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
  currency?: string
}

export interface PaystackInitializedPayment {
  authorizationUrl: string
  accessCode: string
  reference: string
}

export interface PaystackVerifiedPayment {
  status: PaystackTransactionStatus
  reference: string
  amount: number
  currency: string
  domain: PaystackDomain
  providerTransactionId: string
  channel: string | null
  paidAt: string | null
  gatewayResponse: string | null
  customerEmail?: string
}

export type PaystackErrorCode =
  | "configuration"
  | "invalid_input"
  | "timeout"
  | "network"
  | "provider_rejected"
  | "invalid_response"
  | "domain_mismatch"
  | "invalid_webhook"

const PAYSTACK_ERROR_MESSAGES: Record<PaystackErrorCode, string> = {
  configuration: "Paystack is not configured.",
  invalid_input: "The Paystack request is invalid.",
  timeout: "The Paystack request timed out.",
  network: "Paystack is temporarily unavailable.",
  provider_rejected: "Paystack rejected the request.",
  invalid_response: "Paystack returned an invalid response.",
  domain_mismatch: "Paystack returned a response from the wrong environment.",
  invalid_webhook: "The Paystack webhook payload is invalid.",
}

export class PaystackError extends Error {
  readonly code: PaystackErrorCode
  readonly retryable: boolean
  readonly providerStatus?: number
  readonly providerMessage?: string

  constructor(
    code: PaystackErrorCode,
    providerStatus?: number,
    providerMessage?: string
  ) {
    super(PAYSTACK_ERROR_MESSAGES[code])
    this.name = "PaystackError"
    this.code = code
    this.retryable =
      code === "timeout" ||
      code === "network" ||
      code === "invalid_response" ||
      (code === "provider_rejected" &&
        (providerStatus === undefined ||
          providerStatus < 400 ||
          providerStatus >= 500 ||
          providerStatus === 408 ||
          providerStatus === 425 ||
          providerStatus === 429 ||
          isPaystackReferenceConflictMessage(providerMessage)))
    this.providerStatus = providerStatus
    this.providerMessage = providerMessage
  }
}

interface PaystackCredentials {
  secretKey: string
  domain: PaystackDomain
}

export function inferPaystackDomainFromSecretKey(
  secretKey: string
): PaystackDomain | undefined {
  if (/^sk_test_.+$/u.test(secretKey)) return "test"
  if (/^sk_live_.+$/u.test(secretKey)) return "live"
  return undefined
}

function readPaystackCredentials(): PaystackCredentials | undefined {
  const configuredKey = getOptionalEnv("PAYSTACK_SECRET_KEY")?.trim()
  if (!configuredKey) return undefined

  const domain = inferPaystackDomainFromSecretKey(configuredKey)
  if (!domain) return undefined

  return { secretKey: configuredKey, domain }
}

function requirePaystackCredentials(): PaystackCredentials {
  const credentials = readPaystackCredentials()
  if (!credentials) throw new PaystackError("configuration")
  return credentials
}

export function isPaystackConfigured() {
  return Boolean(readPaystackCredentials())
}

export function getConfiguredPaystackDomain(): PaystackDomain | undefined {
  return readPaystackCredentials()?.domain
}

async function requestPaystack<TSchema extends z.ZodTypeAny>(
  path: string,
  init: RequestInit,
  schema: TSchema
): Promise<z.output<TSchema>> {
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, PAYSTACK_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${PAYSTACK_API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    })

    let payload: unknown
    try {
      payload = JSON.parse(await response.text())
    } catch {
      throw new PaystackError("invalid_response", response.status)
    }

    const envelope = paystackResponseEnvelopeSchema.safeParse(payload)
    if (!response.ok) {
      if (!envelope.success) {
        throw new PaystackError("invalid_response", response.status)
      }
      throw new PaystackError(
        "provider_rejected",
        response.status,
        envelope.data.message
      )
    }

    if (!envelope.success) {
      throw new PaystackError("invalid_response", response.status)
    }
    if (!envelope.data.status) {
      throw new PaystackError(
        "provider_rejected",
        response.status,
        envelope.data.message
      )
    }

    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      throw new PaystackError("invalid_response", response.status)
    }

    return parsed.data
  } catch (error) {
    if (error instanceof PaystackError) throw error
    if (timedOut || controller.signal.aborted) {
      throw new PaystackError("timeout")
    }
    throw new PaystackError("network")
  } finally {
    clearTimeout(timeout)
  }
}

export async function initializePaystackPayment(
  input: InitializePaystackPaymentInput
): Promise<PaystackInitializedPayment> {
  const parsedInput = initializePaystackPaymentInputSchema.safeParse(input)
  if (!parsedInput.success) throw new PaystackError("invalid_input")

  const { secretKey } = requirePaystackCredentials()
  const payload = await requestPaystack(
    "/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: parsedInput.data.email,
        amount: String(parsedInput.data.amount),
        currency: parsedInput.data.currency,
        reference: parsedInput.data.reference,
        callback_url: parsedInput.data.callbackUrl,
        metadata: parsedInput.data.metadata,
      }),
    },
    paystackInitializeResponseSchema
  )

  if (payload.data.reference !== parsedInput.data.reference) {
    throw new PaystackError("invalid_response")
  }

  return {
    authorizationUrl: payload.data.authorization_url,
    accessCode: payload.data.access_code,
    reference: payload.data.reference,
  }
}

export async function verifyPaystackPayment(
  reference: string
): Promise<PaystackVerifiedPayment> {
  const parsedReference = paystackReferenceSchema.safeParse(reference)
  if (!parsedReference.success) throw new PaystackError("invalid_input")

  const { domain: expectedDomain, secretKey } = requirePaystackCredentials()
  const payload = await requestPaystack(
    `/transaction/verify/${encodeURIComponent(parsedReference.data)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
    paystackVerifyResponseSchema
  )

  if (payload.data.reference !== parsedReference.data) {
    throw new PaystackError("invalid_response")
  }
  if (payload.data.domain !== expectedDomain) {
    throw new PaystackError("domain_mismatch")
  }

  const customerEmail = payload.data.customer?.email ?? undefined

  return {
    status: payload.data.status,
    reference: payload.data.reference,
    amount: payload.data.amount,
    currency: payload.data.currency,
    domain: payload.data.domain,
    providerTransactionId: payload.data.id,
    channel: payload.data.channel,
    paidAt: payload.data.paid_at,
    gatewayResponse: payload.data.gateway_response,
    ...(customerEmail ? { customerEmail } : {}),
  }
}

export function validatePaystackWebhookSignature(
  rawBody: string | Uint8Array,
  signature: string | null | undefined,
  secretKeyOverride?: string
): boolean {
  if (!signature || !/^[0-9a-fA-F]{128}$/u.test(signature)) return false

  const secretKey = secretKeyOverride ?? readPaystackCredentials()?.secretKey
  if (!secretKey) return false

  const expectedSignature = createHmac("sha512", secretKey)
    .update(rawBody)
    .digest()
  const receivedSignature = Buffer.from(signature, "hex")

  if (receivedSignature.length !== expectedSignature.length) return false
  return timingSafeEqual(expectedSignature, receivedSignature)
}

export function parsePaystackWebhookEvent(
  rawBody: string
): PaystackWebhookEvent {
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw new PaystackError("invalid_webhook")
  }

  const parsed = paystackWebhookEventSchema.safeParse(payload)
  if (!parsed.success) throw new PaystackError("invalid_webhook")
  return parsed.data
}
