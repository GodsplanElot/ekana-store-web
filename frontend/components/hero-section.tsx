import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0 items-center py-12 lg:py-20">
          {/* Text content */}
          <div className="flex flex-col gap-6 lg:pr-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
              Ekana Cosmetics
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-[1.1] text-balance">
              Making beauty feel as good as it looks
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              Refined glosses, liners, and lashes designed for luxurious wear, soft confidence, and effortless mobile shopping.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-2">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link href="/shop?category=Glosses">
                  Shop Glosses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop?category=Lip%20Liners">Shop Liners</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop?category=Lashes">Shop Lashes</Link>
              </Button>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative aspect-[4/3] lg:aspect-square overflow-hidden rounded-lg">
            <Image
              src="/images/hero.jpg"
              alt="Ekana Cosmetics glosses, liners, and beauty products arranged on pink silk"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
