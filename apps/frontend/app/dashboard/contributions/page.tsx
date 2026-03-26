'use client'
import { useEffect, useState, useCallback, Fragment } from 'react'
import Link                                            from 'next/link'
import api                                             from '../../../lib/api'
import toast                                           from 'react-hot-toast'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  APPROVED: { bg: '#dcfce7', color: '#15803d' },
  PAID:     { bg: '#dcfce7', color: '#15803d' },
  PENDING:  { bg: '#fef3c7', color: '#b45309' },
  REJECTED: { bg: '#fee2e2', color: '#b91c1c' },
}

const TYPE_LABEL: Record<string, string> = {
  MONTHLY:      'Monthly',
  REGISTRATION: 'Registration',
  EMERGENCY:    'Emergency',
}

const css = `
  .cont-page   { padding: 32px 36px; }
  .cont-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
  .cont-hactions { display: flex; gap: 10px; flex-shrink: 0; }
  .cont-filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }

  .cont-table-wrap { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
  .cont-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .cont-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 560px; }

  .cont-card { display: none; }
  .cont-row  { display: table-row; }

  @media (max-width: 900px) { .cont-page { padding: 24px 24px; } }

  @media (max-width: 640px) {
    .cont-page   { padding: 20px 16px; }
    .cont-header { flex-direction: column; align-items: stretch; }
    .cont-hactions { width: 100%; }
    .cont-hactions a,
    .cont-hactions button { flex: 1; text-align: center; justify-content: center; }
    .cont-thead { display: none; }
    .cont-row   { display: none; }
    .cont-card  { display: block; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
    .cont-table { min-width: unset; }
  }

  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes spin   { to { transform: rotate(360deg) } }
`

export default function ContributionsPage() {
  const [contributions, setContributions] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [page,          setPage]          = useState(1)
  const [total,         setTotal]         = useState(0)
  const [filter,        setFilter]        = useState('ALL')
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null)
  const LIMIT = 15

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else         setRefreshing(true)
    try {
      const params: any = { page, limit: LIMIT }
      if (filter !== 'ALL') params.status = filter
      const { data } = await api.get('/contributions', {
        params,
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      })
      setContributions(data.contributions || [])
      setTotal(data.total || 0)
      setLastUpdated(new Date())
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load contributions'
      toast.error(msg)
      console.error('Contributions load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, filter])

  useEffect(() => { load() }, [load])

  // Refresh on window focus (tab switching back)
  useEffect(() => {
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  // Refresh when tab becomes visible
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="cont-page">
      <style>{css}</style>

      {/* Header */}
      <div className="cont-header">
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>
            Contributions
          </h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>
            Full payment ledger — all periods, M-Pesa references and statuses
            {lastUpdated && (
              <span style={{ marginLeft: 10, fontSize: 12, color: '#94a3b8' }}>
                · Updated {lastUpdated.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="cont-hactions">
          <button
            onClick={() => load(true)} disabled={refreshing}
            style={{ background: '#f1f5f9', color: '#475569', padding: '10px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>↻</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link href="/dashboard/payments"
            style={{ background: '#1e3a6e', color: '#fff', padding: '10px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            + Make Payment
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="cont-filters">
        {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: filter === f ? 'none' : '1px solid #e2e8f0',
            background: filter === f ? '#1e3a6e' : '#fff',
            color: filter === f ? '#fff' : '#64748b',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8' }}>{total} records</span>
      </div>

      {/* Table / Cards */}
      <div className="cont-table-wrap" style={{ opacity: refreshing ? 0.65 : 1, transition: 'opacity 0.2s' }}>
        <div className="cont-table-scroll">
          <table className="cont-table">
            <thead className="cont-thead">
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Period', 'Type', 'Amount', 'M-Pesa Ref', 'Date', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i} className="cont-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{ height: 14, background: '#f1f5f9', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : contributions.length === 0 ? (
                <tr className="cont-row">
                  <td colSpan={6} style={{ textAlign: 'center', padding: 56, color: '#94a3b8' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                    <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 4 }}>No contributions yet</div>
                    <div style={{ fontSize: 13 }}>Your payments will appear here after the admin adds them</div>
                  </td>
                </tr>
              ) : contributions.map(c => {
                const sc = STATUS_COLORS[c.status] || STATUS_COLORS.PENDING
                return (
                  <Fragment key={c.id}>
                    {/* Desktop table row */}
                    <tr className="cont-row"
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 16px', fontWeight: 600, color: '#0f2040' }}>{c.period || '—'}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 11, background: '#eef2ff', color: '#1e3a6e', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                          {TYPE_LABEL[c.type] || c.type}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: '#0f2040' }}>
                        KES {Number(c.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '13px 16px', fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
                        {c.payments?.[0]?.mpesaRef || '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#64748b' }}>
                        {c.updatedAt
                          ? new Date(c.updatedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                          {(c.status || '').toLowerCase()}
                        </span>
                      </td>
                    </tr>

                    {/* Mobile card */}
                    <tr>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div className="cont-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f2040' }}>{c.period || '—'}</div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                {c.updatedAt
                                  ? new Date(c.updatedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '—'}
                              </div>
                            </div>
                            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                              {(c.status || '').toLowerCase()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, background: '#eef2ff', color: '#1e3a6e', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                                {TYPE_LABEL[c.type] || c.type}
                              </span>
                              {c.payments?.[0]?.mpesaRef && (
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                                  {c.payments[0].mpesaRef}
                                </span>
                              )}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f2040' }}>
                              KES {Number(c.amount).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Page {page} of {totalPages} · {total} records</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#475569' }}>
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#475569' }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
