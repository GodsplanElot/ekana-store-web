"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/lib/cart-context"
import type { Product } from "@/lib/products"
import { formatNaira } from "@/lib/money"
import { trackAddToCart } from "@/lib/analytics"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()

  return (
    <article className="group relative flex flex-col">
      <Link
        href={`/product/${product.id}`}
        className="relative aspect-square overflow-hidden rounded-lg bg-muted"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.badge && (
          <Badge
            variant={product.badge === "Sale" ? "destructive" : "default"}
            className="absolute top-3 left-3"
          >
            {product.badge}
          </Badge>
        )}
      </Link>
      <div className="mt-4 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-foreground leading-tight">
              <Link href={`/product/${product.id}`} className="hover:text-primary transition-colors">
                {product.name}
              </Link>
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {product.description}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-semibold text-foreground">
              {formatNaira(product.price)}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          onClick={() => {
            addItem(product)
            trackAddToCart(product)
          }}
          aria-label={`Add ${product.name} to cart`}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </div>
    </article>
  )
}
