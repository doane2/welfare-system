import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TREASURER', 'SECRETARY']
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/accept-invite']

function decodeJWT(token: string): { id?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

const CLOCK_SKEW_BUFFER_MS = 30_000
function isExpired(decoded: { exp?: number }): boolean {
  if (!decoded.exp) return false
  return Date.now() >= decoded.exp * 1000 - CLOCK_SKEW_BUFFER_MS
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminRoute = pathname.startsWith('/admin')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  if (!isAdminRoute && !isDashboardRoute) return NextResponse.next()

  const token = request.cookies.get('welfare_token')?.value
  const isPublicAdmin = PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (isPublicAdmin) {
    // Signed-in admins visiting the admin login page go straight to their dashboard
    if (pathname.startsWith('/admin/login') && token) {
      const d = decodeJWT(token)
      if (d && !isExpired(d) && ADMIN_ROLES.includes(d.role || '')) return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  const loginPath = isAdminRoute ? '/admin/login' : '/login'
  if (!token) return NextResponse.redirect(new URL(loginPath, request.url))

  const decoded = decodeJWT(token)
  if (!decoded || isExpired(decoded)) {
    const response = NextResponse.redirect(new URL(loginPath, request.url))
    response.cookies.delete('welfare_token')
    response.cookies.delete('welfare_role')
    return response
  }

  const role = decoded.role || request.cookies.get('welfare_role')?.value || ''

  if (isAdminRoute) {
    if (ADMIN_ROLES.includes(role)) return NextResponse.next()
    if (role === 'MEMBER') return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.redirect(new URL(loginPath, request.url))
  }

  if (role === 'MEMBER') return NextResponse.next()
  if (ADMIN_ROLES.includes(role)) return NextResponse.redirect(new URL('/admin', request.url))
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
}
