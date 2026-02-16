import { notFound } from "next/navigation"
import { Providers } from "@/components/providers"
import { ProductDetail } from "@/components/product-detail"
import { getProduct, products } from "@/lib/products"
import type { Metadata } from "next"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const product = getProduct(id)
  if (!product) return { title: "Product Not Found" }
  return {
    title: `${product.name} - ROSETTE Beauty`,
    description: product.description,
  }
}

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }))
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params
  const product = getProduct(id)
  if (!product) notFound()

  return (
    <Providers>
      <ProductDetail product={product} />
    </Providers>
  )
}
