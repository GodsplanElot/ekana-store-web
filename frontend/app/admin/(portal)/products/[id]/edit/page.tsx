import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ProductForm } from "@/components/admin/product-form"
import { requireStaff } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import type { ProductMutation } from "@/lib/validation/product"

type EditProductPageProps = { params: Promise<{ id: string }> }

type ProductRow = {
  id: string
  slug: string
  name: string
  description: string
  category: ProductMutation["category"]
  price: number
  image_url: string
  shade: string | null
  features: string[] | null
  inventory_count: number
  is_active: boolean
  is_featured: boolean
  is_restocked: boolean
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  await requireStaff(["owner", "admin", "inventory"])
  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) notFound()

  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle()
  if (!data) notFound()
  const row = data as ProductRow
  const product: ProductMutation & { id: string } = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price,
    imageUrl: row.image_url,
    shade: row.shade ?? undefined,
    features: row.features ?? [],
    inventoryCount: row.inventory_count,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    isRestocked: row.is_restocked,
  }

  return <section className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12"><div className="mx-auto max-w-6xl"><Link className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950" href="/admin/products"><ArrowLeft className="size-4" />Back to products</Link><div className="mb-8 mt-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Catalogue</p><h1 className="mt-3 font-serif text-4xl">Edit {row.name}</h1></div><ProductForm initialProduct={product} /></div></section>
}
