"use client"

import { track } from "@vercel/analytics"
import type { Product } from "@/lib/products"

export function trackProductView(product: Product) {
  track("product_view", {
    productId: product.id,
    category: product.category,
    price: product.price,
  })
}

export function trackAddToCart(product: Product, quantity = 1) {
  track("add_to_cart", {
    productId: product.id,
    category: product.category,
    quantity,
    value: product.price * quantity,
  })
}

export function trackCheckoutAttempt(itemCount: number, value: number) {
  track("checkout_attempt", {
    itemCount,
    value,
  })
}

export function trackOrderConfirmation(reference: string, status: string) {
  track("order_confirmation", {
    reference,
    status,
  })
}

export function trackNewsletterSignup(source: string) {
  track("newsletter_signup", {
    source,
  })
}
