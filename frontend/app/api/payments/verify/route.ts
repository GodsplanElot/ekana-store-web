import { NextResponse } from "next/server"
import { z } from "zod"
import { verifyPaystackPayment } from "@/lib/server/paystack"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

const verifySchema = z.object({
  reference: z.string().min(1),
})

export async function POST(request: Request) {
  const parsed = verifySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing payment reference." }, { status: 400 })
  }

  const payment = await verifyPaystackPayment(parsed.data.reference)
  const paymentStatus = payment.status === "success" ? "paid" : payment.status

  const supabase = createSupabaseAdmin()
  if (supabase) {
    await supabase
      .from("orders")
      .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
      .eq("reference", parsed.data.reference)
  }

  return NextResponse.json({ ok: true, paymentStatus, payment })
}
