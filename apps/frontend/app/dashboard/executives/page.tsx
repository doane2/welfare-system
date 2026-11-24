'use client'
import { useEffect, useState } from 'react'
import { getExecutives } from '../../../lib/api'

const initials = (n: string) => n.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : '')

export default function MemberExecutivesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getExecutives()
      .then(({ data }) => setItems(data.executives || []))
      .catch(() => setError('Could not load the executive list.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '32px 28px' }}>
      <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, color: '#0f2040', margin: '0 0 6px' }}>Welfare Executive</h1>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>The leaders currently serving the Crater SDA Welfare.</p>
      {loading ? <p style={{ color: '#94a3b8' }}>Loading...</p> : error ? <p style={{ color: '#b91c1c' }}>{error}</p> : items.length === 0 ? <p style={{ color: '#94a3b8' }}>No executive has been published yet.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
          {items.map((x) => (
            <div key={x.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: '3px solid #e6b020', borderRadius: 14, padding: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eef2ff', color: '#1e3a6e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, marginBottom: 12 }}>{initials(x.fullName)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{x.position}</div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 18, fontWeight: 700, color: '#0f2040', margin: '4px 0 8px' }}>{x.fullName}</div>
              {x.bio && <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 8px' }}>{x.bio}</p>}
              {(x.phone || x.email) && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{x.phone}{x.phone && x.email ? ' | ' : ''}{x.email}</div>}
              {x.termStart && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Serving since {fmt(x.termStart)}{x.termEnd ? ` - until ${fmt(x.termEnd)}` : ''}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
