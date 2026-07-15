import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { formatNaira } from "@/lib/money"
import { getConfiguredAppOrigin } from "@/lib/server/app-url"
import { sendOrderEmails } from "@/lib/server/email"
import { initializePaystackPayment } from "@/lib/server/paystack"
import { mapSupabaseProduct } from "@/lib/server/products"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { createSupabasePublicClient } from "@/lib/supabase/public"

const checkoutSchema = z.object({
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(5),
    address: z.string().min(3),
    city: z.string().min(2),
    notes: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1),
})

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout details." }, { status: 400 })
  }

  const appOrigin = getConfiguredAppOrigin()
  if (!appOrigin) {
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable." },
      { status: 503 }
    )
  }

  const publicSupabase = createSupabasePublicClient()
  const adminSupabase = createSupabaseAdmin()

  if (!publicSupabase || !adminSupabase) {
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable." },
      { status: 503 }
    )
  }

  const productIds = parsed.data.items.map((item) => item.productId)
  const { data: productRows, error: productError } = await publicSupabase
    .from("products")
    .select("*")
    .in("id", productIds)
    .eq("is_active", true)

  if (productError || !productRows) {
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable." },
      { status: 503 }
    )
  }

  const catalogProducts = productRows.map((product) =>
    mapSupabaseProduct(product)
  )

  const resolvedItems = parsed.data.items.map((item) => {
    const product = catalogProducts.find((p) => p.id === item.productId)
    if (!product || !product.active || !product.inStock) return null
    if (product.inventoryCount > 0 && item.quantity > product.inventoryCount) return null
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity,
    }
  })

  if (resolvedItems.some((item) => item === null)) {
    return NextResponse.json(
      { error: "One or more cart items are unavailable." },
      { status: 400 }
    )
  }

  const items = resolvedItems.filter((item) => item !== null)
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const deliveryFee = subtotal >= 20000 ? 0 : 2500
  const total = subtotal + deliveryFee
  const reference = `ekana_${Date.now()}_${randomUUID().slice(0, 8)}`
  const customerName = `${parsed.data.customer.firstName} ${parsed.data.customer.lastName}`
  const callbackUrl = new URL(
    `/checkout?reference=${encodeURIComponent(reference)}`,
    appOrigin
  ).toString()

  const { error: orderError } = await adminSupabase.from("orders").insert({
    reference,
    customer_email: parsed.data.customer.email,
    customer_name: customerName,
    customer_phone: parsed.data.customer.phone,
    delivery_address: parsed.data.customer.address,
    delivery_city: parsed.data.customer.city,
    order_notes: parsed.data.customer.notes,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    payment_status: "pending",
    fulfillment_status: "new",
    paystack_reference: reference,
    items,
  })

  if (orderError) {
    return NextResponse.json(
      { error: "Order could not be created." },
      { status: 500 }
    )
  }

  const payment = await initializePaystackPayment({
    email: parsed.data.customer.email,
    amount: total * 100,
    reference,
    callbackUrl,
    metadata: {
      customerName,
      items,
    },
  })

  await sendOrderEmails({
    customerEmail: parsed.data.customer.email,
    customerName,
    reference,
    total: formatNaira(total),
  })

  return NextResponse.json({
    ok: true,
    reference,
    total,
    payment,
  })
}
