'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../../../../lib/api'
import { useAuth } from '../../../../../lib/auth'
import toast from 'react-hot-toast'

export default function EditMemberPage() {
  const { id }   = useParams<{ id: string }>()
  const { user } = useAuth()
  const router   = useRouter()

  const [member,  setMember]  = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({
    fullName: '', email: '', phone: '', nationalId: '',
    memberType: 'SINGLE', groupId: '',
  })

  useEffect(() => {
    api.get(`/members/${id}`)
      .then(({ data }) => {
        const m = data.member || data
        setMember(m)
        setForm({
          fullName:   m.fullName    || '',
          email:      m.email       || '',
          phone:      m.phone       || '',
          nationalId: m.nationalId  || '',
          memberType: m.memberType  || 'SINGLE',
          groupId:    m.groupId     || '',
        })
      })
      .catch(() => toast.error('Failed to load member'))
      .finally(() => setLoading(false))
  }, [id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/members/${id}`, form)
      toast.success('Member updated successfully!')
      router.push(`/admin/members/${id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div style={{ padding:'32px 36px' }}>
      {Array(4).fill(0).map((_,i) => <div key={i} style={{ height:48, background:'#f1f5f9', borderRadius:9, marginBottom:14, animation:'pulse 1.5s ease infinite' }}/>)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )

  const canEdit = ['SUPER_ADMIN','SECRETARY'].includes(user?.role)
  if (!canEdit) return (
    <div style={{ padding:'32px 36px', textAlign:'center' }}>
      <p style={{ color:'#94a3b8' }}>You don't have permission to edit member info.</p>
    </div>
  )

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:32 }}>
        <Link href={`/admin/members/${id}`} style={{ color:'#94a3b8', textDecoration:'none', fontSize:22 }}>←</Link>
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:22, fontWeight:700, color:'#0f2040', marginBottom:2 }}>Edit Member</h1>
          <p style={{ fontSize:13, color:'#64748b' }}>{member?.fullName} · {member?.memberNumber}</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:28, maxWidth:900 }}>
        <form onSubmit={save} style={{ background:'#fff', borderRadius:16, padding:28, border:'1px solid #e2e8f0', display:'flex', flexDirection:'column', gap:18 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Personal information</div>

          {[
            { label:'Full name *',  key:'fullName',   type:'text',  placeholder:'Full legal name'    },
            { label:'Email *',      key:'email',      type:'email', placeholder:'email@example.com'  },
            { label:'Phone',        key:'phone',      type:'tel',   placeholder:'07XXXXXXXX'         },
            { label:'National ID',  key:'nationalId', type:'text',  placeholder:'National ID number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:6 }}>{f.label}</label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width:'100%', padding:'11px 14px', borderRadius:9, border:'1.5px solid #e2e8f0', fontSize:14, outline:'none', boxSizing:'border-box' as any }}
                onFocus={(e: any) => e.target.style.borderColor='#1e3a6e'}
                onBlur={(e: any)  => e.target.style.borderColor='#e2e8f0'}
              />
            </div>
          ))}

          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:6 }}>Member type</label>
            <select value={form.memberType} onChange={e => setForm(p => ({ ...p, memberType: e.target.value }))}
              style={{ width:'100%', padding:'11px 14px', borderRadius:9, border:'1.5px solid #e2e8f0', fontSize:14, background:'#fff' }}>
              <option value="SINGLE">Single (KES 200/month)</option>
              <option value="FAMILY">Family (KES 500/month)</option>
            </select>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>
              Changing member type auto-updates the monthly contribution rate and arrears calculation.
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ background:saving?'#94a3b8':'#1e3a6e', color:'#fff', padding:'13px', borderRadius:10, fontSize:15, fontWeight:700, border:'none', cursor:saving?'not-allowed':'pointer', marginTop:4 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Info panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:24, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:14 }}>Contribution rates</div>
            {[
              { type:'Single member', rate:'KES 200/month', annual:'KES 2,400/year', active: form.memberType === 'SINGLE' },
              { type:'Family member', rate:'KES 500/month', annual:'KES 6,000/year', active: form.memberType === 'FAMILY' },
            ].map(r => (
              <div key={r.type} style={{ padding:'14px 16px', borderRadius:10, marginBottom:10, background: r.active ? '#eef2ff' : '#f8fafc', border: `1px solid ${r.active ? '#c7d2fe' : '#e2e8f0'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color: r.active ? '#1e3a6e' : '#64748b' }}>{r.type}</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{r.rate} · {r.annual}</div>
                  </div>
                  {r.active && <span style={{ fontSize:16, color:'#1e3a6e' }}>✓</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:'#fef3c7', borderRadius:16, padding:20, border:'1px solid #fde68a' }}>
            <div style={{ fontWeight:600, fontSize:13, color:'#b45309', marginBottom:8 }}>⚠️ Note on member type change</div>
            <div style={{ fontSize:13, color:'#92400e', lineHeight:1.6 }}>
              Changing from Single to Family (or vice versa) will immediately recalculate this member's arrears balance based on the new monthly rate. The change applies from the date of update.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
