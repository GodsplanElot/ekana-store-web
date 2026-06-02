import { products as seedProducts, type Product, type ProductCategory } from "@/lib/products"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

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

const categories = new Set<ProductCategory>([
  "Glosses",
  "Lip Liners",
  "Lashes",
  "Lash Trays",
])

export function mapSupabaseProduct(row: SupabaseProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image_url,
    category: categories.has(row.category as ProductCategory)
      ? (row.category as ProductCategory)
      : "Glosses",
    shade: row.shade ?? undefined,
    rating: 5,
    reviews: 0,
    details: row.features?.length
      ? row.features
      : ["Patch test recommended", "Store in a cool dry place"],
    inStock: row.inventory_count > 0,
    inventoryCount: row.inventory_count,
    isFeatured: row.is_featured,
    isRestocked: row.is_restocked,
    active: row.is_active,
  }
}

export async function getCatalogProducts() {
  const supabase = createSupabaseAdmin()
  if (!supabase) return seedProducts

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error || !data?.length) return seedProducts

  return data.map((row) => mapSupabaseProduct(row as SupabaseProductRow))
}

export async function getCatalogProduct(idOrSlug: string) {
  const catalog = await getCatalogProducts()
  return catalog.find((product) => product.id === idOrSlug || product.slug === idOrSlug)
}
