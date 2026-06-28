import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { formatNaira } from "@/lib/money"
import { requireStaff } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

type OrderRow = {
  reference: string
  customer_name: string
  customer_email: string
  total: number
  payment_status: string
  fulfillment_status: string
  created_at: string
}

type OrdersPageProps = { searchParams: Promise<{ q?: string; payment?: string; fulfillment?: string }> }

function badgeClass(status: string) {
  if (["paid", "delivered"].includes(status)) return "bg-emerald-50 text-emerald-800"
  if (["failed", "cancelled"].includes(status)) return "bg-red-50 text-red-800"
  if (["shipped", "processing"].includes(status)) return "bg-blue-50 text-blue-800"
  return "bg-amber-50 text-amber-800"
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  await requireStaff(["owner", "admin", "support"])
  const filters = await searchParams
  const supabase = createSupabaseAdmin()
  const { data, error } = supabase ? await supabase.from("orders").select("reference,customer_name,customer_email,total,payment_status,fulfillment_status,created_at").order("created_at", { ascending: false }) : { data: null, error: new Error("Supabase is not configured") }
  const query = filters.q?.trim().toLowerCase() ?? ""
  const orders = ((data ?? []) as OrderRow[]).filter((order) => {
    const matchesQuery = !query || order.reference.toLowerCase().includes(query) || order.customer_name.toLowerCase().includes(query) || order.customer_email.toLowerCase().includes(query)
    return matchesQuery && (!filters.payment || filters.payment === "all" || order.payment_status === filters.payment) && (!filters.fulfillment || filters.fulfillment === "all" || order.fulfillment_status === filters.fulfillment)
  })

  return <section className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12"><div className="mx-auto max-w-6xl">
    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Fulfilment</p><h1 className="mt-3 font-serif text-4xl">Orders</h1><p className="mt-2 text-sm text-stone-600">{orders.length} orders in this view</p></div>
    <form className="mt-8 grid gap-3 border border-stone-900/15 bg-[#fffdf9] p-4 md:grid-cols-[1fr_170px_180px_auto]" method="get">
      <label className="relative"><span className="sr-only">Search orders</span><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-stone-400" /><input className="h-11 w-full border border-stone-900/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-stone-950" defaultValue={filters.q} name="q" placeholder="Reference or customer" /></label>
      <select aria-label="Payment status" className="h-11 border border-stone-900/15 bg-white px-3 text-sm" defaultValue={filters.payment ?? "all"} name="payment"><option value="all">Any payment</option>{["pending", "paid", "failed", "refunded"].map((status) => <option key={status}>{status}</option>)}</select>
      <select aria-label="Fulfilment status" className="h-11 border border-stone-900/15 bg-white px-3 text-sm" defaultValue={filters.fulfillment ?? "all"} name="fulfillment"><option value="all">Any fulfilment</option>{["new", "processing", "shipped", "delivered", "cancelled"].map((status) => <option key={status}>{status}</option>)}</select>
      <button className="h-11 bg-stone-950 px-5 text-sm font-semibold text-white" type="submit">Filter</button>
    </form>
    {error ? <div className="mt-6 border-l-2 border-red-700 bg-red-50 p-4 text-sm text-red-800">Orders could not be loaded. Check the Supabase configuration.</div> : null}
    <div className="mt-5 overflow-hidden border border-stone-900/15 bg-[#fffdf9]">
      <div className="hidden grid-cols-[minmax(230px,1fr)_150px_120px_130px_130px_44px] border-b border-stone-900/10 bg-stone-100/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500 md:grid"><span>Customer</span><span>Date</span><span>Total</span><span>Payment</span><span>Fulfilment</span><span /></div>
      {orders.length ? orders.map((order) => <Link className="grid gap-3 border-b border-stone-900/10 p-4 transition last:border-0 hover:bg-stone-50 md:grid-cols-[minmax(230px,1fr)_150px_120px_130px_130px_44px] md:items-center md:px-5" href={`/admin/orders/${encodeURIComponent(order.reference)}`} key={order.reference}>
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{order.customer_name}</p><p className="mt-1 truncate text-xs text-stone-500">{order.reference}</p></div>
        <p className="text-sm text-stone-600">{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(order.created_at))}</p>
        <p className="text-sm font-medium">{formatNaira(order.total)}</p>
        <p><span className={`inline-flex px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(order.payment_status)}`}>{order.payment_status}</span></p>
        <p><span className={`inline-flex px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(order.fulfillment_status)}`}>{order.fulfillment_status}</span></p>
        <ArrowRight className="hidden size-4 text-stone-400 md:block" />
      </Link>) : <div className="px-5 py-16 text-center"><p className="font-serif text-2xl">No orders found</p><p className="mt-2 text-sm text-stone-500">Adjust the filters to widen this view.</p></div>}
    </div>
  </div></section>
}
