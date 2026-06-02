"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/lib/cart-context"
import { useEffect, useState } from "react"
import { formatNaira } from "@/lib/money"
import { trackCheckoutAttempt, trackOrderConfirmation } from "@/lib/analytics"

export function CheckoutContent() {
  const { items, totalPrice, clearCart } = useCart()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [reference, setReference] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("")

  const shipping = totalPrice >= 20000 ? 0 : 2500
  const total = totalPrice + shipping

  useEffect(() => {
    const paymentReference = new URLSearchParams(window.location.search).get("reference")
    if (!paymentReference) return

    fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: paymentReference }),
    })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to verify payment.")
        }

        setSubmitted(true)
        setReference(paymentReference)
        setPaymentStatus(payload.paymentStatus)
        trackOrderConfirmation(paymentReference, payload.paymentStatus)
        if (payload.paymentStatus === "paid") clearCart()
      })
      .catch((verificationError: Error) => {
        setReference(paymentReference)
        setError(verificationError.message)
      })
  }, [clearCart])

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
            {paymentStatus === "paid"
              ? "Payment confirmed. We'll send you a confirmation email with your order details and tracking information."
              : "Your order has been received. We'll confirm payment status and follow up with your order details."}
          </p>
          {reference && (
            <p className="mb-8 text-xs text-muted-foreground">
              Reference: {reference}
            </p>
          )}
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

        <div className="mb-8 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Secure checkout</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payments are completed through Paystack when payment credentials are configured. Orders are processed within 1-3 business days, with typical delivery in 2-5 business days in major cities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-16">
          {/* Form */}
          <div className="lg:col-span-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSubmitting(true)
                setError("")
                trackCheckoutAttempt(items.length, total)

                const formData = new FormData(e.currentTarget)
                fetch("/api/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    customer: {
                      firstName: formData.get("firstName"),
                      lastName: formData.get("lastName"),
                      email: formData.get("email"),
                      phone: formData.get("phone"),
                      address: formData.get("address"),
                      city: formData.get("city"),
                      notes: formData.get("notes"),
                    },
                    items: items.map((item) => ({
                      productId: item.product.id,
                      quantity: item.quantity,
                    })),
                  }),
                })
                  .then(async (response) => {
                    const payload = await response.json()
                    if (!response.ok) {
                      throw new Error(payload.error ?? "Unable to place order.")
                    }

                    if (payload.payment?.authorizationUrl) {
                      window.location.href = payload.payment.authorizationUrl
                      return
                    }

                    clearCart()
                    setReference(payload.reference)
                    setPaymentStatus("pending")
                    trackOrderConfirmation(payload.reference, "pending")
                    setSubmitted(true)
                  })
                  .catch((checkoutError: Error) => {
                    setError(checkoutError.message)
                  })
                  .finally(() => setSubmitting(false))
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
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="0800 000 0000"
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
                    <Input id="firstName" name="firstName" autoComplete="given-name" placeholder="Jane" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Last Name
                    </Label>
                    <Input id="lastName" name="lastName" autoComplete="family-name" placeholder="Doe" required className="mt-1.5" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Address
                    </Label>
                    <Input id="address" name="address" autoComplete="street-address" placeholder="Delivery address" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-xs text-muted-foreground uppercase tracking-wide">
                      City
                    </Label>
                    <Input id="city" name="city" autoComplete="address-level2" placeholder="Lagos" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-xs text-muted-foreground uppercase tracking-wide">
                      Notes
                    </Label>
                    <Input id="notes" name="notes" placeholder="Delivery note" className="mt-1.5" />
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
                    <Input id="card" autoComplete="off" placeholder="Secure Paystack checkout after order submission" disabled className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry" className="text-xs text-muted-foreground uppercase tracking-wide">
                        Expiry
                      </Label>
                      <Input id="expiry" autoComplete="off" placeholder="Paystack" disabled className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="cvc" className="text-xs text-muted-foreground uppercase tracking-wide">
                        CVC
                      </Label>
                      <Input id="cvc" autoComplete="off" placeholder="Secure" disabled className="mt-1.5" />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={submitting}
              >
                {submitting ? "Preparing Checkout" : "Pay with Paystack"} &middot; {formatNaira(total)}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs leading-5 text-muted-foreground">
                In line with hygiene standards, purchases are final unless an
                item arrives damaged, defective, or incorrect. Report issues
                within 48 hours with verifiable evidence.
              </p>
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
                        {formatNaira(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatNaira(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "Free" : formatNaira(shipping)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold text-card-foreground text-base">
                  <span>Total</span>
                  <span>{formatNaira(total)}</span>
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
