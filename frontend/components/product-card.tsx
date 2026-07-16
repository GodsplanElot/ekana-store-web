"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { trackAddToCart } from "@/lib/analytics";
import { formatNaira } from "@/lib/money";
import type { Product } from "@/lib/catalog";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const badge = product.isRestocked
    ? "Restocked"
    : product.isFeatured
      ? "Featured"
      : null;

  return (
    <article className="group relative flex flex-col">
      <Link
        href={`/product/${product.id}`}
        className="relative aspect-square overflow-hidden rounded-md border border-foreground/10 bg-muted shadow-[0_14px_36px_rgba(58,35,29,0.08)]"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105 group-hover:saturate-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(33,24,20,0)_0%,rgba(33,24,20,0.32)_100%)] opacity-0 transition group-hover:opacity-100" />
        {badge && (
          <Badge className="absolute left-3 top-3">
            {badge}
          </Badge>
        )}
        <BrandLogo
          variant="mark"
          surface="glass"
          sizes="28px"
          className="absolute bottom-3 right-3 size-8 opacity-0 transition group-hover:opacity-100"
        />
      </Link>
      <div className="mt-4 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight text-foreground">
              <Link href={`/product/${product.id}`} className="transition hover:text-primary">
                {product.name}
              </Link>
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {product.description}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <span className="text-sm font-semibold text-foreground">
              {formatNaira(product.price)}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full border-primary/20 bg-background/70 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          disabled={!product.inStock}
          onClick={() => {
            addItem(product);
            trackAddToCart(product);
          }}
          aria-label={
            product.inStock
              ? `Add ${product.name} to cart`
              : `${product.name} is out of stock`
          }
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          {product.inStock ? "Add to Cart" : "Out of Stock"}
        </Button>
      </div>
    </article>
  );
}
