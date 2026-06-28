"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Power } from "lucide-react"

export function DeactivateProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function deactivate() {
    if (!window.confirm(`Remove ${name} from the storefront? The product record will be kept.`)) return
    setIsPending(true)
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" })
    setIsPending(false)
    if (!response.ok) {
      window.alert("The product could not be deactivated.")
      return
    }
    router.refresh()
  }

  return <button aria-label={`Deactivate ${name}`} className="grid size-9 place-items-center border border-stone-900/15 text-stone-500 transition hover:border-red-800 hover:text-red-800 disabled:opacity-50" disabled={isPending} onClick={deactivate} type="button">{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Power className="size-4" />}</button>
}
