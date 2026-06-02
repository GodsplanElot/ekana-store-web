import { Providers } from "@/components/providers"
import { HeroSection } from "@/components/hero-section"
import { FeaturedProducts } from "@/components/featured-products"
import { CategoriesSection } from "@/components/categories-section"
import { NewsletterSection } from "@/components/newsletter-section"
import { BrandPromise } from "@/components/brand-promise"
import { getCatalogProducts } from "@/lib/server/products"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const products = await getCatalogProducts()

  return (
    <Providers>
      <HeroSection />
      <CategoriesSection />
      <FeaturedProducts products={products} />
      <BrandPromise />
      <NewsletterSection />
    </Providers>
  )
}
