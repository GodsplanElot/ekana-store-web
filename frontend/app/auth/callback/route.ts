import { NextResponse } from "next/server"
import { getSafeAdminPath } from "@/lib/auth/safe-admin-path"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = getSafeAdminPath(url.searchParams.get("next"))

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin))
    }
  }

  const loginUrl = new URL("/admin/login", url.origin)
  loginUrl.searchParams.set("error", "Authentication could not be completed")
  return NextResponse.redirect(loginUrl)
}
