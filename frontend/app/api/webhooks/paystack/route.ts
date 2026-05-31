import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { getOptionalEnv } from "@/lib/server/env"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

function isValidSignature(rawBody: string, signature: string | null) {
  const secret = getOptionalEnv("PAYSTACK_SECRET_KEY")
  if (!secret || !signature) return false

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex")
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-paystack-signature")

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as {
    event: string
    data?: { reference?: string; status?: string }
  }

  if (event.event === "charge.success" && event.data?.reference) {
    const supabase = createSupabaseAdmin()
    if (supabase) {
      await supabase
        .from("orders")
        .update({ payment_status: "paid", updated_at: new Date().toISOString() })
        .eq("reference", event.data.reference)
    }
  }

  return NextResponse.json({ received: true })
}
