import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { isAdminRequest } from "@/lib/server/admin-auth"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

const productMutationSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  price: z.number().int().min(0),
  imageUrl: z.string().min(1),
  shade: z.string().optional(),
  features: z.array(z.string()).default([]),
  inventoryCount: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isRestocked: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const parsed = productMutationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product payload" }, { status: 400 })
  }

  const { error } = await supabase.from("products").upsert({
    id: parsed.data.id,
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description,
    category: parsed.data.category,
    price: parsed.data.price,
    image_url: parsed.data.imageUrl,
    shade: parsed.data.shade,
    features: parsed.data.features,
    inventory_count: parsed.data.inventoryCount,
    is_active: parsed.data.isActive,
    is_featured: parsed.data.isFeatured,
    is_restocked: parsed.data.isRestocked,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
