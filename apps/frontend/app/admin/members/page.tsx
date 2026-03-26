'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

export default function AdminMembersPage() {
  const router                          = useRouter()
  const [members,  setMembers]          = useState<any[]>([])
  const [loading,  setLoading]          = useState(true)
  const [total,    setTotal]            = useState(0)
  const [page,     setPage]             = useState(1)
  const [search,   setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showForm, setShowForm]         = useState(false)
  const [creating, setCreating]         = useState(false)
  const [form,     setForm]             = useState({ fullName: '', email: '', phone: '', nationalId: '', memberType: 'SINGLE' })
  const LIMIT = 15

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(LIMIT),
        search,
        ...(statusFilter && { accountStatus: statusFilter }),
      })
      const { data } = await api.get(`/members?${params}`)
      setMembers(data.members || [])
      setTotal(data.total || 0)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, search, statusFilter])

  const createMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email) { toast.error('Name and email are required'); return }
    setCreating(true)
    try {
      await api.post('/members', form)
      toast.success(`Member created! Activation email sent to ${form.email}`)
      setShowForm(false)
      setForm({ fullName: '', email: '', phone: '', nationalId: '', memberType: 'SINGLE' })
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create member')
    } finally { setCreating(false) }
  }

  const totalPages = Math.ceil(total / LIMIT)

  // ── Status badge config ──────────────────────────────────────────────────
  const statusBadge = (m: any) => {
    // Anonymised takes highest priority
    if (m.accountStatus === 'ANONYMISED') {
      return { label: 'Anonymised', bg: '#f1f5f9', color: '#475569' }
    }
    if (m.accountStatus === 'INACTIVE' || (!m.isActive && m.accountStatus !== 'ACTIVE')) {
      return { label: 'Inactive', bg: '#fee2e2', color: '#b91c1c' }
    }
    if (m.isActive && m.accountStatus === 'ACTIVE') {
      return { label: 'Active', bg: '#dcfce7', color: '#15803d' }
    }
    // isActive false but accountStatus ACTIVE = pending activation
    return { label: 'Pending', bg: '#fef3c7', color: '#b45309' }
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>Members</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>{total} registered members · click a row to view full details</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#1e3a6e', color: '#fff', padding: '10px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          + Add Member
        </button>
      </div>

      {/* ── Inline create form ───────────────────────────────────────────── */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 18 }}>New Member</div>
          <form onSubmit={createMember}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'Full Name *', key: 'fullName',   type: 'text',  placeholder: 'John Doe'         },
                { label: 'Email *',     key: 'email',      type: 'email', placeholder: 'john@example.com' },
                { label: 'Phone',       key: 'phone',      type: 'tel',   placeholder: '07XXXXXXXX'       },
                { label: 'National ID', key: 'nationalId', type: 'text',  placeholder: '12345678'         },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' as any }}
                    onFocus={(e: any) => e.target.style.borderColor = '#1e3a6e'}
                    onBlur={(e: any)  => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              ))}
              {/* Member type selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Member Type</label>
                <select value={form.memberType} onChange={e => setForm(p => ({ ...p, memberType: e.target.value }))}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' as any, background: '#fff' }}>
                  <option value="SINGLE">Single — KES 200/month</option>
                  <option value="FAMILY">Family — KES 500/month</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={creating}
                style={{ background: creating ? '#94a3b8' : '#1e3a6e', color: '#fff', padding: '10px 24px', borderRadius: 9, fontSize: 14, fontWeight: 600, border: 'none', cursor: creating ? 'not-allowed' : 'pointer' }}>
                {creating ? 'Creating...' : 'Create & Send Activation Email'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ background: '#f1f5f9', color: '#475569', padding: '10px 20px', borderRadius: 9, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search + Status filter ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input type="text" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name, email or member number..."
          style={{ flex: 1, minWidth: 220, maxWidth: 400, padding: '10px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
          onFocus={(e: any) => e.target.style.borderColor = '#1e3a6e'}
          onBlur={(e: any)  => e.target.style.borderColor = '#e2e8f0'} />

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { value: '',           label: 'All' },
            { value: 'ACTIVE',     label: 'Active' },
            { value: 'INACTIVE',   label: 'Inactive' },
            { value: 'ANONYMISED', label: 'Anonymised' },
          ].map(opt => (
            <button key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1) }}
              style={{
                padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: '1.5px solid',
                borderColor:    statusFilter === opt.value ? '#1e3a6e' : '#e2e8f0',
                background:     statusFilter === opt.value ? '#1e3a6e' : '#fff',
                color:          statusFilter === opt.value ? '#fff'    : '#64748b',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Members table ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Member', 'Member No.', 'Phone', 'Group', 'Type', 'Status', 'Joined'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j} style={{ padding: '14px 16px' }}>
                      <div style={{ height: 14, background: '#f1f5f9', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : members.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No members found</td></tr>
            ) : members.map(m => {
              const badge = statusBadge(m)
              const isAnon = m.accountStatus === 'ANONYMISED'
              return (
                <tr key={m.id}
                  onClick={() => router.push(`/admin/members/${m.id}`)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s', opacity: isAnon ? 0.6 : 1 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAnon ? '#f1f5f9' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isAnon ? '#94a3b8' : '#1e3a6e', flexShrink: 0 }}>
                        {isAnon ? '🔒' : m.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: isAnon ? '#94a3b8' : '#0f2040' }}>{m.fullName}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{isAnon ? '—' : m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{m.memberNumber}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>{m.phone || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>{m.group?.name || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#eef2ff', color: '#1e3a6e' }}>
                      {m.memberType || 'SINGLE'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#94a3b8' }}>
                    {new Date(m.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Page {page} of {totalPages} · {total} members</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer' }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
