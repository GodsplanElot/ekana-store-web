import { after, NextResponse } from "next/server"
import {
  isPaystackConfigured,
  parsePaystackWebhookEvent,
  validatePaystackWebhookSignature,
} from "@/lib/server/paystack"
import { inspectPaystackWebhookEnvelope } from "@/lib/server/payments/domain"
import { dispatchPaymentNotificationsBestEffort } from "@/lib/server/payments/notifications"
import {
  getPublicPaymentError,
  processPaystackWebhookEvent,
} from "@/lib/server/payments/service"

export const runtime = "nodejs"

const MAX_WEBHOOK_BYTES = 1_000_000
const responseHeaders = { "Cache-Control": "no-store" }

export async function POST(request: Request) {
  if (!isPaystackConfigured()) {
    return NextResponse.json(
      { error: "Webhook processing is temporarily unavailable." },
      { status: 503, headers: responseHeaders }
    )
  }

  const contentLength = request.headers.get("content-length")
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_WEBHOOK_BYTES
  ) {
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413, headers: responseHeaders }
    )
  }

  let bodyBytes: Uint8Array
  try {
    bodyBytes = new Uint8Array(await request.arrayBuffer())
  } catch {
    return NextResponse.json(
      { error: "Webhook payload could not be read." },
      { status: 400, headers: responseHeaders }
    )
  }
  if (bodyBytes.byteLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json(
      { error: "Webhook payload is too large." },
      { status: 413, headers: responseHeaders }
    )
  }

  const signature = request.headers.get("x-paystack-signature")
  if (!validatePaystackWebhookSignature(bodyBytes, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401, headers: responseHeaders }
    )
  }

  let rawBody: string
  try {
    rawBody = new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes)
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400, headers: responseHeaders }
    )
  }

  const envelope = inspectPaystackWebhookEnvelope(rawBody)
  if (envelope.kind === "unsupported") {
    return NextResponse.json(
      { received: true, ignored: true },
      { headers: responseHeaders }
    )
  }
  if (envelope.kind === "malformed") {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400, headers: responseHeaders }
    )
  }

  let event
  try {
    event = parsePaystackWebhookEvent(rawBody)
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400, headers: responseHeaders }
    )
  }

  try {
    const result = await processPaystackWebhookEvent(event, rawBody)
    if (result.notificationPaymentAttemptId) {
      after(() =>
        dispatchPaymentNotificationsBestEffort(
          result.notificationPaymentAttemptId as string
        )
      )
    }
    return NextResponse.json(
      { received: true, ignored: result.ignored },
      { headers: responseHeaders }
    )
  } catch (error) {
    const details = getPublicPaymentError(error)
    const status =
      details.source === "storage" || details.source === "internal"
        ? 500
        : details.status
    return NextResponse.json(
      { error: details.message },
      { status, headers: responseHeaders }
    )
  }
}
