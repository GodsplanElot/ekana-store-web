import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { isAdminRequest } from "@/lib/server/admin-auth"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

const orderUpdateSchema = z.object({
  reference: z.string().min(1),
  paymentStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
})

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders: data })
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const parsed = orderUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order update payload" }, { status: 400 })
  }

  const update: Record<string, string> = {
    updated_at: new Date().toISOString(),
  }

  if (parsed.data.paymentStatus) {
    update.payment_status = parsed.data.paymentStatus
  }

  if (parsed.data.fulfillmentStatus) {
    update.fulfillment_status = parsed.data.fulfillmentStatus
  }

  const { error } = await supabase
    .from("orders")
    .update(update)
    .eq("reference", parsed.data.reference)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
