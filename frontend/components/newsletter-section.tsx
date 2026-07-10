"use client";

import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackNewsletterSignup } from "@/lib/analytics";

export function NewsletterSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-md bg-[#211814] px-6 py-12 text-center text-primary-foreground shadow-[0_28px_90px_rgba(33,24,20,0.24)] md:px-12 md:py-16">
          <BrandLogo
            variant="watermark"
            sizes="420px"
            className="absolute -bottom-36 left-1/2 size-[420px] -translate-x-1/2 opacity-[0.06]"
          />
          <div className="relative">
            <BrandLogo
              variant="mark"
              surface="ink"
              sizes="56px"
              className="mx-auto mb-5 size-16"
            />
            <h2 className="font-serif text-4xl text-primary-foreground md:text-5xl">
              Join the Ekana Circle
            </h2>
            <p className="mx-auto mb-8 mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/70">
              Be the first to know about new shades, restocks, and exclusive launches.
            </p>
            <form
              className="mx-auto flex max-w-md flex-col items-center gap-3 sm:flex-row"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                setStatus("loading");

                const response = await fetch("/api/newsletter", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: formData.get("email"),
                    source: "home",
                  }),
                });

                if (!response.ok) {
                  setStatus("error");
                  setMessage("Enter a valid email address.");
                  return;
                }

                e.currentTarget.reset();
                setStatus("success");
                setMessage("You're on the list.");
                trackNewsletterSignup("home");
              }}
            >
              <Input
                name="email"
                type="email"
                placeholder="Your email address"
                className="border-white/20 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-white/30"
                aria-label="Email address"
              />
              <Button
                type="submit"
                variant="secondary"
                className="w-full flex-shrink-0 bg-primary-foreground text-foreground hover:bg-primary-foreground/90 sm:w-auto"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Subscribing" : "Subscribe"}
              </Button>
            </form>
            {message && (
              <p className="mt-4 text-sm text-primary-foreground/80">{message}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
