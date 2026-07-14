import { NextResponse, type NextRequest } from "next/server"
import { getSafeAdminPath } from "@/lib/auth/safe-admin-path"
import { updateSupabaseSession } from "@/lib/supabase/proxy"

function redirectWithSessionCookies(url: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
  return redirectResponse
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request)
  const isLoginRoute = request.nextUrl.pathname === "/admin/login"

  if (user && isLoginRoute) {
    const adminUrl = request.nextUrl.clone()
    adminUrl.pathname = "/admin"
    adminUrl.search = ""
    return redirectWithSessionCookies(adminUrl, response)
  }

  if (!user && !isLoginRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/admin/login"
    loginUrl.search = ""
    loginUrl.searchParams.set(
      "next",
      getSafeAdminPath(request.nextUrl.pathname + request.nextUrl.search)
    )
    return redirectWithSessionCookies(loginUrl, response)
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*"],
}
