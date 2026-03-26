'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

const iS: any = {
  width: '100%', padding: '11px 14px', borderRadius: 9,
  border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const iF = (e: any) => e.target.style.borderColor = '#1e3a6e'
const iB = (e: any) => e.target.style.borderColor = '#e2e8f0'

export default function NewMemberPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName:   '',
    email:      '',
    phone:      '',
    nationalId: '',
    memberType: 'SINGLE',
  })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim()) { toast.error('Full name is required'); return }
    if (!form.email.trim())    { toast.error('Email is required'); return }
    setSaving(true)
    try {
      const { data } = await api.post('/members', form)
      toast.success(`Member created! Activation email sent to ${form.email}`)
      // Redirect to the new member's detail page
      const newId = data.member?.id || data.id
      if (newId) router.push(`/admin/members/${newId}`)
      else       router.push('/admin/members')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create member')
    } finally { setSaving(false) }
  }

  const monthlyRate = form.memberType === 'FAMILY' ? 500 : 200
  const annualRate  = monthlyRate * 12

  return (
    <div style={{ padding: '32px 36px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <Link href="/admin/members" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 22, lineHeight: 1 }}>←</Link>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 24, fontWeight: 700, color: '#0f2040', marginBottom: 2 }}>Add New Member</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Create a member account and send an activation email</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 900 }}>

        {/* Form */}
        <form onSubmit={save} style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Personal information</div>

          {[
            { label: 'Full name *',  key: 'fullName',   type: 'text',  placeholder: 'Full legal name'    },
            { label: 'Email *',      key: 'email',      type: 'email', placeholder: 'email@example.com'  },
            { label: 'Phone',        key: 'phone',      type: 'tel',   placeholder: '07XXXXXXXX'         },
            { label: 'National ID',  key: 'nationalId', type: 'text',  placeholder: 'National ID number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{f.label}</label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={iS}
                onFocus={iF}
                onBlur={iB}
              />
            </div>
          ))}

          {/* Member type */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Member type *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { v: 'SINGLE', l: 'Single member', sub: 'KES 200/month · KES 2,400/year' },
                { v: 'FAMILY', l: 'Family member',  sub: 'KES 500/month · KES 6,000/year' },
              ].map(o => (
                <label key={o.v} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 9, cursor: 'pointer',
                  background: form.memberType === o.v ? '#eef2ff' : '#f8fafc',
                  border: `1.5px solid ${form.memberType === o.v ? '#1e3a6e' : '#e2e8f0'}`,
                }}>
                  <input type="radio" value={o.v} checked={form.memberType === o.v}
                    onChange={e => setForm(p => ({ ...p, memberType: e.target.value }))}
                    style={{ accentColor: '#1e3a6e' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: form.memberType === o.v ? '#1e3a6e' : '#374151' }}>{o.l}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{o.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} style={{
            background: saving ? '#94a3b8' : '#1e3a6e', color: '#fff',
            padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 700,
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4,
          }}>
            {saving ? 'Creating...' : '✉ Create & Send Activation Email'}
          </button>
        </form>

        {/* Info panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Rate preview */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Contribution rates</div>
            {[
              { type: 'Single member', rate: 'KES 200/month', annual: 'KES 2,400/year', active: form.memberType === 'SINGLE' },
              { type: 'Family member', rate: 'KES 500/month', annual: 'KES 6,000/year', active: form.memberType === 'FAMILY' },
            ].map(r => (
              <div key={r.type} style={{
                padding: '13px 15px', borderRadius: 10, marginBottom: 10,
                background: r.active ? '#eef2ff' : '#f8fafc',
                border: `1px solid ${r.active ? '#c7d2fe' : '#e2e8f0'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: r.active ? '#1e3a6e' : '#64748b' }}>{r.type}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{r.rate} · {r.annual}</div>
                  </div>
                  {r.active && <span style={{ color: '#1e3a6e', fontSize: 16 }}>✓</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Selected rate summary */}
          <div style={{ background: 'linear-gradient(135deg,#0f2040,#1e3a6e)', borderRadius: 16, padding: 22, color: '#fff' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Selected rate summary</div>
            {[
              { l: 'Member type',   v: form.memberType === 'FAMILY' ? 'Family Member' : 'Single Member' },
              { l: 'Monthly rate',  v: `KES ${monthlyRate.toLocaleString()}/month` },
              { l: 'Annual rate',   v: `KES ${annualRate.toLocaleString()}/year` },
              { l: 'Deadline',      v: 'Full payment by 31 March' },
            ].map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{r.l}</span>
                <span style={{ fontWeight: 500, color: '#f5c842' }}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Activation note */}
          <div style={{ background: '#e0f2fe', borderRadius: 12, padding: '14px 16px', border: '1px solid #bae6fd' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0369a1', marginBottom: 5 }}>📧 Activation email</div>
            <div style={{ fontSize: 12, color: '#0c4a6e', lineHeight: 1.6 }}>
              After creation, the member will receive an activation email with a link to set their password and activate their account.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
