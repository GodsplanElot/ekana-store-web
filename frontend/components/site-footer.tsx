import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="font-serif text-xl tracking-tight text-card-foreground">
              ROSETTE
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Clean, cruelty-free beauty crafted for every skin tone. Because you deserve the best.
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
                  href="/shop?category=Face"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Face
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Eyes"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Eyes
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Lips"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Lips
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Skincare"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skincare
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
                <span className="text-sm text-muted-foreground">Our Story</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Clean Beauty Pledge</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Careers</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Press</span>
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
                <span className="text-sm text-muted-foreground">Contact</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Shipping & Returns</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">FAQ</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Shade Finder</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            2026 ROSETTE Beauty. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-muted-foreground">Privacy Policy</span>
            <span className="text-xs text-muted-foreground">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
