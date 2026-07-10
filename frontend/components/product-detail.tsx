"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { trackAddToCart, trackProductView } from "@/lib/analytics";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/money";
import type { Product } from "@/lib/products";

interface ProductDetailProps {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetail({ product, relatedProducts }: ProductDetailProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    trackProductView(product);
  }, [product]);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    trackAddToCart(product, quantity);
  };

  return (
    <div className="relative overflow-hidden py-6 pb-24 md:pb-6 lg:py-12">
      <BrandLogo
        variant="watermark"
        sizes="420px"
        className="absolute -right-28 top-20 size-[420px] opacity-[0.04]"
      />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <nav className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/shop" className="transition hover:text-foreground">
            Shop
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/shop?category=${encodeURIComponent(product.category)}`}
            className="transition hover:text-foreground"
          >
            {product.category}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-square overflow-hidden rounded-md border border-foreground/10 bg-muted shadow-[0_28px_80px_rgba(58,35,29,0.12)]">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(33,24,20,0)_0%,rgba(33,24,20,0.36)_100%)]" />
            {product.badge && (
              <Badge
                variant={product.badge === "Sale" ? "destructive" : "default"}
                className="absolute left-4 top-4"
              >
                {product.badge}
              </Badge>
            )}
            <BrandLogo
              variant="lockup"
              surface="ink"
              sizes="44px"
              markClassName="size-11"
              textClassName="hidden sm:block [&_span:first-child]:text-primary-foreground [&_span:last-child]:text-primary-foreground/60"
              className="absolute bottom-5 left-5"
            />
          </div>

          <div className="flex flex-col">
            <BrandLogo variant="seal" sizes="34px" markClassName="size-9 p-1" className="mb-5 w-fit bg-background/70" />
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              {product.category}
            </p>
            <h1 className="mb-4 font-serif text-4xl text-foreground md:text-5xl">
              {product.name}
            </h1>

            <div className="mb-4 flex items-center gap-2">
              <div className="flex items-center gap-0.5" aria-label={`Rated ${product.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(product.rating)
                        ? "fill-primary text-primary"
                        : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>

            <div className="mb-6 flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-foreground">
                {formatNaira(product.price)}
              </span>
            </div>

            <p className="mb-6 text-sm leading-7 text-muted-foreground">
              {product.description}
            </p>

            <div className="mb-6 flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-md border border-foreground/10 bg-background/65 px-3 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-6 text-center text-sm font-medium text-foreground">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                size="lg"
                className="flex-1 bg-primary text-primary-foreground shadow-[0_18px_34px_rgba(107,57,72,0.22)] hover:bg-primary/90"
                onClick={handleAddToCart}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                Details
              </h3>
              <ul className="flex flex-col gap-2">
                {product.details.map((detail, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-2 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                [Truck, "Delivery", "2-5 days in major cities"],
                [RotateCcw, "Final Sale", "48-hour issue window"],
                [Shield, "Patch Test", "Recommended before use"],
              ].map(([Icon, title, copy]) => (
                <div key={title as string} className="flex items-center gap-3">
                  <Icon className="h-5 w-5 flex-shrink-0 text-accent" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{title as string}</p>
                    <p className="text-xs text-muted-foreground">{copy as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-16 lg:mt-24">
            <div className="mb-8 flex items-center gap-4">
              <BrandLogo variant="mark" sizes="38px" className="size-11" />
              <h2 className="font-serif text-3xl text-foreground md:text-4xl">
                You might also like
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <BrandLogo variant="mark" sizes="34px" className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{product.name}</p>
            <p className="font-semibold text-foreground">{formatNaira(product.price)}</p>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleAddToCart}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
