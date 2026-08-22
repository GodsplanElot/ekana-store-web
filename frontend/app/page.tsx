import { Providers } from "@/components/providers"
import { HeroSection } from "@/components/hero-section"
import { FeaturedProducts } from "@/components/featured-products"
import { CategoriesSection } from "@/components/categories-section"
import { NewsletterSection } from "@/components/newsletter-section"
import { BrandPromise } from "@/components/brand-promise"
import { getCatalogProducts } from "@/lib/server/products"
import { getSiteMedia } from "@/lib/server/site-media"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [products, heroSlides] = await Promise.all([
    getCatalogProducts(),
    getSiteMedia("home_hero"),
  ])

  return (
    <Providers>
      <HeroSection slides={heroSlides} />
      <CategoriesSection products={products} />
      <FeaturedProducts products={products} />
      <BrandPromise />
      <NewsletterSection />
    </Providers>
  )
}
