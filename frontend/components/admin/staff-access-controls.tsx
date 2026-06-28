"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Save } from "lucide-react"
import type { StaffRole } from "@/lib/server/require-staff"

export function StaffAccessControls({ id, initialRole, initialActive, isCurrentUser }: { id: string; initialRole: StaffRole; initialActive: boolean; isCurrentUser: boolean }) {
  const router = useRouter()
  const [role, setRole] = useState(initialRole)
  const [isActive, setIsActive] = useState(initialActive)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState("")
  const changed = role !== initialRole || isActive !== initialActive

  async function save() {
    setError("")
    setIsPending(true)
    const response = await fetch("/api/admin/staff", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, role, isActive }) })
    const result = await response.json()
    setIsPending(false)
    if (!response.ok) { setError(result.error ?? "Access could not be updated"); return }
    router.refresh()
  }

  return <div><div className="flex flex-wrap items-center justify-end gap-2"><select aria-label="Staff role" className="h-9 border border-stone-900/15 bg-white px-2 text-xs capitalize" disabled={isCurrentUser || isPending} onChange={(event) => setRole(event.target.value as StaffRole)} value={role}>{["owner", "admin", "inventory", "support"].map((value) => <option key={value}>{value}</option>)}</select><label className="flex h-9 items-center gap-2 border border-stone-900/15 bg-white px-3 text-xs"><input checked={isActive} disabled={isCurrentUser || isPending} onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />Active</label><button aria-label="Save staff access" className="grid size-9 place-items-center bg-stone-950 text-white disabled:opacity-30" disabled={!changed || isPending || isCurrentUser} onClick={save} type="button">{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}</button></div>{isCurrentUser ? <p className="mt-2 text-right text-[10px] text-stone-400">Current account</p> : null}{error ? <p className="mt-2 text-right text-xs text-red-700">{error}</p> : null}</div>
}
