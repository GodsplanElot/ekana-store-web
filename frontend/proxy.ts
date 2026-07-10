import { NextResponse, type NextRequest } from "next/server"
import { isDevAuthBypassEnabled } from "@/lib/server/env"
import { updateSupabaseSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request)
  const isLoginRoute = request.nextUrl.pathname === "/admin/login"

  if (isDevAuthBypassEnabled()) {
    if (isLoginRoute) {
      const adminUrl = request.nextUrl.clone()
      adminUrl.pathname = "/admin"
      adminUrl.search = ""
      return NextResponse.redirect(adminUrl)
    }

    return response
  }

  if (!user && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/admin/login"
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*"],
}
