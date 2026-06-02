"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { categories, type Product } from "@/lib/products"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ShopContent({ products }: { products: Product[] }) {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")
  const validCategory = categories.find((category) => category === categoryParam)
  const activeCategory =
    validCategory ?? "All"

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory)

  return (
    <section className="py-8 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-2">
            Shop All
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2" role="tablist" aria-label="Filter by category">
          {categories.map((category) => (
            <Button
              key={category}
              asChild
              variant={activeCategory === category ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-shrink-0 rounded-full",
                activeCategory === category &&
                  "bg-primary text-primary-foreground"
              )}
              role="tab"
              aria-selected={activeCategory === category}
            >
              <Link href={category === "All" ? "/shop" : `/shop?category=${encodeURIComponent(category)}`}>
                {category}
              </Link>
            </Button>
          ))}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              No products found in this category.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
