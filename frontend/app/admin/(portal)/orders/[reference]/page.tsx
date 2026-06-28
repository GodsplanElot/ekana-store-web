import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react"
import { OrderStatusForm } from "@/components/admin/order-status-form"
import { formatNaira } from "@/lib/money"
import { requireStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

type OrderItem = { productId: string; name: string; price: number; quantity: number; lineTotal: number }
type OrderRow = {
  reference: string
  customer_email: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  delivery_city: string
  order_notes: string | null
  subtotal: number
  delivery_fee: number
  total: number
  payment_status: string
  fulfillment_status: string
  paystack_reference: string | null
  items: OrderItem[]
  created_at: string
}
type OrderPageProps = { params: Promise<{ reference: string }> }

export default async function OrderPage({ params }: OrderPageProps) {
  const staff = await requireStaff(["owner", "admin", "support"])
  const { reference } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) notFound()
  const { data } = await supabase.from("orders").select("*").eq("reference", reference).maybeSingle()
  if (!data) notFound()
  const order = data as OrderRow

  return <section className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12"><div className="mx-auto max-w-6xl">
    <Link className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950" href="/admin/orders"><ArrowLeft className="size-4" />Back to orders</Link>
    <div className="mt-7 flex flex-col justify-between gap-4 border-b border-stone-900/15 pb-7 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Order detail</p><h1 className="mt-3 break-all font-serif text-3xl md:text-4xl">{order.reference}</h1></div><p className="text-sm text-stone-500">Placed {new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeStyle: "short" }).format(new Date(order.created_at))}</p></div>

    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="border border-stone-900/15 bg-[#fffdf9] p-5 sm:p-7"><h2 className="font-serif text-2xl">Items</h2><div className="mt-5 divide-y divide-stone-900/10">{order.items.map((item) => <div className="grid grid-cols-[1fr_auto] gap-4 py-4 first:pt-0 last:pb-0" key={`${item.productId}-${item.name}`}><div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-stone-500">{formatNaira(item.price)} x {item.quantity}</p></div><p className="text-sm font-medium">{formatNaira(item.lineTotal)}</p></div>)}</div><div className="mt-6 space-y-2 border-t border-stone-900/15 pt-5 text-sm"><div className="flex justify-between text-stone-600"><span>Subtotal</span><span>{formatNaira(order.subtotal)}</span></div><div className="flex justify-between text-stone-600"><span>Delivery</span><span>{order.delivery_fee ? formatNaira(order.delivery_fee) : "Free"}</span></div><div className="flex justify-between pt-2 text-base font-semibold"><span>Total</span><span>{formatNaira(order.total)}</span></div></div></section>
        <section className="border border-stone-900/15 bg-[#fffdf9] p-5 sm:p-7"><h2 className="font-serif text-2xl">Customer and delivery</h2><div className="mt-5 grid gap-5 text-sm sm:grid-cols-2"><div><p className="font-semibold">{order.customer_name}</p><p className="mt-3 flex items-center gap-2 text-stone-600"><Mail className="size-4" />{order.customer_email}</p><p className="mt-2 flex items-center gap-2 text-stone-600"><Phone className="size-4" />{order.customer_phone}</p></div><div><p className="flex items-start gap-2 leading-6 text-stone-600"><MapPin className="mt-1 size-4 shrink-0" />{order.delivery_address}, {order.delivery_city}</p>{order.order_notes ? <div className="mt-4 border-l-2 border-[#8b5552] bg-stone-50 p-3 text-stone-600"><span className="font-semibold text-stone-800">Note:</span> {order.order_notes}</div> : null}</div></div></section>
      </div>
      <aside className="space-y-5"><OrderStatusForm canEditPayment={staffHasRole(staff, ["owner", "admin"])} initialFulfillmentStatus={order.fulfillment_status} initialPaymentStatus={order.payment_status} reference={order.reference} /><section className="border border-stone-900/15 bg-[#fffdf9] p-5"><h2 className="font-serif text-xl">Payment reference</h2><p className="mt-3 break-all text-xs leading-5 text-stone-600">{order.paystack_reference ?? "Not available"}</p></section></aside>
    </div>
  </div></section>
}
