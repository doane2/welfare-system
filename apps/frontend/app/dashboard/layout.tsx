'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../lib/auth'
import api from '../../lib/api'

const STORAGE_KEY = 'crater_read_announcements'
function getUnreadCount(announcements: any[]): number {
  try {
    const read = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
    return announcements.filter(a => !read.has(a.id)).length
  } catch { return 0 }
}

const css = `
  .dash-root    { display: flex; min-height: 100vh; background: #f1f5f9; }
  .dash-sidebar {
    width: 240px; background: #0f2040;
    display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
    transition: transform 0.28s cubic-bezier(.4,0,.2,1);
  }
  .dash-topbar {
    display: none;
    position: fixed; top: 0; left: 0; right: 0; height: 56px;
    background: #0f2040; z-index: 60;
    align-items: center; justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .dash-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.55); z-index: 49;
    backdrop-filter: blur(2px);
  }
  .dash-overlay.open { display: block; }
  .dash-main { flex: 1; margin-left: 240px; min-height: 100vh; }
  .dash-hamburger {
    display: none; flex-direction: column; gap: 5px;
    background: none; border: none; cursor: pointer; padding: 4px;
  }
  .dash-hamburger span {
    display: block; width: 22px; height: 2px;
    background: #fff; border-radius: 2px; transition: all 0.25s;
  }
  .dash-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .dash-hamburger.open span:nth-child(2) { opacity: 0; }
  .dash-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
  @keyframes spin { to { transform: rotate(360deg) } }
  @media (max-width: 900px) {
    .dash-main    { margin-left: 200px; }
    .dash-sidebar { width: 200px; }
  }
  @media (max-width: 640px) {
    .dash-sidebar        { transform: translateX(-100%); width: 240px; }
    .dash-sidebar.open   { transform: translateX(0); }
    .dash-main           { margin-left: 0; padding-top: 56px; }
    .dash-topbar         { display: flex; }
    .dash-hamburger      { display: flex; }
  }
`

const buildNav = (unreadCount: number) => [
  { href: '/dashboard',               icon: '▦',  label: 'Overview'      },
  { href: '/dashboard/contributions', icon: '📋', label: 'Contributions' },
  { href: '/dashboard/payments',      icon: '💳', label: 'Make Payment'  },
  { href: '/dashboard/claims',        icon: '🏥', label: 'My Claims'     },
  { href: '/dashboard/loans',         icon: '🏦', label: 'My Loans'      },
  { href: '/dashboard/beneficiaries', icon: '👥', label: 'Beneficiaries' },
  { href: '/dashboard/statements',    icon: '📄', label: 'Statements'    },
  { href: '/dashboard/announcements', icon: '📢', label: 'Announcements', badge: unreadCount },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // ── Fetch unread announcements count ──────────────────────────────────────
  const fetchUnread = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await api.get('/announcements/active')
      setUnreadCount(getUnreadCount(data.announcements || []))
    } catch {}
  }, [user?.id])

  // Fetch once on mount / when user changes
  useEffect(() => { fetchUnread() }, [fetchUnread])

  // ── FIX: use `pathname` as the dependency (a string), NOT a boolean expression.
  // The old code had `pathname === '/dashboard/announcements'` which is a boolean
  // that React evaluated as a constantly-changing value, firing the effect on
  // every single render and causing the infinite reload loop. ─────────────────
  useEffect(() => {
    if (pathname !== '/dashboard/announcements') return
    const t = setTimeout(() => fetchUnread(), 500)
    return () => clearTimeout(t)
  }, [pathname, fetchUnread])   // ← pathname (string) — stable, only changes on navigation

  // ── Close sidebar on route change ─────────────────────────────────────────
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // ── Close sidebar on desktop resize ──────────────────────────────────────
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 640) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#1e3a6e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const initials = user.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ME'
  const NAV      = buildNav(unreadCount)

  const sidebarJSX = (
    <>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(230,176,32,0.15)', border: '1.5px solid rgba(230,176,32,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#f5c842', flexShrink: 0 }}>CS</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>Crater SDA</div>
            <div style={{ fontSize: 10, color: '#f5c842', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Welfare</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 8px 8px' }}>My Account</div>
        {NAV.map(item => {
          const isActive = item.href === '/dashboard'
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9,
              textDecoration: 'none', transition: 'all 0.15s',
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              borderLeft: isActive ? '3px solid #f5c842' : '3px solid transparent',
              color: isActive ? '#fff' : '#64748b',
              fontSize: 14, fontWeight: isActive ? 500 : 400,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: '#e6b020', color: '#0f2040', padding: '1px 6px', borderRadius: 99, flexShrink: 0 }}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '14px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a6e,#2d5299)', border: '2px solid #e6b020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#f5c842', flexShrink: 0 }}>{initials}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.fullName}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.memberNumber}</div>
          </div>
        </div>
        <button onClick={signOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 13 }}>
          <span>⬡</span> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="dash-root">
      <style>{css}</style>

      {/* Mobile topbar */}
      <header className="dash-topbar">
        <button className={`dash-hamburger ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(230,176,32,0.15)', border: '1.5px solid rgba(230,176,32,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#f5c842' }}>CS</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Crater SDA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {unreadCount > 0 && (
            <Link href="/dashboard/announcements" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: '#e6b020', color: '#0f2040', padding: '2px 8px', borderRadius: 99 }}>
                📢 {unreadCount}
              </span>
            </Link>
          )}
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a6e,#2d5299)', border: '2px solid #e6b020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f5c842' }}>{initials}</div>
        </div>
      </header>

      {/* Overlay */}
      <div className={`dash-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {sidebarJSX}
      </aside>

      {/* Main */}
      <main className="dash-main">{children}</main>
    </div>
  )
}
