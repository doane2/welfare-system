'use client'
import { useEffect, useState } from 'react'
import { useAuth }             from '../../lib/auth'
import api                     from '../../lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import Link from 'next/link'
import toast from 'react-hot-toast'

// ── Read/unread tracking (localStorage) ──────────────────────────────────────
const STORAGE_KEY = 'crater_read_announcements'
function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}
function markRead(id: string) {
  const ids = getReadIds(); ids.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

const STANDING: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  GOOD:      { label: 'Good Standing', color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: '✓' },
  WARNING:   { label: 'Warning',       color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: '⚠' },
  SUSPENDED: { label: 'Suspended',     color: '#dc2626', bg: '#fee2e2', border: '#fecaca', icon: '✕' },
}

const DEP_LABELS: Record<string, string> = {
  CHILD_UNDER_18: 'Child (under 18)',
  CHILD_18_25:    'Child (18–25)',
  PARENT:         'Parent',
  Spouse:         'Spouse',
  SIBLING:        'Sibling',
  NEXT_OF_KIN:    'Next of kin',
}

function greet() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function KpiCard({ label, value, sub, icon, color, bg, isStatus = false }: {
  label: string; value: string; sub: string; icon: string
  color: string; bg: string; isStatus?: boolean
}) {
  return (
    <div
      style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, transition: 'all 0.2s', cursor: 'default' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 8px 24px rgba(30,58,110,0.1)'; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.transform = 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: isStatus ? 'inherit' : 'Georgia,serif', fontSize: isStatus ? 17 : 24, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{sub}</div>
    </div>
  )
}

const css = `
  .dash-page        { padding: 32px 36px; }
  .kpi-grid         { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; margin-bottom: 28px; }
  .chart-actions    { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-bottom: 24px; }
  .deps-grid        { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 12px; }
  .member-banner    {
    background: linear-gradient(135deg,#0f2040,#1e3a6e);
    border-radius: 14px; padding: 16px 24px; margin-bottom: 28px;
    display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  }
  .banner-divider   { width:1px; height:36px; background:rgba(255,255,255,0.1); flex-shrink:0; }
  .alert-banner     { border-radius:13px; padding:16px 22px; margin-bottom:22px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }

  @media (max-width: 900px) {
    .dash-page     { padding: 24px 24px; }
    .kpi-grid      { grid-template-columns: repeat(2,1fr); gap: 14px; }
    .chart-actions { grid-template-columns: 1fr; }
    .banner-divider{ display: none; }
  }
  @media (max-width: 640px) {
    .dash-page     { padding: 20px 16px; }
    .kpi-grid      { grid-template-columns: repeat(2,1fr); gap: 10px; }
    .kpi-grid > div{ padding: 16px 14px !important; }
    .chart-actions { grid-template-columns: 1fr; gap: 16px; }
    .deps-grid     { grid-template-columns: 1fr 1fr; }
    .member-banner { padding: 14px 16px; gap: 12px; }
    .alert-banner  { padding: 12px 14px; gap: 10px; }
    .alert-banner a { font-size: 12px !important; padding: 7px 12px !important; }
    .dash-h1       { font-size: 22px !important; }
  }
  @media (max-width: 400px) {
    .kpi-grid      { grid-template-columns: 1fr 1fr; gap: 8px; }
    .deps-grid     { grid-template-columns: 1fr; }
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
`

export default function DashboardPage() {
  const { user }                          = useAuth()
  const [data,         setData]           = useState<any>(null)
  const [announcements,setAnnouncements]  = useState<any[]>([])
  const [dependents,   setDependents]     = useState<any[]>([])
  const [auditLogs,    setAuditLogs]      = useState<any[]>([])
  const [loading,      setLoading]        = useState(true)
  const [readIds,      setReadIds]        = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [dashRes, annRes, depRes, auditRes] = await Promise.allSettled([
          api.get('/dashboard/me'),
          api.get('/announcements/active'),
          api.get(`/dependents/member/${user.id}`),
          api.get(`/audit-logs?userId=${user.id}&limit=8`),
        ])
        if (dashRes.status  === 'fulfilled') setData(dashRes.value.data)
        if (annRes.status   === 'fulfilled') setAnnouncements(annRes.value.data.announcements || [])
        if (depRes.status   === 'fulfilled') setDependents(depRes.value.data.dependents || [])
        if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value.data.auditLogs || [])
        // Load read state from localStorage after announcements are set
        setReadIds(getReadIds())
      } catch { toast.error('Failed to load dashboard') }
      finally  { setLoading(false) }
    }
    load()
  }, [user])

  if (loading || !data) return <LoadingShell />

  const memberType  = data.member?.memberType  || 'SINGLE'
  const monthlyRate = data.member?.monthlyRate || (memberType === 'FAMILY' ? 500 : 200)
  const annualRate  = monthlyRate * 12
  const standing    = data.welfareStanding || 'GOOD'
  const sc          = STANDING[standing]

  const showMarchReminder = !data.annualDeadlineMissed &&
    (data.monthsToDeadline || 0) === 1 &&
    (data.annualShortfall   || 0) > 0

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length

  const kpis = [
    { label: 'Total contributed', value: `KES ${Number(data.totalContributed || 0).toLocaleString()}`,   sub: 'All approved payments ever',                                                                           icon: '💰', color: '#1e3a6e', bg: '#eef2ff' },
    { label: 'Paid this year',    value: `KES ${Number(data.annualPaidThisYear || 0).toLocaleString()}`,  sub: `Jan – Mar ${new Date().getFullYear()} · Target: KES ${Number(annualRate).toLocaleString()}`,          icon: '📅', color: '#0369a1', bg: '#e0f2fe' },
    { label: 'Arrears balance',   value: `KES ${Number(data.arrearsBalance || 0).toLocaleString()}`,      sub: data.arrearsBalance > 0 ? `${data.unpaidMonths} month(s) outstanding` : 'All paid up ✓',              icon: data.arrearsBalance > 0 ? '⚠️' : '✓', color: data.arrearsBalance > 0 ? '#b45309' : '#15803d', bg: data.arrearsBalance > 0 ? '#fef3c7' : '#dcfce7' },
    { label: 'Welfare standing',  value: sc.label,                                                         sub: `${new Date().getFullYear()} obligation: KES ${Number(annualRate).toLocaleString()}`,                  icon: sc.icon, color: sc.color, bg: sc.bg, isStatus: true },
  ]

  return (
    <div className="dash-page">
      <style>{css}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="dash-h1" style={{ fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>
          {greet()}, {user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          {user?.memberNumber} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Overdue alert ────────────────────────────────────────────────── */}
      {data.annualDeadlineMissed && (
        <div className="alert-banner" style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>⏰</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b', marginBottom: 3 }}>Annual contribution deadline passed</div>
            <div style={{ fontSize: 13, color: '#b91c1c', lineHeight: 1.5 }}>
              Your full annual contribution of KES {Number(annualRate).toLocaleString()} was due by 31 March.
              You have paid KES {Number(data.annualPaidThisYear || 0).toLocaleString()} — outstanding: KES {Number(data.annualShortfall || 0).toLocaleString()}.
            </div>
          </div>
          <Link href="/dashboard/payments" style={{ background: '#b91c1c', color: '#fff', padding: '9px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            Pay now
          </Link>
        </div>
      )}

      {/* ── March reminder ───────────────────────────────────────────────── */}
      {showMarchReminder && (
        <div className="alert-banner" style={{ background: '#e0f2fe', border: '1.5px solid #bae6fd' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>📅</span>
          <div style={{ fontSize: 13, color: '#0369a1', lineHeight: 1.5, flex: 1, minWidth: 0 }}>
            <strong>Reminder:</strong> Your annual contribution of KES {Number(annualRate).toLocaleString()} is due by 31 March.
            You still owe KES {Number(data.annualShortfall || 0).toLocaleString()}.
          </div>
          <Link href="/dashboard/payments" style={{ background: '#0369a1', color: '#fff', padding: '7px 16px', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            Make payment
          </Link>
        </div>
      )}

      {/* ── Membership banner ────────────────────────────────────────────── */}
      <div className="member-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(230,176,32,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {memberType === 'FAMILY' ? '👨‍👩‍👧' : '👤'}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Member type</div>
            <div style={{ fontWeight: 700, color: '#f5c842', fontSize: 15 }}>{memberType === 'FAMILY' ? 'Family Member' : 'Single Member'}</div>
          </div>
        </div>
        <div className="banner-divider" />
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Monthly rate</div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>KES {Number(monthlyRate).toLocaleString()}/month</div>
        </div>
        <div className="banner-divider" />
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Annual rate</div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>KES {Number(annualRate).toLocaleString()}/year</div>
        </div>
        <div className="banner-divider" />
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Payment window</div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>Jan – Mar (due 31 Mar)</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Member since</div>
          <div style={{ fontWeight: 700, color: '#f5c842', fontSize: 15 }}>
            {new Date(data.member?.createdAt || Date.now()).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── Chart + Quick actions ─────────────────────────────────────────── */}
      <div className="chart-actions">
        <div style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040' }}>Monthly contributions</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Last 12 months · expected KES {Number(monthlyRate).toLocaleString()}/month</div>
            </div>
            <Link href="/dashboard/contributions" style={{ fontSize: 13, color: '#1e3a6e', fontWeight: 500, textDecoration: 'none' }}>View all →</Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthlyChart || MOCK} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip formatter={(v: any) => [`KES ${Number(v).toLocaleString()}`, 'Paid']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <ReferenceLine y={monthlyRate} stroke="#e6b020" strokeDasharray="4 2" strokeWidth={1.5} />
              <Bar dataKey="amount" fill="#1e3a6e" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
            <div style={{ width: 22, height: 3, background: '#e6b020', borderRadius: 2 }} />
            <span>Expected: KES {Number(monthlyRate).toLocaleString()}/month</span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 22, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 18 }}>Quick actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { href: '/dashboard/payments',       icon: '💳', label: 'Make payment',       sub: 'M-Pesa or manual',    primary: true  },
              { href: '/dashboard/claims',          icon: '🏥', label: 'Submit claim',       sub: 'Medical, education...'               },
              { href: '/dashboard/loans',           icon: '🏦', label: 'My loans',           sub: 'View or apply'                        },
              { href: '/dashboard/statements',      icon: '📄', label: 'Download statement', sub: 'PDF receipt'                          },
              { href: '/dashboard/announcements',   icon: '📢', label: 'Announcements',      sub: unreadCount > 0 ? `${unreadCount} unread` : 'Notices & updates' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, textDecoration: 'none', background: a.primary ? '#1e3a6e' : '#f8fafc', border: a.primary ? 'none' : '1px solid #e2e8f0', transition: 'all 0.15s', position: 'relative' }}>
                <span style={{ fontSize: 17 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: a.primary ? '#fff' : '#0f2040' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: a.primary ? 'rgba(255,255,255,0.5)' : '#94a3b8' }}>{a.sub}</div>
                </div>
                {/* Unread badge on announcements link */}
                {a.href === '/dashboard/announcements' && unreadCount > 0 && (
                  <span style={{ fontSize: 10, background: '#1e3a6e', color: '#fff', padding: '1px 7px', borderRadius: 99, fontWeight: 700 }}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dependents ───────────────────────────────────────────────────── */}
      {dependents.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 26px', border: '1px solid #e2e8f0', marginBottom: 22 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 14 }}>👨‍👩‍👧 My Dependents ({dependents.length})</div>
          <div className="deps-grid">
            {dependents.map(d => (
              <div key={d.id} style={{ background: '#f8fafc', borderRadius: 11, padding: '13px 15px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1e3a6e', flexShrink: 0 }}>
                    {d.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f2040' }}>{d.fullName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{DEP_LABELS[d.type] || d.type}</div>
                  </div>
                </div>
                {d.relationship && <div style={{ fontSize: 11, color: '#94a3b8' }}>{d.relationship}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent activity ──────────────────────────────────────────────── */}
      {auditLogs.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 26px', border: '1px solid #e2e8f0', marginBottom: 22 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 14 }}>📋 Recent Activity</div>
          {auditLogs.map((log, i) => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < auditLogs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1e3a6e', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, color: '#374151', textTransform: 'lowercase' }}>{log.action.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{new Date(log.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Announcements ────────────────────────────────────────────────── */}
      {announcements.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 26px', border: '1px solid #e2e8f0' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040' }}>📢 Announcements</div>
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, background: '#1e3a6e', color: '#fff', padding: '2px 9px', borderRadius: 99, fontWeight: 600 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <Link href="/dashboard/announcements" style={{ fontSize: 13, color: '#1e3a6e', fontWeight: 500, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>

          {/* Top 3 announcements */}
          {announcements.slice(0, 3).map(a => {
            const isRead = readIds.has(a.id)
            return (
              <div key={a.id} style={{
                padding: '14px 16px',
                background: a.priority ? '#fffbeb' : '#f8fafc',
                borderRadius: 12,
                borderLeft: `3px solid ${a.priority ? '#e6b020' : isRead ? '#e2e8f0' : '#1e3a6e'}`,
                marginBottom: 10,
                opacity: isRead ? 0.8 : 1,
                cursor: 'pointer',
              }}
                onClick={() => {
                  markRead(a.id)
                  setReadIds(getReadIds())
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                  {a.priority && (
                    <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '1px 8px', borderRadius: 99, fontWeight: 600 }}>📌 Pinned</span>
                  )}
                  {!isRead && (
                    <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '1px 8px', borderRadius: 99, fontWeight: 600 }}>New</span>
                  )}
                  <div style={{ fontWeight: isRead ? 600 : 700, fontSize: 14, color: '#0f2040' }}>{a.title}</div>
                </div>
                <div style={{
                  fontSize: 13, color: '#64748b', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as any}>
                  {a.content}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  {new Date(a.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            )
          })}

          {/* View more link */}
          {announcements.length > 3 && (
            <Link href="/dashboard/announcements"
              style={{ display: 'block', textAlign: 'center', padding: '10px', fontSize: 13, color: '#1e3a6e', fontWeight: 500, textDecoration: 'none', background: '#f8fafc', borderRadius: 9, marginTop: 4 }}>
              View {announcements.length - 3} more →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

const MOCK = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'].map(month => ({ month, amount: 0, expected: 200 }))

function LoadingShell() {
  return (
    <div style={{ padding: '32px 36px' }}>
      {[80, 48, 48, 200].map((h, i) => (
        <div key={i} style={{ height: h, background: '#f1f5f9', borderRadius: 14, marginBottom: 16, animation: 'pulse 1.5s ease infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
