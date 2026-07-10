import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand-logo";
import { SetPasswordForm } from "@/components/admin/set-password-form";

export const metadata: Metadata = { title: "Set staff password | Ekana Cosmetics" };

export default function SetPasswordPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f4efe7] px-5 py-12 text-stone-950">
      <BrandLogo
        variant="watermark"
        sizes="520px"
        className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 opacity-[0.055]"
      />
      <section className="relative w-full max-w-md overflow-hidden border border-stone-900/15 bg-[#fffaf2]/95 p-7 shadow-[0_28px_80px_rgba(45,35,30,0.14)] md:p-10">
        <BrandLogo
          variant="watermark"
          sizes="240px"
          className="absolute -right-20 -top-20 size-60 opacity-[0.06]"
        />
        <div className="relative">
          <BrandLogo
            variant="lockup"
            surface="ivory"
            sizes="44px"
            markClassName="size-11"
            textClassName="[&_span:first-child]:text-stone-950 [&_span:last-child]:text-stone-500"
          />
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Staff invitation</p>
          <h1 className="mt-3 font-serif text-4xl">Secure your account.</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">Create a unique password with at least 12 characters to finish activating your staff access.</p>
          <SetPasswordForm />
        </div>
      </section>
    </main>
  );
}
