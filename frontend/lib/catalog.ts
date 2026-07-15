export interface Product {
  id: string
  slug: string
  name: string
  description: string
  price: number
  image: string
  category: string
  shade?: string
  details: string[]
  inStock: boolean
  inventoryCount: number
  isFeatured: boolean
  isRestocked: boolean
  active: boolean
}

export function getProductCategories(products: readonly Product[]) {
  return Array.from(
    new Set(
      products
        .map((product) => product.category.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right))
}
