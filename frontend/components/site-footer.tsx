import Link from "next/link";
import { Instagram } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="font-serif text-xl tracking-tight text-card-foreground"
            >
              Ekana Cosmetics
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Glosses, liners, and lashes made to feel luxurious, effortless,
              and authentic.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-card-foreground mb-4">
              Shop
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  href="/shop"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Glosses"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Glosses
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Lip%20Liners"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Lip Liners
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Lashes"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Lashes
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Lash%20Trays"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Lash Trays
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-card-foreground mb-4">
              Company
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  rel="noreferrer"
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://pinterest.com"
                  rel="noreferrer"
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Pinterest
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-card-foreground mb-4">
              Support
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              </li>
              <li>
                <Link href="/shipping-returns" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Shipping & Returns</Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            2026 Ekana Cosmetics. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://instagram.com"
              rel="noreferrer"
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://pinterest.com"
              rel="noreferrer"
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Pinterest
            </a>
            <Link href="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
