import { NextResponse } from "next/server"
import { z } from "zod"
import { writeAdminAuditLog } from "@/lib/server/admin-audit"
import { getCurrentStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const fulfillmentStatuses = ["new", "processing", "shipped", "delivered", "cancelled"] as const
const orderUpdateSchema = z.object({
  reference: z.string().min(1),
  fulfillmentStatus: z.enum(fulfillmentStatuses),
}).strict()
const verifiedPaymentSources = new Set(["webhook", "verification", "reconciliation"])

const allowedTransitions: Record<(typeof fulfillmentStatuses)[number], readonly (typeof fulfillmentStatuses)[number][]> = {
  new: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
}

export async function GET() {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, ["owner", "admin", "support"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = await createSupabaseServerClient()

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

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("fulfillment_status,payment_status,payment_confirmed_at,payment_confirmation_source")
    .eq("reference", parsed.data.reference)
    .maybeSingle()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const isTransition = parsed.data.fulfillmentStatus !== current.fulfillment_status
  const requiresVerifiedPayment =
    isTransition && ["processing", "shipped", "delivered"].includes(parsed.data.fulfillmentStatus)

  if (isTransition) {
    const currentStatus = current.fulfillment_status as keyof typeof allowedTransitions
    if (!allowedTransitions[currentStatus]?.includes(parsed.data.fulfillmentStatus)) {
      return NextResponse.json({ error: `Cannot move an order from ${currentStatus} to ${parsed.data.fulfillmentStatus}` }, { status: 409 })
    }

    const hasVerifiedPayment =
      current.payment_status === "paid" &&
      Boolean(current.payment_confirmed_at) &&
      typeof current.payment_confirmation_source === "string" &&
      verifiedPaymentSources.has(current.payment_confirmation_source)

    if (requiresVerifiedPayment && !hasVerifiedPayment) {
      return NextResponse.json({ error: "Payment must be confirmed before fulfilment can begin" }, { status: 409 })
    }
  }

  let updateQuery = supabase
    .from("orders")
    .update({
      fulfillment_status: parsed.data.fulfillmentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", parsed.data.reference)
    .eq("fulfillment_status", current.fulfillment_status)

  if (requiresVerifiedPayment) {
    updateQuery = updateQuery
      .eq("payment_status", "paid")
      .eq("payment_confirmed_at", current.payment_confirmed_at)
      .eq("payment_confirmation_source", current.payment_confirmation_source)
  }

  const { data: updated, error } = await updateQuery.select("reference").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) {
    return NextResponse.json(
      { error: "Order changed while saving. Refresh and try again." },
      { status: 409 }
    )
  }

  await writeAdminAuditLog({
    staffUserId: staff.id,
    action: "order.status_updated",
    entityType: "order",
    entityId: parsed.data.reference,
    metadata: {
      previousFulfillmentStatus: current.fulfillment_status,
      fulfillmentStatus: parsed.data.fulfillmentStatus,
    },
  })
  return NextResponse.json({ ok: true })
}
