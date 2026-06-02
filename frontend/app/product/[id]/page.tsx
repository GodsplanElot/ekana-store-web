import { notFound } from "next/navigation";
import { Providers } from "@/components/providers";
import { ProductDetail } from "@/components/product-detail";
import { products } from "@/lib/products";
import { getCatalogProduct, getCatalogProducts } from "@/lib/server/products";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getCatalogProduct(id);
  if (!product) return { title: "Product Not Found" };
  return {
    title: `${product.name} - Ekana Cosmetics`,
    description: product.description,
  };
}

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getCatalogProduct(id);
  if (!product) notFound();
  const catalog = await getCatalogProducts();
  const relatedProducts = catalog
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <Providers>
      <ProductDetail product={product} relatedProducts={relatedProducts} />
    </Providers>
  );
}
