import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { ShopContent } from "@/components/shop-content";

export const metadata = {
  title: "Shop All - Ekana's Cosmetic",
  description:
    "Browse our full collection of luxury makeup and beauty products.",
};

export default function ShopPage() {
  return (
    <Providers>
      <Suspense fallback={null}>
        <ShopContent />
      </Suspense>
    </Providers>
  );
}
