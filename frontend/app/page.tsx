import { Providers } from "@/components/providers"
import { HeroSection } from "@/components/hero-section"
import { FeaturedProducts } from "@/components/featured-products"
import { CategoriesSection } from "@/components/categories-section"
import { NewsletterSection } from "@/components/newsletter-section"

export default function HomePage() {
  return (
    <Providers>
      <HeroSection />
      <FeaturedProducts />
      <CategoriesSection />
      <NewsletterSection />
    </Providers>
  )
}
