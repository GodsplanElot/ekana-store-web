import { NextResponse } from "next/server"
import { getCurrentStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { productMutationSchema } from "@/lib/validation/product"

const productRoles = ["owner", "admin", "inventory"] as const

type ProductRouteProps = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: ProductRouteProps) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, productRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = productMutationSchema.omit({ id: true }).safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const product = parsed.data
  const { error } = await supabase.from("products").update({
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    image_url: product.imageUrl,
    shade: product.shade || null,
    features: product.features,
    inventory_count: product.inventoryCount,
    is_active: product.isActive,
    is_featured: product.isFeatured,
    is_restocked: product.isRestocked,
    updated_at: new Date().toISOString(),
  }).eq("id", id)

  if (error) {
    const status = error.code === "23505" ? 409 : 500
    return NextResponse.json({ error: status === 409 ? "A product with this slug already exists" : error.message }, { status })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: ProductRouteProps) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, productRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const { error } = await supabase.from("products").update({
    is_active: false,
    updated_at: new Date().toISOString(),
  }).eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
