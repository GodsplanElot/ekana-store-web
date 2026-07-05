import { NextResponse, type NextRequest } from 'next/server'

import { isLaunchGateActive } from '@/lib/launch'
import { updateSupabaseSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  if (isAdminRoute) {
    const { response, user } = await updateSupabaseSession(request)
    const isLoginRoute = pathname === '/admin/login'

    if (!user && !isLoginRoute) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  const bypassesLaunchGate =
    pathname === '/launch' ||
    pathname.startsWith('/launch/') ||
    pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')

  if (
    !bypassesLaunchGate &&
    (request.method === 'GET' || request.method === 'HEAD') &&
    isLaunchGateActive()
  ) {
    const launchUrl = request.nextUrl.clone()
    launchUrl.pathname = '/launch'
    return NextResponse.rewrite(launchUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
