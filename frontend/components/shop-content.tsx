"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import {
  getProductCategories,
  normalizeProductCategory,
  type Product,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ShopContent({ products }: { products: Product[] }) {
  const searchParams = useSearchParams();
  const categories = ["All", ...getProductCategories(products)];
  const categoryParam = searchParams.get("category");
  const validCategory = categories.find((category) => category === categoryParam);
  const activeCategory = validCategory ?? "All";

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter(
          (product) =>
            normalizeProductCategory(product.category) === activeCategory
        );

  return (
    <section className="relative overflow-hidden py-10 lg:py-14">
      <BrandLogo
        variant="watermark"
        sizes="360px"
        className="absolute -right-24 top-3 size-[360px] opacity-[0.04]"
      />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <BrandLogo variant="seal" sizes="34px" markClassName="size-9 p-1" className="mb-5 w-fit bg-background/70" />
            <h1 className="font-serif text-4xl text-foreground md:text-5xl">
              Shop All
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Filter by category">
          {categories.map((category) => (
            <Button
              key={category}
              asChild
              variant={activeCategory === category ? "default" : "outline"}
              size="sm"
              className={cn(
                "flex-shrink-0 rounded-full",
                activeCategory === category && "bg-primary text-primary-foreground",
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">
              {products.length === 0
                ? "No products are available yet."
                : "No products found in this category."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
