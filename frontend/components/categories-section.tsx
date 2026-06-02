import Image from "next/image"
import Link from "next/link"

const categoryData = [
  {
    name: "Glosses",
    slug: "Glosses",
    image: "/images/product-7.jpg",
    count: 5,
  },
  {
    name: "Lip Liners",
    slug: "Lip Liners",
    image: "/images/product-5.jpg",
    count: 3,
  },
  {
    name: "Lashes",
    slug: "Lashes",
    image: "/images/product-8.jpg",
    count: 1,
  },
  {
    name: "Lash Trays",
    slug: "Lash Trays",
    image: "/images/product-6.jpg",
    count: 1,
  },
]

export function CategoriesSection() {
  return (
    <section className="py-16 lg:py-24 bg-card">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-2">
            Browse
          </p>
          <h2 className="font-serif text-3xl md:text-4xl text-card-foreground">
            Shop by Category
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categoryData.map((category) => (
            <Link
              key={category.slug}
              href={`/shop?category=${encodeURIComponent(category.slug)}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg"
            >
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-foreground/30 group-hover:bg-foreground/40 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <h3 className="font-serif text-2xl text-background">
                  {category.name}
                </h3>
                <p className="text-sm text-background/80 mt-1">
                  {category.count} products
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
