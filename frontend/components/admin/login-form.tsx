"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type LoginFormProps = {
  initialError?: string
}

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(initialError ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError("The email or password is incorrect.")
        return
      }

      router.replace("/admin")
      router.refresh()
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600" htmlFor="email">Staff email</label>
        <input autoComplete="email" className="h-12 w-full rounded-sm border border-stone-300 bg-white px-4 text-sm outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10" id="email" name="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600" htmlFor="password">Password</label>
        <input autoComplete="current-password" className="h-12 w-full rounded-sm border border-stone-300 bg-white px-4 text-sm outline-none transition focus:border-stone-950 focus:ring-2 focus:ring-stone-950/10" id="password" minLength={8} name="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      </div>

      {error ? <p aria-live="polite" className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}

      <button className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
        {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  )
}
