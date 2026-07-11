import Link from "next/link";
import { Instagram } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[hsl(var(--brand-panel-border)/0.18)] bg-[hsl(var(--brand-panel))] text-[hsl(var(--brand-panel-foreground))] transition-colors">
      <BrandLogo
        variant="watermark"
        sizes="520px"
        className="absolute -bottom-36 -right-24 size-[520px] opacity-[0.045]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
              aria-label="Ekana Cosmetics home"
            >
              <BrandLogo
                variant="lockup"
                surface="ink"
                sizes="48px"
                markClassName="size-12"
                textClassName="[&_span:first-child]:text-[hsl(var(--brand-panel-foreground))] [&_span:last-child]:text-[hsl(var(--brand-panel-muted))]"
              />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-7 text-[hsl(var(--brand-panel-muted))]">
              Glosses, liners, and lashes made to feel luxurious, effortless, and authentic.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-panel-foreground))]">
              Shop
            </h3>
            <ul className="flex flex-col gap-2.5">
              {[
                ["All Products", "/shop"],
                ["Glosses", "/shop?category=Glosses"],
                ["Lip Liners", "/shop?category=Lip%20Liners"],
                ["Lashes", "/shop?category=Lashes"],
                ["Lash Trays", "/shop?category=Lash%20Trays"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-panel-foreground))]">
              Company
            </h3>
            <ul className="flex flex-col gap-2.5">
              {[
                ["About", "/about"],
                ["FAQ", "/faq"],
                ["Contact", "/contact"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="https://instagram.com" rel="noreferrer" target="_blank" className="text-sm text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://pinterest.com" rel="noreferrer" target="_blank" className="text-sm text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]">
                  Pinterest
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-panel-foreground))]">
              Support
            </h3>
            <ul className="flex flex-col gap-2.5">
              {[
                ["Contact", "/contact"],
                ["Shipping & Returns", "/shipping-returns"],
                ["Privacy Policy", "/privacy-policy"],
                ["Terms", "/terms"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[hsl(var(--brand-panel-border)/0.22)] pt-8 md:flex-row">
          <p className="text-xs text-[hsl(var(--brand-panel-muted))]">
            2026 Ekana Cosmetics. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <a
              href="https://instagram.com"
              rel="noreferrer"
              target="_blank"
              className="text-xs text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://pinterest.com"
              rel="noreferrer"
              target="_blank"
              className="text-xs text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]"
            >
              Pinterest
            </a>
            <Link href="/privacy-policy" className="text-xs text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-[hsl(var(--brand-panel-muted))] transition hover:text-[hsl(var(--brand-panel-foreground))]">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
