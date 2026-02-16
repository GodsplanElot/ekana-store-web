"use client";

import Link from "next/link";
import { ShoppingBag, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useState } from "react";

export function SiteHeader() {
  const { totalItems, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile menu button */}
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

          {/* Navigation - Desktop */}
          <nav
            className="hidden lg:flex items-center gap-8"
            aria-label="Main navigation"
          >
            <Link
              href="/"
              className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors"
            >
              Home
            </Link>
            <Link
              href="/shop"
              className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors"
            >
              Shop
            </Link>
            <Link
              href="/shop?category=Face"
              className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors"
            >
              Face
            </Link>
            <Link
              href="/shop?category=Eyes"
              className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors"
            >
              Eyes
            </Link>
            <Link
              href="/shop?category=Lips"
              className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors"
            >
              Lips
            </Link>
          </nav>

          {/* Logo */}
          <Link
            href="/"
            className="font-serif text-2xl tracking-tight text-foreground"
          >
            Ekana's Cosmetic
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Search">
              <Search className="h-5 w-5" />
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
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav
            className="lg:hidden border-t border-border py-4"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/shop"
                className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Shop All
              </Link>
              <Link
                href="/shop?category=Face"
                className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Face
              </Link>
              <Link
                href="/shop?category=Eyes"
                className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Eyes
              </Link>
              <Link
                href="/shop?category=Lips"
                className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Lips
              </Link>
              <Link
                href="/shop?category=Skincare"
                className="text-sm font-medium tracking-wide text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Skincare
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
