"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Save, ShieldCheck } from "lucide-react"

const transitions: Record<string, string[]> = {
  new: ["new", "processing"],
  processing: ["processing", "shipped"],
  shipped: ["shipped", "delivered"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
}

type OrderStatusFormProps = {
  reference: string
  initialPaymentStatus: string
  initialFulfillmentStatus: string
}

export function OrderStatusForm({ reference, initialPaymentStatus, initialFulfillmentStatus }: OrderStatusFormProps) {
  const router = useRouter()
  const [fulfillmentStatus, setFulfillmentStatus] = useState(initialFulfillmentStatus)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSaving(true)
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reference,
        fulfillmentStatus,
      }),
    })
    const result = await response.json()
    setIsSaving(false)
    if (!response.ok) {
      setError(result.error ?? "Order status could not be updated")
      return
    }
    router.refresh()
  }

  const labelClass = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500"
  const selectClass = "h-11 w-full border border-stone-900/20 bg-white px-3 text-sm capitalize"

  return <form className="border border-stone-900/15 bg-[#fffdf9] p-5" onSubmit={submit}>
    <h2 className="font-serif text-xl">Order status</h2>
    <div className="mt-5 space-y-4">
      <div><label className={labelClass} htmlFor="fulfillment">Fulfilment</label><select className={selectClass} id="fulfillment" onChange={(event) => setFulfillmentStatus(event.target.value)} value={fulfillmentStatus}>{(transitions[initialFulfillmentStatus] ?? [initialFulfillmentStatus]).map((status) => <option key={status}>{status}</option>)}</select></div>
      <div>
        <p className={labelClass}>Payment</p>
        <div className="border border-stone-900/15 bg-stone-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold capitalize text-stone-900">{initialPaymentStatus}</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b5552]"><ShieldCheck className="size-3.5" />Paystack managed</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-500">Payment status changes only after verified Paystack reconciliation.</p>
        </div>
      </div>
    </div>
    {error ? <p className="mt-4 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
    <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 bg-stone-950 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{isSaving ? "Saving..." : "Save status"}</button>
  </form>
}
