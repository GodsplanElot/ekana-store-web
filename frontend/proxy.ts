import { NextResponse, type NextRequest } from "next/server"
import { getSafeAdminPath } from "@/lib/auth/safe-admin-path"
import { isLaunchGateActive } from "@/lib/launch"
import { updateSupabaseSession } from "@/lib/supabase/proxy"

function redirectWithSessionCookies(url: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
  return redirectResponse
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")

  if (isAdminRoute) {
    const { response, user } = await updateSupabaseSession(request)
    const isLoginRoute = pathname === "/admin/login"

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
        getSafeAdminPath(pathname + request.nextUrl.search)
      )
      return redirectWithSessionCookies(loginUrl, response)
    }

    return response
  }

  const bypassesLaunchGate =
    pathname === "/launch" ||
    pathname.startsWith("/launch/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")

  if (
    !bypassesLaunchGate &&
    (request.method === 'GET' || request.method === 'HEAD') &&
    isLaunchGateActive()
  ) {
    const launchUrl = request.nextUrl.clone()
    launchUrl.pathname = "/launch"
    return NextResponse.rewrite(launchUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
