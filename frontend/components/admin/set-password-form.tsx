"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export function SetPasswordForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password"))
    const confirmation = String(form.get("confirmation"))
    if (password !== confirmation) { setError("Passwords do not match."); return }
    if (password.length < 12) { setError("Use at least 12 characters."); return }

    setError("")
    setIsPending(true)
    const supabase = createSupabaseBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setIsPending(false)
    if (updateError) { setError("Your password could not be saved. Request a new invitation."); return }
    router.replace("/admin")
    router.refresh()
  }

  const inputClass = "h-12 w-full border border-stone-900/20 bg-white px-4 text-sm outline-none focus:border-stone-950"
  return <form className="mt-8 space-y-4" onSubmit={submit}><div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-stone-600" htmlFor="password">New password</label><input autoComplete="new-password" className={inputClass} id="password" minLength={12} name="password" required type="password" /></div><div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-stone-600" htmlFor="confirmation">Confirm password</label><input autoComplete="new-password" className={inputClass} id="confirmation" minLength={12} name="confirmation" required type="password" /></div>{error ? <p className="bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}<button className="flex h-12 w-full items-center justify-center gap-2 bg-stone-950 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} type="submit">{isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}{isPending ? "Saving..." : "Set password and continue"}</button></form>
}
