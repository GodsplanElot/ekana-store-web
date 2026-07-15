"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

export function FeaturedProducts({ products }: { products: Product[] }) {
  const featured = products
    .filter((product) => product.isRestocked || product.isFeatured)
    .slice(0, 4);

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <BrandLogo
        variant="watermark"
        sizes="360px"
        className="absolute right-[-120px] top-10 size-[360px] opacity-[0.045]"
      />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            <BrandLogo variant="mark" sizes="42px" className="hidden size-12 sm:inline-flex" />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Featured
              </p>
              <h2 className="font-serif text-3xl text-foreground md:text-5xl">
                New & Restocked
              </h2>
            </div>
          </div>
          <Link
            href="/shop"
            className="hidden items-center gap-1.5 text-sm font-semibold text-foreground transition hover:text-primary md:flex"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-foreground/15 bg-background/50 px-6 py-14 text-center">
            <p className="font-serif text-2xl text-foreground">
              No featured products yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Products marked as featured or restocked in the admin will appear here.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center md:hidden">
          <Link
            href="/shop"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground transition hover:text-primary"
          >
            View All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
