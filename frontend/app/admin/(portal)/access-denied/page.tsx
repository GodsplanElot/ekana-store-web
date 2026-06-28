import Link from "next/link"
import { LockKeyhole } from "lucide-react"

export default function AccessDeniedPage() {
  return (
    <section className="grid min-h-[80vh] place-items-center px-5 py-12">
      <div className="max-w-md border border-stone-900/15 bg-white p-8 text-center shadow-sm">
        <LockKeyhole className="mx-auto size-8 text-[#8b5552]" />
        <h1 className="mt-5 font-serif text-3xl">Access restricted</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">Your staff role does not permit this action. Ask the store owner if your responsibilities have changed.</p>
        <Link className="mt-7 inline-flex h-11 items-center justify-center bg-stone-950 px-5 text-sm font-semibold text-white" href="/admin">Return to overview</Link>
      </div>
    </section>
  )
}
