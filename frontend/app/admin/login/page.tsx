import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Staff sign in | Ekana Cosmetics",
  description: "Secure staff access to Ekana Cosmetics operations.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f4efe7] px-5 py-12 text-stone-950">
      <BrandLogo
        variant="watermark"
        sizes="560px"
        className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 opacity-[0.055]"
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[#8b5552]/30" />

      <section className="relative w-full max-w-md overflow-hidden border border-stone-900/15 bg-[#fffaf2]/95 p-7 shadow-[0_28px_80px_rgba(45,35,30,0.14)] backdrop-blur md:p-10">
        <BrandLogo
          variant="watermark"
          sizes="240px"
          className="absolute -right-20 -top-20 size-60 opacity-[0.06]"
        />
        <div className="relative mb-10 flex items-center justify-between border-b border-stone-900/15 pb-5">
          <BrandLogo
            variant="lockup"
            surface="ivory"
            sizes="44px"
            markClassName="size-11"
            textClassName="[&_span:first-child]:text-stone-950 [&_span:last-child]:text-stone-500"
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">Staff portal</span>
        </div>

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Private workspace</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">Welcome back.</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">Sign in with your approved staff account to manage products and customer orders.</p>

          <LoginForm initialError={error} nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
