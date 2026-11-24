'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getContactMessages, updateContactMessage, deleteContactMessage } from '../../../lib/api'
import { Modal, Badge, inputStyle, labelStyle, primaryBtn, ghostBtn, dangerBtn } from '../../../components/adminUi'

type Status = 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
type Contact = {
  id: string; fullName: string; phone: string; email?: string | null
  inquiryType: string; message: string; status: Status
  adminNotes?: string | null; handledByName?: string | null
  createdAt: string; updatedAt: string
}

const TYPE_LABEL: Record<string, string> = {
  MEMBERSHIP: 'Joining the society', CONTRIBUTIONS: 'Contributions and payments', CLAIMS: 'Claims and benefits',
  LOANS: 'Loans', SUPPORT: 'Help with account', OTHER: 'Other',
}
const STATUS: Record<Status, { label: string; bg: string; fg: string }> = {
  NEW:         { label: 'New',         bg: '#fef3c7', fg: '#b45309' },
  IN_PROGRESS: { label: 'In progress', bg: '#e0e7ff', fg: '#3730a3' },
  RESOLVED:    { label: 'Resolved',    bg: '#dcfce7', fg: '#15803d' },
}
const FILTERS: { key: '' | Status; label: string }[] = [
  { key: '', label: 'All' }, { key: 'NEW', label: 'New' }, { key: 'IN_PROGRESS', label: 'In progress' }, { key: 'RESOLVED', label: 'Resolved' },
]

const fmt = (d: string) => new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminInquiriesPage() {
  const [items, setItems]     = useState<Contact[]>([])
  const [stats, setStats]     = useState({ total: 0, new: 0, inProgress: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'' | Status>('')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [sel, setSel]         = useState<Contact | null>(null)
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getContactMessages({ page, limit: 15, status: filter || undefined, search: search || undefined })
      setItems(data.contacts || [])
      setStats(data.stats || { total: 0, new: 0, inProgress: 0, resolved: 0 })
      setPages(data.totalPages || 1)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load enquiries')
    } finally { setLoading(false) }
  }, [page, filter, search])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const open = (c: Contact) => { setSel(c); setNotes(c.adminNotes || '') }

  const save = async (patch: { status?: Status; adminNotes?: string }, msg: string) => {
    if (!sel) return
    setSaving(true)
    try {
      const { data } = await updateContactMessage(sel.id, patch)
      setSel(data.contact)
      toast.success(msg)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!sel || !confirm(`Delete the message from ${sel.fullName}? This cannot be undone.`)) return
    try {
      await deleteContactMessage(sel.id)
      toast.success('Deleted')
      setSel(null)
      load()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete') }
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>Inquiries</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Messages sent through the website contact form</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total', value: stats.total, color: '#1e3a6e' },
          { label: 'New', value: stats.new, color: '#b45309' },
          { label: 'In progress', value: stats.inProgress, color: '#3730a3' },
          { label: 'Resolved', value: stats.resolved, color: '#15803d' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search name, phone, email or message..." style={{ ...inputStyle, width: 300 }} />
        <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: filter === f.key ? '#fff' : 'transparent', color: filter === f.key ? '#0f2040' : '#94a3b8',
              boxShadow: filter === f.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20 }}>
            {Array(5).fill(0).map((_, i) => <div key={i} style={{ height: 56, background: '#f8fafc', borderRadius: 10, marginBottom: 10 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No enquiries found</div>
            <div style={{ fontSize: 13 }}>{search || filter ? 'Try a different search or filter.' : 'Messages sent from the website contact form will appear here.'}</div>
          </div>
        ) : items.map((c, i) => (
          <div key={c.id} onClick={() => open(c)}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px', cursor: 'pointer', borderBottom: i < items.length - 1 ? '1px solid #f1f5f9' : 'none', background: c.status === 'NEW' ? '#fffdf5' : 'transparent' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = c.status === 'NEW' ? '#fffdf5' : 'transparent')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: c.status === 'NEW' ? 700 : 600, fontSize: 14, color: '#0f2040' }}>{c.fullName}</span>
                <Badge bg={STATUS[c.status].bg} fg={STATUS[c.status].fg}>{STATUS[c.status].label}</Badge>
                <Badge bg="#eef2ff" fg="#1e3a6e">{TYPE_LABEL[c.inquiryType] || c.inquiryType}</Badge>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.message}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: '#475569' }}>{c.phone}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{fmt(c.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 18 }}>
          <button style={ghostBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ fontSize: 13, color: '#64748b' }}>Page {page} of {pages}</span>
          <button style={ghostBtn} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {sel && (
        <Modal title="Enquiry details" onClose={() => setSel(null)}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <Badge bg={STATUS[sel.status].bg} fg={STATUS[sel.status].fg}>{STATUS[sel.status].label}</Badge>
            <Badge bg="#eef2ff" fg="#1e3a6e">{TYPE_LABEL[sel.inquiryType] || sel.inquiryType}</Badge>
          </div>

          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>{sel.fullName}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>Received {fmt(sel.createdAt)}</div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <a href={`tel:${sel.phone}`} style={{ ...ghostBtn, textDecoration: 'none' }}>Call {sel.phone}</a>
            {sel.email && (
              <a href={`mailto:${sel.email}?subject=${encodeURIComponent('Re: your message to Crater SDA Welfare')}`} style={{ ...ghostBtn, textDecoration: 'none' }}>Email {sel.email}</a>
            )}
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, fontSize: 14, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{sel.message}</div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(Object.keys(STATUS) as Status[]).map(s => (
                <button key={s} disabled={saving || sel.status === s}
                  onClick={() => save({ status: s }, `Marked ${STATUS[s].label.toLowerCase()}`)}
                  style={{ ...ghostBtn, background: sel.status === s ? STATUS[s].bg : '#fff', color: sel.status === s ? STATUS[s].fg : '#1e3a6e' }}>
                  {STATUS[s].label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Internal notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={2000}
              placeholder="e.g. Called back on Monday, sent registration details"
              style={{ ...inputStyle, resize: 'vertical' }} />
            {sel.handledByName && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Last updated by {sel.handledByName}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button style={dangerBtn} onClick={remove}>Delete</button>
            <button style={primaryBtn} disabled={saving || notes === (sel.adminNotes || '')} onClick={() => save({ adminNotes: notes }, 'Notes saved')}>
              {saving ? 'Saving...' : 'Save notes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}