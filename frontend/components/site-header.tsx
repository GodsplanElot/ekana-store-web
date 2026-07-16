"use client";

import Link from "next/link";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeModeControl } from "@/components/theme-mode-control";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const mobileLinks = [
  ...primaryLinks,
  { href: "/shipping-returns", label: "Shipping & Returns" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
];

export function SiteHeader() {
  const { totalItems, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-[72px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            <Link
              href="/"
              className="flex min-w-0 items-center"
              aria-label="Ekana Cosmetics home"
              onClick={() => setMobileMenuOpen(false)}
            >
              <BrandLogo
                priority
                variant="lockup"
                surface="cocoa"
                sizes="52px"
                markClassName="size-12 p-1.5"
                textClassName="hidden sm:block"
              />
            </Link>
          </div>

          <nav
            className="hidden items-center gap-1 rounded-full border border-foreground/10 bg-card/55 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(58,35,29,0.08)] lg:flex"
            aria-label="Main navigation"
          >
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-background hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeModeControl />
            <Button variant="ghost" size="icon" aria-label="Search products" asChild>
              <Link href="/shop">
                <Search className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Cart with ${totalItems} items`}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            className="relative overflow-hidden border-t border-foreground/10 py-5 lg:hidden"
            aria-label="Mobile navigation"
          >
            <BrandLogo
              variant="watermark"
              sizes="180px"
              className="absolute -right-12 -top-16 size-44 opacity-[0.06]"
            />
            <div className="mb-4 flex items-center justify-between">
              <BrandLogo
                variant="seal"
                surface="rose"
                sizes="32px"
                markClassName="size-8 p-1"
                className="border-primary/20 bg-primary/10"
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Beauty menu
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mobileLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md border border-foreground/10 bg-background/70 px-3 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:text-primary",
                    link.label.length > 14 && "col-span-2",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
