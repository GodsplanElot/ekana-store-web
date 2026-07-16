"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trackCheckoutAttempt, trackOrderConfirmation } from "@/lib/analytics";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/money";

export function CheckoutContent() {
  const { items, totalPrice, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const shipping = totalPrice >= 20000 ? 0 : 2500;
  const total = totalPrice + shipping;

  useEffect(() => {
    const paymentReference = new URLSearchParams(window.location.search).get("reference");
    if (!paymentReference) return;

    fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: paymentReference }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to verify payment.");
        }

        setSubmitted(true);
        setReference(paymentReference);
        setPaymentStatus(payload.paymentStatus);
        trackOrderConfirmation(paymentReference, payload.paymentStatus);
        if (payload.paymentStatus === "paid") clearCart();
      })
      .catch((verificationError: Error) => {
        setReference(paymentReference);
        setError(verificationError.message);
      });
  }, [clearCart]);

  if (submitted) {
    return (
      <div className="relative overflow-hidden py-24 text-center">
        <BrandLogo
          variant="watermark"
          sizes="420px"
          className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
        />
        <div className="relative mx-auto max-w-md px-4">
          <BrandLogo variant="mark" sizes="64px" className="mx-auto mb-4 size-20" />
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mb-3 font-serif text-4xl text-foreground">
            Order Confirmed
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
            {paymentStatus === "paid"
              ? "Payment confirmed. We'll send you a confirmation email with your order details and tracking information."
              : "Your order has been received. We'll confirm payment status and follow up with your order details."}
          </p>
          {reference && (
            <p className="mb-8 rounded-full border border-foreground/10 bg-background/70 px-4 py-2 text-xs text-muted-foreground">
              Reference: {reference}
            </p>
          )}
          <Button asChild>
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative overflow-hidden py-24 text-center">
        <BrandLogo
          variant="watermark"
          sizes="360px"
          className="absolute left-1/2 top-1/2 size-[360px] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
        />
        <div className="relative mx-auto max-w-md px-4">
          <BrandLogo variant="seal" sizes="48px" markClassName="size-14" className="mx-auto mb-6 w-fit" />
          <h1 className="mb-3 font-serif text-4xl text-foreground">
            Your cart is empty
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Add some items to your cart to proceed with checkout.
          </p>
          <Button asChild>
            <Link href="/shop">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden py-8 lg:py-12">
      <BrandLogo
        variant="watermark"
        sizes="460px"
        className="absolute -right-32 top-28 size-[460px] opacity-[0.04]"
      />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <BrandLogo variant="seal" sizes="34px" markClassName="size-9 p-1" className="mb-5 w-fit bg-background/70" />
            <h1 className="font-serif text-4xl text-foreground md:text-5xl">
              Checkout
            </h1>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-primary/20 bg-background/70 px-4 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Secure Paystack checkout
          </div>
        </div>

        <div className="mb-8 rounded-md border border-primary/20 bg-primary/10 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Secure checkout</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payments are completed through Paystack when payment credentials are configured. Orders are processed within 1-3 business days, with typical delivery in 2-5 business days in major cities.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitting(true);
                setError("");
                trackCheckoutAttempt(items.length, total);

                const formData = new FormData(e.currentTarget);
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
                    const payload = await response.json();
                    if (!response.ok) {
                      throw new Error(payload.error ?? "Unable to place order.");
                    }

                    if (payload.payment?.authorizationUrl) {
                      window.location.href = payload.payment.authorizationUrl;
                      return;
                    }

                    clearCart();
                    setReference(payload.reference);
                    setPaymentStatus("pending");
                    trackOrderConfirmation(payload.reference, "pending");
                    setSubmitted(true);
                  })
                  .catch((checkoutError: Error) => {
                    setError(checkoutError.message);
                  })
                  .finally(() => setSubmitting(false));
              }}
              className="flex flex-col gap-8"
            >
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                  Contact Information
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="email" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
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
                    <Label htmlFor="phone" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
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

              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                  Shipping Address
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      First Name
                    </Label>
                    <Input id="firstName" name="firstName" autoComplete="given-name" placeholder="Jane" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Last Name
                    </Label>
                    <Input id="lastName" name="lastName" autoComplete="family-name" placeholder="Doe" required className="mt-1.5" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Address
                    </Label>
                    <Input id="address" name="address" autoComplete="street-address" placeholder="Delivery address" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      City
                    </Label>
                    <Input id="city" name="city" autoComplete="address-level2" placeholder="Lagos" required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Notes
                    </Label>
                    <Input id="notes" name="notes" placeholder="Delivery note" className="mt-1.5" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                  Payment
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="card" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Card Number
                    </Label>
                    <Input id="card" autoComplete="off" placeholder="Secure Paystack checkout after order submission" disabled className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Expiry
                      </Label>
                      <Input id="expiry" autoComplete="off" placeholder="Paystack" disabled className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="cvc" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
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
                className="w-full bg-primary text-primary-foreground shadow-[0_18px_34px_rgba(107,57,72,0.22)] hover:bg-primary/90"
                disabled={submitting}
              >
                {submitting ? "Preparing Checkout" : "Pay with Paystack"} &middot; {formatNaira(total)}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs leading-5 text-muted-foreground">
                In line with hygiene standards, purchases are final unless an item arrives damaged, defective, or incorrect. Report issues within 48 hours with verifiable evidence.
              </p>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 overflow-hidden rounded-md border border-foreground/10 bg-card p-6 shadow-[0_18px_54px_rgba(58,35,29,0.1)]">
              <BrandLogo
                variant="watermark"
                sizes="220px"
                className="absolute -right-16 -top-16 size-[220px] opacity-[0.05]"
              />
              <div className="relative">
                <div className="mb-5 flex items-center gap-3">
                  <BrandLogo variant="mark" sizes="38px" className="size-11" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-card-foreground">
                    Order Summary
                  </h2>
                </div>

                <div className="mb-6 flex flex-col gap-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs text-background">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-card-foreground">
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
                  <div className="flex justify-between text-base font-semibold text-card-foreground">
                    <span>Total</span>
                    <span>{formatNaira(total)}</span>
                  </div>
                </div>

                {shipping === 0 && (
                  <p className="mt-4 text-xs font-semibold text-primary">
                    You qualify for free shipping!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
