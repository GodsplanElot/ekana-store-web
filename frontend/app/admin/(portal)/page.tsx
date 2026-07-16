import Link from "next/link"
import { ArrowUpRight, Boxes, ClipboardList, ShieldCheck } from "lucide-react"
import { requireStaff } from "@/lib/server/require-staff"

const actions = [
  { href: "/admin/products", label: "Manage products", description: "Create listings, update stock and control storefront visibility.", icon: Boxes },
  { href: "/admin/orders", label: "Review orders", description: "Track payments and move customer orders through fulfilment.", icon: ClipboardList },
]

export default async function AdminPage() {
  const staff = await requireStaff()

  return (
    <section className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 border-b border-stone-900/15 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Store operations</p>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">Good to see you, {staff.displayName.split(" ")[0]}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Manage the catalogue and keep customer orders moving from one secure workspace.</p>
          </div>
          <div className="flex items-center gap-2 self-start border border-emerald-900/15 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Authenticated as {staff.role}
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link className="group relative min-h-56 overflow-hidden border border-stone-900/15 bg-[#fffdf9] p-7 transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(50,40,35,0.09)]" href={action.href} key={action.href}>
                <span className="absolute right-5 top-4 font-serif text-6xl text-stone-900/5">0{index + 1}</span>
                <Icon aria-hidden="true" className="size-6 text-[#8b5552]" />
                <h2 className="mt-12 font-serif text-2xl">{action.label}</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">{action.description}</p>
                <ArrowUpRight aria-hidden="true" className="absolute bottom-7 right-7 size-5 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
