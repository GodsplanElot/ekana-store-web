import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/server/admin-auth"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders: data })
}
