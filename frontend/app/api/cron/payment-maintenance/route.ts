import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { getOptionalEnv } from "@/lib/server/env"
import { dispatchDuePaymentNotifications } from "@/lib/server/payments/notifications"
import { PaymentRepository } from "@/lib/server/payments/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const responseHeaders = { "Cache-Control": "no-store" }

function hasValidCronAuthorization(request: Request): boolean {
  const secret = getOptionalEnv("CRON_SECRET")
  const authorization = request.headers.get("authorization")
  if (!secret || secret.length < 32 || !authorization) return false

  const expected = Buffer.from(`Bearer ${secret}`, "utf8")
  const received = Buffer.from(authorization, "utf8")
  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  )
}

export async function GET(request: Request) {
  if (!hasValidCronAuthorization(request)) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401, headers: responseHeaders }
    )
  }

  try {
    const repository = new PaymentRepository()
    const released = await repository.releaseExpiredPaymentReservations(1_000)
    const notificationAttempts = await dispatchDuePaymentNotifications(20)

    return NextResponse.json(
      {
        ok: true,
        releasedAttempts: released.releasedAttempts,
        notificationAttempts,
      },
      { headers: responseHeaders }
    )
  } catch {
    return NextResponse.json(
      { error: "Payment maintenance is temporarily unavailable." },
      { status: 500, headers: responseHeaders }
    )
  }
}
