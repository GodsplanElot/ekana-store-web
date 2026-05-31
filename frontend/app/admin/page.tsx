import { Providers } from "@/components/providers"

export const metadata = {
  title: "Admin - Ekana Cosmetics",
  description: "Admin setup notes for Ekana Cosmetics.",
}

const capabilities = [
  "Create or update products through POST /api/admin/products",
  "Review submitted orders through GET /api/admin/orders",
  "Protect admin APIs with ADMIN_API_TOKEN or Supabase user tokens plus ADMIN_EMAILS",
  "Manage product images in Cloudinary and store optimized URLs in Supabase",
]

export default function AdminPage() {
  return (
    <Providers>
      <section className="py-10 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Admin
          </p>
          <h1 className="font-serif text-3xl text-foreground md:text-5xl">
            Backend Control Surface
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The MVP backend exposes protected JSON endpoints for products and
            orders. A full visual dashboard can now be built on top of these
            contracts without changing the storefront flow.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {capabilities.map((capability) => (
              <li key={capability} className="rounded-lg border border-border p-4">
                {capability}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Providers>
  )
}
