"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleX,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trackCheckoutAttempt, trackOrderConfirmation } from "@/lib/analytics";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/money";

type PaymentView =
  | "form"
  | "verifying"
  | "paid"
  | "pending"
  | "failed"
  | "review"
  | "verification-error";

type CheckoutPayload = {
  error?: unknown;
  paymentStatus?: unknown;
  reference?: unknown;
  retryDisposition?: "fresh-attempt";
  payment?: { authorizationUrl?: unknown };
};

const CHECKOUT_ATTEMPT_STORAGE_KEY = "ekana:checkout-attempts:v1";

type CheckoutAttempt = {
  body: string;
  fingerprint: string;
  key: string;
};

type StoredCheckoutAttempts = {
  version: 1;
  activeFingerprint?: string;
  entries: Record<string, { key: string; updatedAt: number; reference?: string }>;
};

function readStoredCheckoutAttempts(): StoredCheckoutAttempts {
  const empty: StoredCheckoutAttempts = { version: 1, entries: {} };
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
    if (!raw) return empty;
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return empty;

    const candidate = value as Partial<StoredCheckoutAttempts>;
    if (candidate.version !== 1 || !candidate.entries || typeof candidate.entries !== "object") {
      return empty;
    }

    const entries: StoredCheckoutAttempts["entries"] = {};
    for (const [fingerprint, entry] of Object.entries(candidate.entries)) {
      if (
        /^[a-f0-9]{64}$/.test(fingerprint) &&
        entry &&
        typeof entry === "object" &&
        "key" in entry &&
        typeof entry.key === "string" &&
        /^[A-Za-z0-9._=-]{16,120}$/.test(entry.key) &&
        "updatedAt" in entry &&
        typeof entry.updatedAt === "number" &&
        Number.isFinite(entry.updatedAt)
      ) {
        const reference =
          "reference" in entry && typeof entry.reference === "string"
            ? getSafeReference(entry.reference)
            : "";
        entries[fingerprint] = {
          key: entry.key,
          updatedAt: entry.updatedAt,
          ...(reference ? { reference } : {}),
        };
      }
    }

    const activeFingerprint =
      typeof candidate.activeFingerprint === "string" && entries[candidate.activeFingerprint]
        ? candidate.activeFingerprint
        : undefined;
    return { version: 1, entries, ...(activeFingerprint ? { activeFingerprint } : {}) };
  } catch {
    return empty;
  }
}

function writeStoredCheckoutAttempts(value: StoredCheckoutAttempts) {
  try {
    if (Object.keys(value.entries).length === 0) {
      window.sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Checkout still has in-memory idempotency when browser storage is unavailable.
  }
}

function rememberCheckoutAttempt(fingerprint: string, key: string) {
  const stored = readStoredCheckoutAttempts();
  stored.entries[fingerprint] = {
    ...stored.entries[fingerprint],
    key,
    updatedAt: Date.now(),
  };
  stored.activeFingerprint = fingerprint;
  writeStoredCheckoutAttempts(stored);
}

function bindStoredCheckoutReference(fingerprint: string, reference: string) {
  const safeReference = getSafeReference(reference);
  if (!safeReference) return;
  const stored = readStoredCheckoutAttempts();
  const entry = stored.entries[fingerprint];
  if (!entry) return;
  stored.entries[fingerprint] = {
    ...entry,
    reference: safeReference,
    updatedAt: Date.now(),
  };
  stored.activeFingerprint = fingerprint;
  writeStoredCheckoutAttempts(stored);
}

function clearStoredCheckoutAttempt(fingerprint?: string, reference?: string) {
  const stored = readStoredCheckoutAttempts();
  const safeReference = getSafeReference(reference);
  const matchingFingerprint = safeReference
    ? Object.entries(stored.entries).find(
        ([, entry]) => entry.reference === safeReference
      )?.[0]
    : undefined;
  const target = fingerprint ?? matchingFingerprint ?? (!safeReference ? stored.activeFingerprint : undefined);
  if (!target) return;

  delete stored.entries[target];
  if (stored.activeFingerprint === target) stored.activeFingerprint = undefined;
  writeStoredCheckoutAttempts(stored);
}

async function fingerprintCheckoutBody(body: string) {
  const browserCrypto = globalThis.crypto;
  if (!browserCrypto?.subtle) {
    throw new Error("Secure checkout is unavailable in this browser.");
  }
  const digest = await browserCrypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getCheckoutAttempt(body: string): Promise<CheckoutAttempt> {
  const fingerprint = await fingerprintCheckoutBody(body);
  const stored = readStoredCheckoutAttempts();
  const key = stored.entries[fingerprint]?.key ?? createIdempotencyKey();
  rememberCheckoutAttempt(fingerprint, key);
  return { body, fingerprint, key };
}

function getFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeReference(value: unknown) {
  if (typeof value !== "string") return "";
  const reference = value.trim();
  return /^[A-Za-z0-9._=-]{1,100}$/.test(reference) ? reference : "";
}

function getPaymentView(value: unknown): Exclude<PaymentView, "form" | "verifying" | "verification-error"> {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (status === "paid") return "paid";
  if (["pending", "processing", "ongoing", "queued", "initialized", "awaiting_payment"].includes(status)) {
    return "pending";
  }
  if (["failed", "abandoned", "cancelled", "canceled", "expired"].includes(status)) {
    return "failed";
  }
  return "review";
}

function createIdempotencyKey() {
  const browserCrypto = globalThis.crypto;
  if (!browserCrypto) throw new Error("Secure checkout is unavailable in this browser.");
  if (typeof browserCrypto.randomUUID === "function") return browserCrypto.randomUUID();
  return Array.from(browserCrypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function getPaystackAuthorizationUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.paystack.com"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function getCheckoutError(payload: CheckoutPayload) {
  if (typeof payload.error !== "string") return "Unable to prepare checkout. Please try again.";
  const message = payload.error.trim();
  return message.length > 0 && message.length <= 180
    ? message
    : "Unable to prepare checkout. Please try again.";
}

function PaymentResult({
  state,
  reference,
  onRetry,
}: {
  state: Exclude<PaymentView, "form">;
  reference: string;
  onRetry: () => void;
}) {
  const content = {
    verifying: {
      eyebrow: "Secure payment check",
      title: "Confirming your payment",
      description: "We're checking the transaction directly with Paystack. Keep this page open for a moment.",
      iconClass: "bg-primary/10 text-primary",
    },
    paid: {
      eyebrow: "Payment received",
      title: "Order confirmed",
      description: "Your payment is confirmed. We'll email your order details and prepare it for delivery.",
      iconClass: "bg-emerald-50 text-emerald-700",
    },
    pending: {
      eyebrow: "Payment processing",
      title: "Your payment is still processing",
      description: "Paystack has not confirmed the final result yet. Your cart is safe, and you can check again shortly.",
      iconClass: "bg-amber-50 text-amber-700",
    },
    failed: {
      eyebrow: "Payment incomplete",
      title: "Payment wasn't completed",
      description: "No confirmed payment was found for this attempt. Your cart has been kept so you can try again.",
      iconClass: "bg-red-50 text-red-700",
    },
    review: {
      eyebrow: "Manual review",
      title: "Your payment needs review",
      description: "We received a status that needs a closer look. Don't pay again yet; keep your reference for support.",
      iconClass: "bg-amber-50 text-amber-800",
    },
    "verification-error": {
      eyebrow: "Verification unavailable",
      title: "We couldn't verify your payment",
      description: "The payment check could not be completed. Your cart is unchanged; please retry before starting a new payment.",
      iconClass: "bg-red-50 text-red-700",
    },
  }[state];

  return (
    <div className="relative overflow-hidden py-24 text-center">
      <BrandLogo
        variant="watermark"
        sizes="420px"
        className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
      />
      <div className="relative mx-auto max-w-lg px-4" aria-live="polite">
        <BrandLogo variant="mark" sizes="64px" className="mx-auto mb-5 size-20" />
        <div className={`mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full ${content.iconClass}`}>
          {state === "verifying" && <LoaderCircle className="h-7 w-7 animate-spin" />}
          {state === "paid" && <CheckCircle2 className="h-7 w-7" />}
          {state === "pending" && <Clock3 className="h-7 w-7" />}
          {state === "failed" && <CircleX className="h-7 w-7" />}
          {(state === "review" || state === "verification-error") && (
            <ShieldAlert className="h-7 w-7" />
          )}
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {content.eyebrow}
        </p>
        <h1 className="mb-3 font-serif text-4xl text-foreground">{content.title}</h1>
        <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-muted-foreground">
          {content.description}
        </p>
        {reference && (
          <div className="mx-auto mb-8 max-w-md border border-foreground/10 bg-background/70 px-4 py-3 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Payment reference
            </p>
            <p className="mt-1 break-all font-mono text-xs text-foreground">{reference}</p>
          </div>
        )}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          {reference &&
            (state === "pending" || state === "review" || state === "verification-error") && (
            <Button onClick={onRetry} type="button">
              <RefreshCw className="h-4 w-4" />
              Check payment again
            </Button>
            )}
          {state === "failed" ? (
            <Button asChild>
              <Link href="/checkout">Try checkout again</Link>
            </Button>
          ) : state !== "verifying" ? (
            <Button asChild variant={state === "paid" ? "default" : "outline"}>
              <Link href="/shop">Continue shopping</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CheckoutContent() {
  const { items, totalPrice, clearCart } = useCart();
  const [paymentView, setPaymentView] = useState<PaymentView>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const automaticVerificationRef = useRef("");
  const verificationInFlightRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const submitAttemptRef = useRef<CheckoutAttempt | null>(null);

  const shipping = totalPrice >= 20000 ? 0 : 2500;
  const total = totalPrice + shipping;

  const applyPaymentResult = useCallback(
    (statusValue: unknown, referenceValue: unknown) => {
      const status = typeof statusValue === "string" ? statusValue.trim().toLowerCase() : "review";
      const safeReference = getSafeReference(referenceValue);
      const nextView = getPaymentView(status);

      setReference(safeReference);
      setPaymentView(nextView);
      if (safeReference) trackOrderConfirmation(safeReference, status || "review");
      if (
        nextView === "paid" ||
        nextView === "failed" ||
        ["refunded", "partially_refunded", "reversed"].includes(status)
      ) {
        clearStoredCheckoutAttempt(
          submitAttemptRef.current?.fingerprint,
          safeReference
        );
        submitAttemptRef.current = null;
      }
      if (nextView === "paid") clearCart();
    },
    [clearCart]
  );

  const verifyPayment = useCallback(
    async (referenceValue: string) => {
      const safeReference = getSafeReference(referenceValue);
      if (!safeReference) {
        setReference("");
        setPaymentView("verification-error");
        return;
      }
      if (verificationInFlightRef.current) return;

      verificationInFlightRef.current = true;
      setReference(safeReference);
      setPaymentView("verifying");

      try {
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: safeReference }),
        });
        const payload = (await response.json()) as CheckoutPayload;
        if (!response.ok) throw new Error("Payment verification failed.");

        applyPaymentResult(payload.paymentStatus, getSafeReference(payload.reference) || safeReference);
      } catch {
        setReference(safeReference);
        setPaymentView("verification-error");
      } finally {
        verificationInFlightRef.current = false;
      }
    },
    [applyPaymentResult]
  );

  useEffect(() => {
    const paymentReference = new URLSearchParams(window.location.search).get("reference");
    if (!paymentReference) return;

    if (automaticVerificationRef.current === paymentReference) return;
    automaticVerificationRef.current = paymentReference;
    void verifyPayment(paymentReference);
  }, [verifyPayment]);

  async function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const requestBody = JSON.stringify({
      customer: {
        firstName: getFormText(formData, "firstName"),
        lastName: getFormText(formData, "lastName"),
        email: getFormText(formData, "email"),
        phone: getFormText(formData, "phone"),
        address: getFormText(formData, "address"),
        city: getFormText(formData, "city"),
        notes: getFormText(formData, "notes"),
      },
      quotedTotal: total,
      items: items
        .map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        }))
        .sort((left, right) => left.productId.localeCompare(right.productId)),
    });

    try {
      if (!submitAttemptRef.current || submitAttemptRef.current.body !== requestBody) {
        submitAttemptRef.current = await getCheckoutAttempt(requestBody);
      }

      trackCheckoutAttempt(items.length, total);
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submitAttemptRef.current.key,
        },
        body: requestBody,
      });
      const payload = (await response.json()) as CheckoutPayload;
      if (!response.ok) {
        if (payload.retryDisposition === "fresh-attempt") {
          clearStoredCheckoutAttempt(submitAttemptRef.current.fingerprint);
          submitAttemptRef.current = null;
        }
        setError(getCheckoutError(payload));
        return;
      }

      const authorizationUrl = getPaystackAuthorizationUrl(payload.payment?.authorizationUrl);
      if (payload.payment?.authorizationUrl && !authorizationUrl) {
        setError("Checkout returned an invalid payment destination. Please try again.");
        return;
      }
      const responseReference = getSafeReference(payload.reference);
      if (responseReference) {
        bindStoredCheckoutReference(
          submitAttemptRef.current.fingerprint,
          responseReference
        );
      }
      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
        return;
      }

      applyPaymentResult(payload.paymentStatus, payload.reference);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error && checkoutError.message.startsWith("Secure checkout")
          ? checkoutError.message
          : "We could not reach checkout. Check your connection and retry; the same request will resume safely."
      );
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  if (paymentView !== "form") {
    return (
      <PaymentResult
        state={paymentView}
        reference={reference}
        onRetry={() => void verifyPayment(reference)}
      />
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
            After you submit your delivery details, you will continue to Paystack to choose a
            payment method. Paystack returns you here so we can confirm the result before your
            order is prepared.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-8">
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
                <div className="border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-primary shadow-sm">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Pay securely on Paystack
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Card, bank transfer, and other available payment details are entered only
                        on Paystack&apos;s hosted checkout. Ekana does not collect or store your full
                        payment credentials.
                      </p>
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
                {submitting ? "Preparing secure checkout" : "Continue to Paystack"} &middot;{" "}
                {formatNaira(total)}
              </Button>
              {error && (
                <p className="text-sm text-destructive" role="alert" aria-live="polite">
                  {error}
                </p>
              )}
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
