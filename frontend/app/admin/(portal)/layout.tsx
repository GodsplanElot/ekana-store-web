import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, ClipboardList, LayoutDashboard, LogOut, Users } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { requireStaff, type StaffRole } from "@/lib/server/require-staff";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Admin | Ekana Cosmetics",
    template: "%s | Ekana Admin",
  },
};

const navigation: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: StaffRole[];
}> = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, roles: ["owner", "admin", "support"] },
  { href: "/admin/staff", label: "Staff", icon: Users, roles: ["owner"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const visibleNavigation = navigation.filter((item) => !item.roles || item.roles.includes(staff.role));

  return (
    <div className="min-h-screen bg-[#f4efe7] text-stone-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-hidden border-r border-stone-900/10 bg-[#211814] text-stone-100 lg:flex lg:flex-col">
        <BrandLogo
          variant="watermark"
          sizes="320px"
          className="absolute -bottom-20 -left-24 size-80 opacity-[0.055]"
        />
        <div className="relative border-b border-white/10 px-7 py-7">
          <Link href="/admin" className="flex items-center gap-3" aria-label="Ekana admin overview">
            <BrandLogo
              variant="lockup"
              surface="ink"
              sizes="46px"
              markClassName="size-12"
              textClassName="[&_span:first-child]:text-white [&_span:last-child]:text-stone-400"
            />
          </Link>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d9aaa3]">
            Operations
          </p>
        </div>

        <nav aria-label="Admin navigation" className="relative flex-1 space-y-1 px-4 py-6">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="flex items-center gap-3 rounded-sm px-3 py-3 text-sm text-stone-300 transition hover:bg-white/10 hover:text-white" href={item.href} key={item.href}>
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-white/10 p-4">
          <div className="mb-4 px-3">
            <p className="truncate text-sm font-medium text-white">{staff.displayName}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d9aaa3]">{staff.role}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-stone-400 transition hover:bg-white/10 hover:text-white" type="submit">
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-stone-900/10 bg-[#f4efe7]/95 px-4 py-4 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3" aria-label="Ekana admin overview">
              <BrandLogo
                variant="lockup"
                surface="ivory"
                sizes="40px"
                markClassName="size-10"
                textClassName="[&_span:first-child]:text-stone-950 [&_span:last-child]:text-stone-500"
              />
            </Link>
            <form action="/auth/signout" method="post">
              <button aria-label="Sign out" className="grid size-10 place-items-center border border-stone-900/15" type="submit"><LogOut className="size-4" /></button>
            </form>
          </div>
          <nav aria-label="Admin navigation" className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {visibleNavigation.map((item) => <Link className="whitespace-nowrap border border-stone-900/15 bg-white/50 px-3 py-2 text-xs font-medium" href={item.href} key={item.href}>{item.label}</Link>)}
          </nav>
        </header>

        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
