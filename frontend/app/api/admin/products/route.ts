import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/server/admin-audit"
import { getCurrentStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { productMutationSchema } from "@/lib/validation/product"

const productRoles = ["owner", "admin", "inventory"] as const

export async function GET() {
  const staff = await getCurrentStaff()
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data })
}

export async function POST(request: Request) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, productRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = productMutationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const product = parsed.data
  const id = product.id ?? crypto.randomUUID()
  const { data, error } = await supabase.from("products").insert({
    id,
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
  }).select("id").single()

  if (error) {
    const status = error.code === "23505" ? 409 : 500
    return NextResponse.json({ error: status === 409 ? "A product with this slug already exists" : error.message }, { status })
  }

  await writeAdminAuditLog({ staffUserId: staff.id, action: "product.created", entityType: "product", entityId: data.id, metadata: { name: product.name, slug: product.slug } })
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}
