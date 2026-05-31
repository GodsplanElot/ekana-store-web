import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { ShopContent } from "@/components/shop-content";

export const metadata = {
  title: "Shop All - Ekana Cosmetics",
  description:
    "Browse Ekana Cosmetics glosses, lip liners, mink lash pairs, and lash trays.",
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
