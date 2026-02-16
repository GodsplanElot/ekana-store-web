"use client"

import type { ReactNode } from "react"
import { CartProvider } from "@/lib/cart-context"
import { SiteHeader } from "@/components/site-header"
import { CartSheet } from "@/components/cart-sheet"
import { SiteFooter } from "@/components/site-footer"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <SiteHeader />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <SiteFooter />
      <CartSheet />
    </CartProvider>
  )
}
