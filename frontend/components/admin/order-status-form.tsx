"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Save } from "lucide-react"

const transitions: Record<string, string[]> = {
  new: ["new", "processing", "cancelled"],
  processing: ["processing", "shipped", "cancelled"],
  shipped: ["shipped", "delivered"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
}

type OrderStatusFormProps = {
  reference: string
  initialPaymentStatus: string
  initialFulfillmentStatus: string
  canEditPayment: boolean
}

export function OrderStatusForm({ reference, initialPaymentStatus, initialFulfillmentStatus, canEditPayment }: OrderStatusFormProps) {
  const router = useRouter()
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus)
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
      body: JSON.stringify({ reference, fulfillmentStatus, ...(canEditPayment ? { paymentStatus } : {}) }),
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
      <div><label className={labelClass} htmlFor="payment">Payment</label><select className={selectClass} disabled={!canEditPayment} id="payment" onChange={(event) => setPaymentStatus(event.target.value)} value={paymentStatus}>{["pending", "paid", "failed", "refunded"].map((status) => <option key={status}>{status}</option>)}</select>{!canEditPayment ? <p className="mt-2 text-xs text-stone-500">Only owners and admins can change payment status.</p> : null}</div>
    </div>
    {error ? <p className="mt-4 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
    <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 bg-stone-950 text-sm font-semibold text-white disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{isSaving ? "Saving…" : "Save status"}</button>
  </form>
}
