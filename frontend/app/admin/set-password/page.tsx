import type { Metadata } from "next"
import { SetPasswordForm } from "@/components/admin/set-password-form"

export const metadata: Metadata = { title: "Set staff password | Ekana Cosmetics" }

export default function SetPasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f3eee8] px-5 py-12 text-stone-950"><section className="w-full max-w-md border border-stone-900/15 bg-[#fffdf9] p-7 shadow-[0_28px_80px_rgba(45,35,30,0.14)] md:p-10"><p className="font-serif text-xl tracking-wide">EKANA</p><p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Staff invitation</p><h1 className="mt-3 font-serif text-4xl">Secure your account.</h1><p className="mt-3 text-sm leading-6 text-stone-600">Create a unique password with at least 12 characters to finish activating your staff access.</p><SetPasswordForm /></section></main>
}
