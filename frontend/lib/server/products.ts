import {
  normalizeProductCategory,
  type Product,
} from "@/lib/catalog"
import { createSupabasePublicClient } from "@/lib/supabase/public"

interface SupabaseProductRow {
  id: string
  slug: string
  name: string
  description: string
  category: string
  price: number
  image_url: string
  shade: string | null
  features: string[] | null
  inventory_count: number
  is_active: boolean
  is_featured: boolean
  is_restocked: boolean
}

export function mapSupabaseProduct(row: SupabaseProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image_url,
    category: normalizeProductCategory(row.category),
    shade: row.shade ?? undefined,
    details: row.features ?? [],
    inStock: row.inventory_count > 0,
    inventoryCount: row.inventory_count,
    isFeatured: row.is_featured,
    isRestocked: row.is_restocked,
    active: row.is_active,
  }
}

export async function getCatalogProducts() {
  const supabase = createSupabasePublicClient()
  if (!supabase) {
    throw new Error("Supabase catalogue service is not configured.")
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error("Supabase catalogue query failed.", { cause: error })
  }

  return (data ?? []).map((row) =>
    mapSupabaseProduct(row as SupabaseProductRow)
  )
}

export async function getCatalogProduct(idOrSlug: string) {
  const catalog = await getCatalogProducts()
  return catalog.find((product) => product.id === idOrSlug || product.slug === idOrSlug)
}
