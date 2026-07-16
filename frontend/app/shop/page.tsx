import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { ShopContent } from "@/components/shop-content";
import { getCatalogProducts } from "@/lib/server/products";

export const metadata = {
  title: "Shop All - Ekana Cosmetics",
  description: "Browse the latest products from Ekana Cosmetics.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getCatalogProducts();

  return (
    <Providers>
      <Suspense fallback={null}>
        <ShopContent products={products} />
      </Suspense>
    </Providers>
  );
}
