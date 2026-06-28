import type { Metadata } from "next"
import { LoginForm } from "@/components/admin/login-form"

export const metadata: Metadata = {
  title: "Staff sign in | Ekana Cosmetics",
  description: "Secure staff access to Ekana Cosmetics operations.",
}

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f3eee8] px-5 py-12 text-stone-950">
      <div aria-hidden="true" className="absolute -left-24 top-16 size-72 rounded-full bg-[#caa7a0]/30 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-20 bottom-0 size-80 rounded-full bg-[#d9c59d]/35 blur-3xl" />

      <section className="relative w-full max-w-md border border-stone-900/15 bg-[#fffdf9]/90 p-7 shadow-[0_28px_80px_rgba(45,35,30,0.14)] backdrop-blur md:p-10">
        <div className="mb-10 flex items-center justify-between border-b border-stone-900/15 pb-5">
          <span className="font-serif text-xl tracking-wide">EKANA</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">Staff portal</span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Private workspace</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">Welcome back.</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">Sign in with your approved staff account to manage products and customer orders.</p>

        <LoginForm initialError={error} />
      </section>
    </main>
  )
}
