"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/lib/cart-context"
import { useState } from "react"

export function CheckoutContent() {
  const { items, totalPrice, clearCart } = useCart()
  const [submitted, setSubmitted] = useState(false)

  const shipping = totalPrice >= 100 ? 0 : 12
  const tax = totalPrice * 0.08
  const total = totalPrice + shipping + tax

  if (submitted) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto max-w-md px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-3">
            Order Confirmed
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Thank you for your purchase. We&apos;ll send you a confirmation email with your order details and tracking information.
          </p>
          <Button asChild>
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto max-w-md px-4">
          <h1 className="font-serif text-3xl text-foreground mb-3">
            Your cart is empty
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Add some items to your cart to proceed with checkout.
          </p>
          <Button asChild>
            <Link href="/shop">Browse Products</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>

        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16">
          {/* Form */}
          <div className="lg:col-span-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                clearCart()
                setSubmitted(true)
              }}
              className="flex flex-col gap-8"
            >
              {/* Contact */}
              <div>
                <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground mb-4">
                  Contact Information
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Shipping */}
              <div>
                <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground mb-4">
                  Shipping Address
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-xs text-muted-foreground uppercase tracking-wide">
                      First Name
                    </Label>
                    <Input id="firstName" placeholder="Jane" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Last Name
                    </Label>
                    <Input id="lastName" placeholder="Doe" required className="mt-1.5" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Address
                    </Label>
                    <Input id="address" placeholder="123 Main St" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-xs text-muted-foreground uppercase tracking-wide">
                      City
                    </Label>
                    <Input id="city" placeholder="New York" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="zip" className="text-xs text-muted-foreground uppercase tracking-wide">
                      ZIP Code
                    </Label>
                    <Input id="zip" placeholder="10001" required className="mt-1.5" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment */}
              <div>
                <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground mb-4">
                  Payment
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="card" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Card Number
                    </Label>
                    <Input id="card" placeholder="4242 4242 4242 4242" required className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry" className="text-xs text-muted-foreground uppercase tracking-wide">
                        Expiry
                      </Label>
                      <Input id="expiry" placeholder="MM / YY" required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="cvc" className="text-xs text-muted-foreground uppercase tracking-wide">
                        CVC
                      </Label>
                      <Input id="cvc" placeholder="123" required className="mt-1.5" />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Place Order &middot; ${total.toFixed(2)}
              </Button>
            </form>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl p-6 sticky top-24">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-card-foreground mb-4">
                Order Summary
              </h2>

              <div className="flex flex-col gap-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-xs">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                      <p className="text-sm text-card-foreground font-medium">
                        {item.product.name}
                      </p>
                      <p className="text-sm text-card-foreground">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold text-card-foreground text-base">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {shipping === 0 && (
                <p className="text-xs text-primary mt-4 font-medium">
                  You qualify for free shipping!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
