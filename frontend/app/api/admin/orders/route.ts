import { NextResponse } from "next/server"
import { z } from "zod"
import { writeAdminAuditLog } from "@/lib/server/admin-audit"
import { getCurrentStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

const paymentStatuses = ["pending", "paid", "failed", "refunded"] as const
const fulfillmentStatuses = ["new", "processing", "shipped", "delivered", "cancelled"] as const
const orderUpdateSchema = z.object({
  reference: z.string().min(1),
  paymentStatus: z.enum(paymentStatuses).optional(),
  fulfillmentStatus: z.enum(fulfillmentStatuses).optional(),
}).refine((value) => value.paymentStatus || value.fulfillmentStatus, "No status update supplied")

const allowedTransitions: Record<(typeof fulfillmentStatuses)[number], readonly (typeof fulfillmentStatuses)[number][]> = {
  new: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
}

export async function GET() {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, ["owner", "admin", "support"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}

export async function PATCH(request: Request) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, ["owner", "admin", "support"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = orderUpdateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid order update" }, { status: 400 })
  if (parsed.data.paymentStatus && !staffHasRole(staff, ["owner", "admin"])) {
    return NextResponse.json({ error: "Your role cannot change payment status" }, { status: 403 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const { data: current, error: readError } = await supabase.from("orders").select("fulfillment_status").eq("reference", parsed.data.reference).maybeSingle()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  if (parsed.data.fulfillmentStatus && parsed.data.fulfillmentStatus !== current.fulfillment_status) {
    const currentStatus = current.fulfillment_status as keyof typeof allowedTransitions
    if (!allowedTransitions[currentStatus]?.includes(parsed.data.fulfillmentStatus)) {
      return NextResponse.json({ error: `Cannot move an order from ${currentStatus} to ${parsed.data.fulfillmentStatus}` }, { status: 409 })
    }
  }

  const update: Record<string, string> = { updated_at: new Date().toISOString() }
  if (parsed.data.paymentStatus) update.payment_status = parsed.data.paymentStatus
  if (parsed.data.fulfillmentStatus) update.fulfillment_status = parsed.data.fulfillmentStatus

  const { error } = await supabase.from("orders").update(update).eq("reference", parsed.data.reference)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAdminAuditLog({ staffUserId: staff.id, action: "order.status_updated", entityType: "order", entityId: parsed.data.reference, metadata: { paymentStatus: parsed.data.paymentStatus, fulfillmentStatus: parsed.data.fulfillmentStatus } })
  return NextResponse.json({ ok: true })
}
