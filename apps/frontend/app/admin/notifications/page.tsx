'use client'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'

const CHANNEL_ICONS: Record<string, string> = { EMAIL: '✉', SMS: '📱', IN_APP: '🔔' }
const CHANNEL_COLORS: Record<string, { bg: string; color: string }> = {
  EMAIL:  { bg: '#e0f2fe', color: '#0369a1' },
  SMS:    { bg: '#dcfce7', color: '#15803d' },
  IN_APP: { bg: '#eef2ff', color: '#1e3a6e' },
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [total,         setTotal]         = useState(0)
  const [page,          setPage]          = useState(1)
  const [channel,       setChannel]       = useState('ALL')
  const LIMIT = 30

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const params: any = { page, limit: LIMIT }
        if (channel !== 'ALL') params.channel = channel
        const { data } = await api.get('/notifications', { params })
        setNotifications(data.notifications || [])
        setTotal(data.total || 0)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [page, channel])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>Notifications</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Full notification history across all members and channels</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['ALL','EMAIL','SMS','IN_APP'].map(f => (
          <button key={f} onClick={() => { setChannel(f); setPage(1) }} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: channel === f ? 'none' : '1px solid #e2e8f0',
            background: channel === f ? '#1e3a6e' : '#fff',
            color: channel === f ? '#fff' : '#64748b',
            cursor: 'pointer',
          }}>{f === 'ALL' ? 'All channels' : f}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8', alignSelf: 'center' }}>{total} total</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f1f5f9', animation: 'pulse 1.5s ease infinite', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 14, background: '#f1f5f9', borderRadius: 4, width: '60%', animation: 'pulse 1.5s ease infinite' }} />
                  <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, width: '80%', animation: 'pulse 1.5s ease infinite' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8' }}>No notifications found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((n, i) => {
              const cc = CHANNEL_COLORS[n.channel] || CHANNEL_COLORS.IN_APP
              return (
                <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px', borderBottom: i < notifications.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: cc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                    {CHANNEL_ICONS[n.channel]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f2040' }}>{n.title}</span>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: cc.bg, color: cc.color }}>{n.channel}</span>
                      {!n.read && <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>Unread</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{n.message}</div>
                    {n.user && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        To: {n.user.fullName} ({n.user.memberNumber})
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                    {new Date(n.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer' }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
