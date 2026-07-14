import { NextResponse } from "next/server"
import { products as seedProducts } from "@/lib/products"
import { mapSupabaseProduct } from "@/lib/server/products"
import { createSupabasePublicClient } from "@/lib/supabase/public"

export async function GET() {
  const supabase = createSupabasePublicClient()

  if (!supabase) {
    return NextResponse.json({ products: seedProducts, source: "seed" })
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    products: data.map((product) => mapSupabaseProduct(product)),
    source: "supabase",
  })
}
