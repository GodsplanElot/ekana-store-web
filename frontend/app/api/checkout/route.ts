import { NextResponse } from "next/server"
import { getConfiguredAppOrigin } from "@/lib/server/app-url"
import {
  checkoutIdempotencyKeySchema,
  checkoutRequestSchema,
  CheckoutInputError,
} from "@/lib/server/payments/domain"
import {
  createCheckoutPayment,
  getPublicPaymentError,
} from "@/lib/server/payments/service"

export const runtime = "nodejs"

function noStoreHeaders(retryable = false) {
  return {
    "Cache-Control": "no-store",
    ...(retryable ? { "Retry-After": "3" } : {}),
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid checkout details." },
      { status: 400, headers: noStoreHeaders() }
    )
  }

  const parsedBody = checkoutRequestSchema.safeParse(body)
  const parsedIdempotencyKey = checkoutIdempotencyKeySchema.safeParse(
    request.headers.get("idempotency-key")
  )
  if (!parsedBody.success || !parsedIdempotencyKey.success) {
    return NextResponse.json(
      {
        error: parsedBody.success
          ? "A valid checkout idempotency key is required."
          : "Invalid checkout details.",
      },
      { status: 400, headers: noStoreHeaders() }
    )
  }

  const appOrigin = getConfiguredAppOrigin()
  if (!appOrigin) {
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable.", retryable: true },
      { status: 503, headers: noStoreHeaders(true) }
    )
  }

  try {
    const result = await createCheckoutPayment(
      parsedBody.data,
      parsedIdempotencyKey.data,
      appOrigin
    )
    return NextResponse.json(result, { headers: noStoreHeaders() })
  } catch (error) {
    if (error instanceof CheckoutInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: noStoreHeaders() }
      )
    }

    const details = getPublicPaymentError(error)
    return NextResponse.json(
      {
        error: details.message,
        retryable: details.retryable,
        ...(details.retryDisposition
          ? { retryDisposition: details.retryDisposition }
          : {}),
      },
      {
        status: details.status,
        headers: noStoreHeaders(details.retryable),
      }
    )
  }
}
