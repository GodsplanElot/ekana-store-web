import { after, NextResponse } from "next/server"
import { paymentReferenceRequestSchema } from "@/lib/server/payments/domain"
import { dispatchPaymentNotificationsBestEffort } from "@/lib/server/payments/notifications"
import {
  getPublicPaymentError,
  verifyAndReconcilePayment,
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
      { error: "Missing or invalid payment reference." },
      { status: 400, headers: noStoreHeaders() }
    )
  }

  const parsed = paymentReferenceRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid payment reference." },
      { status: 400, headers: noStoreHeaders() }
    )
  }

  try {
    const result = await verifyAndReconcilePayment(parsed.data.reference)
    const { notificationPaymentAttemptId, ...publicResult } = result
    if (notificationPaymentAttemptId) {
      after(() =>
        dispatchPaymentNotificationsBestEffort(notificationPaymentAttemptId)
      )
    }
    return NextResponse.json(publicResult, { headers: noStoreHeaders() })
  } catch (error) {
    const details = getPublicPaymentError(error)
    return NextResponse.json(
      { error: details.message, retryable: details.retryable },
      {
        status: details.status,
        headers: noStoreHeaders(details.retryable),
      }
    )
  }
}
