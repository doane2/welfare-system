import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TREASURER', 'SECRETARY']

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

// Subtract buffer so we treat tokens as expired 30s BEFORE they actually expire,
// preventing the backend accepting a token the middleware just passed through.
const CLOCK_SKEW_BUFFER_MS = 30_000

function isExpired(decoded: { exp?: number }): boolean {
  if (!decoded.exp) return false
  return Date.now() >= (decoded.exp * 1000) - CLOCK_SKEW_BUFFER_MS
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminRoute     = pathname.startsWith('/admin')
  const isDashboardRoute = pathname.startsWith('/dashboard')

  if (!isAdminRoute && !isDashboardRoute) {
    return NextResponse.next()
  }

  const token = request.cookies.get('welfare_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const decoded = decodeJWT(token)

  if (!decoded || isExpired(decoded)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('welfare_token')
    response.cookies.delete('welfare_role')
    return response
  }

  const role = decoded.role || request.cookies.get('welfare_role')?.value || ''

  if (isAdminRoute) {
    if (ADMIN_ROLES.includes(role)) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isDashboardRoute) {
    if (role === 'MEMBER') return NextResponse.next()
    if (ADMIN_ROLES.includes(role)) return NextResponse.redirect(new URL('/admin', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
}