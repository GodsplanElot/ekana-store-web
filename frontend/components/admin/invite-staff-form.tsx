"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, UserPlus } from "lucide-react"

export function InviteStaffForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsPending(true)
    const form = new FormData(event.currentTarget)
    const response = await fetch("/api/admin/staff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: form.get("displayName"), email: form.get("email"), role: form.get("role") }) })
    const result = await response.json()
    setIsPending(false)
    if (!response.ok) { setError(result.error ?? "Invitation failed"); return }
    event.currentTarget.reset()
    router.refresh()
  }

  const fieldClass = "h-11 w-full border border-stone-900/20 bg-white px-3 text-sm outline-none focus:border-stone-950"
  return <form className="border border-stone-900/15 bg-[#fffdf9] p-5 sm:p-6" onSubmit={submit}><div className="flex items-center gap-3"><UserPlus className="size-5 text-[#8b5552]" /><div><h2 className="font-serif text-xl">Invite staff</h2><p className="mt-1 text-xs text-stone-500">Supabase will email a secure account invitation.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]"><input aria-label="Display name" className={fieldClass} name="displayName" placeholder="Display name" required /><input aria-label="Email" className={fieldClass} name="email" placeholder="staff@example.com" required type="email" /><select aria-label="Role" className={fieldClass} defaultValue="inventory" name="role"><option value="admin">Admin</option><option value="inventory">Inventory</option><option value="support">Support</option></select><button className="flex h-11 items-center justify-center gap-2 bg-stone-950 px-5 text-sm font-semibold text-white disabled:opacity-60" disabled={isPending} type="submit">{isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}{isPending ? "Sending..." : "Send invite"}</button></div>{error ? <p className="mt-4 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}</form>
}
