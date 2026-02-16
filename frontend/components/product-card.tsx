"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/lib/cart-context"
import type { Product } from "@/lib/products"

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
            <p className="text-xs text-muted-foreground mt-1">
              {product.category}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-semibold text-foreground">
              ${product.price}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through ml-1.5">
                ${product.originalPrice}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => addItem(product)}
          aria-label={`Add ${product.name} to cart`}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </div>
    </article>
  )
}
