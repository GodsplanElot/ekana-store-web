import { NextResponse } from "next/server"
import { mapSupabaseProduct } from "@/lib/server/products"
import { createSupabasePublicClient } from "@/lib/supabase/public"

export async function GET() {
  const supabase = createSupabasePublicClient()

  if (!supabase) {
    return NextResponse.json(
      { error: "Catalogue service is not configured." },
      { status: 503 }
    )
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: "Catalogue could not be loaded." },
      { status: 503 }
    )
  }

  return NextResponse.json({
    products: data.map((product) => mapSupabaseProduct(product)),
    source: "supabase",
  })
}
