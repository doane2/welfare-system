'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../lib/api'
import { useAuth } from '../../lib/auth'

function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  TREASURER:   'Treasurer',
  SECRETARY:   'Secretary',
}

// ── Per-KPI color config ─────────────────────────────────────────────────────
const KPI_COLORS = [
  { color: '#1e3a6e', bg: '#eef2ff' }, // Total Members     → navy/blue
  { color: '#b45309', bg: '#fef3c7' }, // Pending Payments  → amber
  { color: '#0f766e', bg: '#f0fdf4' }, // Pending Loans     → teal/green
  { color: '#7c3aed', bg: '#f5f3ff' }, // Pending Claims    → purple
]

export default function AdminDashboardPage() {
  const { user }              = useAuth()
  const router                = useRouter()
  const [stats,   setStats]   = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [membersRes, pendingRes, loansRes, claimsRes] = await Promise.allSettled([
          api.get('/members?page=1&limit=5'),
          api.get('/mpesa/pending?limit=1'),
          api.get('/loans?status=PENDING&limit=1'),
          api.get('/claims?status=PENDING&limit=1'),
        ])
        const totalMembers  = membersRes.status  === 'fulfilled' ? membersRes.value.data.total   || 0 : 0
        const recentMembers = membersRes.status  === 'fulfilled' ? membersRes.value.data.members  || [] : []
        const pendingPays   = pendingRes.status  === 'fulfilled' ? pendingRes.value.data.total    || 0 : 0
        const pendingLoans  = loansRes.status    === 'fulfilled' ? loansRes.value.data.total      || 0 : 0
        const pendingClaims = claimsRes.status   === 'fulfilled' ? claimsRes.value.data.total     || 0 : 0
        setStats({ totalMembers, pendingPays, pendingLoans, pendingClaims })
        setMembers(recentMembers)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  const role = user?.role || 'SUPER_ADMIN'

  const actions = [
    ...(role === 'SUPER_ADMIN' ? [
      { href: '/admin/members/new', label: 'Add new member',   icon: '👤', color: '#1e3a6e', badge: null },
      { href: '/admin/payments',   label: 'Approve payments', icon: '💳', color: '#0369a1', badge: stats?.pendingPays || null },
    ] : []),
    ...(role === 'TREASURER' ? [
      { href: '/admin/members',    label: 'View members',     icon: '👥', color: '#1e3a6e', badge: null },
      { href: '/admin/payments',   label: 'Approve payments', icon: '💳', color: '#0369a1', badge: stats?.pendingPays || null },
    ] : []),
    ...(role === 'SECRETARY' ? [
      { href: '/admin/members/new', label: 'Add new member',  icon: '👤', color: '#1e3a6e', badge: null },
      { href: '/admin/members',    label: 'Member list',      icon: '👥', color: '#0369a1', badge: null },
    ] : []),
    { href: '/admin/loans',  label: 'Manage loans',  icon: '🏦', color: '#0f766e', badge: stats?.pendingLoans  || null },
    { href: '/admin/claims', label: 'Review claims', icon: '🏥', color: '#7c3aed', badge: stats?.pendingClaims || null },
    ...(['SUPER_ADMIN', 'SECRETARY'].includes(role) ? [
      { href: '/admin/announcements', label: 'Post announcement', icon: '📢', color: '#b45309', badge: null },
    ] : []),
  ].slice(0, 4)

  const kpiCards = [
    { label: 'Total Members',    value: stats?.totalMembers,  icon: '👥', href: '/admin/members',  ...KPI_COLORS[0] },
    { label: 'Pending Payments', value: stats?.pendingPays,   icon: '⏳', href: '/admin/payments', ...KPI_COLORS[1] },
    { label: 'Pending Loans',    value: stats?.pendingLoans,  icon: '🏦', href: '/admin/loans',    ...KPI_COLORS[2] },
    { label: 'Pending Claims',   value: stats?.pendingClaims, icon: '🏥', href: '/admin/claims',   ...KPI_COLORS[3] },
  ]

  return (
    <div style={{ padding: '32px 36px' }}>

      {/* ── Greeting ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 700, color: '#0f2040', margin: 0 }}>
            {greet()}, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: '#eef2ff', color: '#1e3a6e' }}>
            {ROLE_LABELS[role] || role}
          </span>
        </div>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}Full annual contributions due by 31 March {new Date().getFullYear()}
        </p>
      </div>

      {/* ── KPI cards (reduced height, distinct colors) ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 32 }}>
        {kpiCards.map(k => (
          <Link key={k.label} href={k.href} style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: '#fff',
                border: `1.5px solid ${k.bg}`,
                borderTop: `3px solid ${k.color}`,
                borderRadius: 14,
                padding: '16px 20px',       // ← reduced from 24px
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 6px 20px rgba(30,58,110,0.1)'; el.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.transform = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k.label}</div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{k.icon}</div>
              </div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>
                {loading
                  ? <span style={{ height: 22, width: 40, display: 'block', background: '#f1f5f9', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />
                  : (k.value ?? '—')}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

        {/* ── Recent members ──────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040' }}>Recent members</div>
            <Link href="/admin/members" style={{ fontSize: 13, color: '#1e3a6e', fontWeight: 500, textDecoration: 'none' }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ padding: 20 }}>
              {Array(4).fill(0).map((_, i) => (
                <div key={i} style={{ height: 48, background: '#f8fafc', borderRadius: 10, marginBottom: 10, animation: 'pulse 1.5s ease infinite' }} />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No members yet —{' '}
              {['SUPER_ADMIN', 'SECRETARY'].includes(role) && (
                <Link href="/admin/members/new" style={{ color: '#1e3a6e', fontWeight: 500 }}>add the first member</Link>
              )}
            </div>
          ) : (
            <div>
              {members.map((m, i) => (
                <div key={m.id}
                  onClick={() => router.push(`/admin/members/${m.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: i < members.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1e3a6e', flexShrink: 0 }}>
                    {m.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f2040' }}>{m.fullName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.memberNumber} · {m.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: m.isActive ? '#dcfce7' : '#f1f5f9', color: m.isActive ? '#15803d' : '#64748b' }}>
                      {m.isActive ? 'Active' : 'Pending'}
                    </span>
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: '#eef2ff', color: '#1e3a6e' }}>
                      {m.memberType || 'SINGLE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick actions */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 18 }}>Quick actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {actions.map(a => (
                <Link key={a.href} href={a.href}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 11, textDecoration: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#eef2ff'; el.style.borderColor = '#c7d2fe' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#f8fafc'; el.style.borderColor = '#e2e8f0' }}
                >
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0f2040' }}>{a.label}</span>
                  {a.badge != null && a.badge > 0 && (
                    <span style={{ minWidth: 22, height: 22, borderRadius: 99, background: '#e6b020', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                      {a.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Contribution rate reference */}
          <div style={{ background: 'linear-gradient(135deg,#0f2040,#1e3a6e)', borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Contribution rates</div>
            {[
              { type: '👤 Single',    monthly: 'KES 200/month', annual: 'KES 2,400/year' },
              { type: '👨‍👩‍👧 Family',   monthly: 'KES 500/month', annual: 'KES 6,000/year' },
              { type: '⚡ Emergency', monthly: 'Any amount',    annual: 'No limit'        },
            ].map(r => (
              <div key={r.type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{r.type}</span>
                <span style={{ color: '#f5c842', fontWeight: 500 }}>{r.annual}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>
              📅 Full annual payment due by 31 March each year
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
