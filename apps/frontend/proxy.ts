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

// ── FIX: add 30-second grace period to absorb clock skew between
//         Next.js server and backend token issuer. Without this, tokens
//         that are within a few seconds of expiry cause intermittent
//         redirect loops — the middleware sees them as expired on some
//         requests but the backend still accepts them. ─────────────────────
const CLOCK_SKEW_BUFFER_MS = 30_000   // 30 seconds

function isExpired(decoded: { exp?: number }): boolean {
  if (!decoded.exp) return false
  return Date.now() >= (decoded.exp * 1000) + CLOCK_SKEW_BUFFER_MS
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminRoute     = pathname.startsWith('/admin')
  const isDashboardRoute = pathname.startsWith('/dashboard')

  if (!isAdminRoute && !isDashboardRoute) {
    return NextResponse.next()
  }

  // ── Get token ─────────────────────────────────────────────────────────────
  const token = request.cookies.get('welfare_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ── Decode ────────────────────────────────────────────────────────────────
  const decoded = decodeJWT(token)

  if (!decoded || isExpired(decoded)) {
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('welfare_token')
    response.cookies.delete('welfare_role')
    return response
  }

  // ── FIX: prefer role from decoded JWT over cookie — the cookie can
  //         become stale if a member's role was updated server-side,
  //         causing the wrong redirect branch to fire repeatedly ────────────
  const role = decoded.role || request.cookies.get('welfare_role')?.value || ''

  // ── /admin/* ──────────────────────────────────────────────────────────────
  if (isAdminRoute) {
    if (ADMIN_ROLES.includes(role)) return NextResponse.next()
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ── /dashboard/* ──────────────────────────────────────────────────────────
  if (isDashboardRoute) {
    if (role === 'MEMBER') return NextResponse.next()
    if (ADMIN_ROLES.includes(role)) return NextResponse.redirect(new URL('/admin', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export default proxy

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
}