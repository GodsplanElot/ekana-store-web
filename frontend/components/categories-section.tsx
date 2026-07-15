import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { getProductCategories, type Product } from "@/lib/catalog";

export function CategoriesSection({ products }: { products: Product[] }) {
  const categoryData = getProductCategories(products).map((category) => ({
    name: category,
    slug: category,
    image: products.find((product) => product.category === category)!.image,
  }));
  return (
    <section className="relative overflow-hidden border-y border-foreground/10 bg-card py-16 lg:py-24">
      <BrandLogo
        variant="watermark"
        sizes="440px"
        className="absolute -left-28 top-1/2 size-[440px] -translate-y-1/2 opacity-[0.05]"
      />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Browse
            </p>
            <h2 className="font-serif text-3xl text-card-foreground md:text-5xl">
              Shop by Category
            </h2>
          </div>
          <BrandLogo variant="seal" sizes="34px" markClassName="size-9 p-1" className="w-fit bg-background/65" />
        </div>

        {categoryData.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoryData.map((category) => (
              <Link
                key={category.slug}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-md border border-foreground/10 bg-muted"
              >
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105 group-hover:saturate-[1.08]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-foreground/30 transition group-hover:bg-foreground/40" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-serif text-3xl text-background">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-background/80">
                    Shop collection
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-foreground/15 px-6 py-14 text-center">
            <p className="font-serif text-2xl text-card-foreground">
              No collections yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Categories will appear automatically when products are published.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
