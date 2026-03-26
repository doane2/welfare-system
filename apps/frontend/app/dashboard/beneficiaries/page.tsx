'use client'
import { useEffect, useState, useCallback } from 'react'
import api        from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import toast      from 'react-hot-toast'

// ── Config ────────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string,{label:string;icon:string;bg:string;color:string;desc:string;docs:string}> = {
  CHILD_UNDER_18: { label:'Child (under 18)', icon:'👶', bg:'#e0f2fe', color:'#0369a1', desc:'Your biological or legally adopted child under 18',            docs:'Birth certificate number required'       },
  CHILD_18_25:    { label:'Child (18–25)',     icon:'🧑', bg:'#eef2ff', color:'#1e3a6e', desc:'Your child aged 18–25 still under your care',                 docs:'National ID required'                    },
  PARENT:         { label:'Parent',            icon:'👴', bg:'#f0fdf4', color:'#15803d', desc:'Your biological mother or father',                             docs:'National ID required'                    },
  SIBLING:        { label:'Sibling',           icon:'👫', bg:'#fef3c7', color:'#b45309', desc:'Your brother or sister registered under your family plan',     docs:'National ID required'                    },
  NEXT_OF_KIN:    { label:'Next of kin',       icon:'⭐', bg:'#fdf4ff', color:'#7c3aed', desc:'Primary beneficiary — receives death benefits on your behalf', docs:'National ID + phone required'            },
}

const REQ_STATUS_CONFIG = {
  PENDING:  { label:'Pending',  bg:'#fef3c7', color:'#b45309', icon:'⏳' },
  APPROVED: { label:'Approved', bg:'#dcfce7', color:'#15803d', icon:'✓'  },
  REJECTED: { label:'Rejected', bg:'#fee2e2', color:'#b91c1c', icon:'✕'  },
}

const iS:any = { width:'100%', padding:'10px 13px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
const iF = (e:any) => e.target.style.borderColor = '#1e3a6e'
const iB = (e:any) => e.target.style.borderColor = '#e2e8f0'

const css = `
  .ben-page   { padding: 32px 36px; }
  .ben-grid   { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 16px; }
  .type-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
  .form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 900px) { .ben-page { padding: 24px; } }
  @media (max-width: 640px) {
    .ben-page  { padding: 20px 16px; }
    .type-grid { grid-template-columns: repeat(2,1fr); }
    .form-grid { grid-template-columns: 1fr; }
    .ben-grid  { grid-template-columns: 1fr; }
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
`

export default function MemberBeneficiariesPage() {
  const { user }                      = useAuth()
  const [dependents,  setDependents]  = useState<any[]>([])
  const [requests,    setRequests]    = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showRequest, setShowRequest] = useState(false)
  const [sending,     setSending]     = useState(false)
  const [reqType,     setReqType]     = useState<'ADD'|'UPDATE'|'REMOVE'>('ADD')
  const [selType,     setSelType]     = useState('NEXT_OF_KIN')
  const [selDepId,    setSelDepId]    = useState('')
  const [form,        setForm]        = useState({
    fullName:'', dateOfBirth:'', nationalId:'',
    birthCertNumber:'', phone:'', relationship:'', notes:''
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [depsRes, reqsRes] = await Promise.allSettled([
        api.get(`/dependents/member/${user.id}`),
        api.get(`/beneficiary-requests`),
      ])
      if (depsRes.status === 'fulfilled') setDependents(depsRes.value.data.dependents || [])
      if (reqsRes.status === 'fulfilled') setRequests(reqsRes.value.data.requests || [])
    } catch { toast.error('Failed to load beneficiaries') }
    finally  { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setShowRequest(false); setReqType('ADD'); setSelType('NEXT_OF_KIN'); setSelDepId('')
    setForm({ fullName:'', dateOfBirth:'', nationalId:'', birthCertNumber:'', phone:'', relationship:'', notes:'' })
  }

  // ── Submit request ────────────────────────────────────────────────────────
  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (reqType === 'ADD'    && !form.fullName.trim()) { toast.error('Full name is required');           return }
    if (reqType !== 'ADD'    && !selDepId)             { toast.error('Select which dependent');          return }
    if (reqType === 'REMOVE' && !form.notes.trim())    { toast.error('Please provide a reason');         return }

    setSending(true)
    try {
      await api.post('/beneficiary-requests', {
        type:            reqType,
        dependentId:     selDepId     || undefined,
        dependentType:   selType      || undefined,
        fullName:        form.fullName        || undefined,
        dateOfBirth:     form.dateOfBirth     || undefined,
        nationalId:      form.nationalId      || undefined,
        birthCertNumber: form.birthCertNumber || undefined,
        phone:           form.phone           || undefined,
        relationship:    form.relationship    || undefined,
        notes:           form.notes           || undefined,
      })
      toast.success('Request sent! You will be notified once the secretary processes it.')
      resetForm()
      load()
    } catch (e:any) {
      toast.error(e.response?.data?.message || 'Failed to send request')
    } finally { setSending(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendingRequests = requests.filter(r => r.status === 'PENDING')
  const nextOfKin       = dependents.find(d => d.type === 'NEXT_OF_KIN')
  const others          = dependents.filter(d => d.type !== 'NEXT_OF_KIN')
  const cfg             = TYPE_CONFIG[selType]

  const calcAge = (dob: string) => {
    if (!dob) return null
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  }

  return (
    <div className="ben-page">
      <style>{css}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, gap:16, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'#0f2040', marginBottom:4 }}>Beneficiaries</h1>
          <p style={{ fontSize:14, color:'#64748b' }}>Manage who benefits from your welfare coverage</p>
        </div>
        <button onClick={() => showRequest ? resetForm() : setShowRequest(true)}
          style={{ background: showRequest?'#f1f5f9':'#1e3a6e', color: showRequest?'#475569':'#fff', padding:'10px 22px', borderRadius:9, fontSize:14, fontWeight:600, border:'none', cursor:'pointer' }}>
          {showRequest ? 'Cancel' : '+ Request change'}
        </button>
      </div>

      {/* ── Pending requests banner ───────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div style={{ background:'#fef3c7', borderRadius:12, padding:'14px 18px', border:'1px solid #fde68a', marginBottom:20, display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ fontSize:18, flexShrink:0 }}>⏳</div>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:'#92400e', marginBottom:2 }}>
              {pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize:13, color:'#92400e' }}>
              Your request{pendingRequests.length > 1 ? 's are' : ' is'} being reviewed by the welfare secretary. You will be notified once processed.
            </div>
          </div>
        </div>
      )}

      {/* ── Info banner ───────────────────────────────────────────────────── */}
      <div style={{ background:'#f8fafc', borderRadius:12, padding:'14px 18px', border:'1px solid #e2e8f0', marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ fontSize:18, flexShrink:0 }}>ℹ️</div>
        <div style={{ fontSize:13, color:'#64748b', lineHeight:1.7 }}>
          Beneficiaries are managed by the welfare secretary. To add, update or remove a beneficiary, submit a request below.
          Your <strong>Next of Kin</strong> is the primary beneficiary who receives death benefits on your behalf.
        </div>
      </div>

      {/* ── Request form ──────────────────────────────────────────────────── */}
      {showRequest && (
        <div style={{ background:'#fff', borderRadius:16, padding:28, border:'1px solid #e2e8f0', marginBottom:24 }}>
          <div style={{ fontWeight:700, fontSize:16, color:'#0f2040', marginBottom:18 }}>Request a beneficiary change</div>

          <form onSubmit={submitRequest} style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Request type */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:10 }}>What would you like to do?</div>
              <div style={{ display:'flex', gap:8 }}>
                {(['ADD','UPDATE','REMOVE'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setReqType(t)} style={{
                    padding:'9px 20px', borderRadius:9, fontSize:13, fontWeight:600,
                    border:`1.5px solid ${reqType===t ? '#1e3a6e' : '#e2e8f0'}`,
                    background: reqType===t ? '#1e3a6e' : '#f8fafc',
                    color:      reqType===t ? '#fff'    : '#64748b',
                    cursor:'pointer', transition:'all 0.15s',
                  }}>
                    {t==='ADD'?'➕ Add new':t==='UPDATE'?'✏️ Update':'🗑 Remove'}
                  </button>
                ))}
              </div>
            </div>

            {/* ADD — select type */}
            {reqType === 'ADD' && (
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:10 }}>Beneficiary type *</div>
                <div className="type-grid">
                  {Object.entries(TYPE_CONFIG).map(([key, c]) => (
                    <button key={key} type="button" onClick={() => setSelType(key)} style={{
                      padding:'12px 10px', borderRadius:10, textAlign:'center', cursor:'pointer',
                      border:`2px solid ${selType===key ? c.color : '#e2e8f0'}`,
                      background: selType===key ? c.bg : '#f8fafc',
                      transition:'all 0.15s',
                    }}>
                      <div style={{ fontSize:20, marginBottom:4 }}>{c.icon}</div>
                      <div style={{ fontSize:11, fontWeight:600, color: selType===key ? c.color : '#475569', lineHeight:1.3 }}>{c.label}</div>
                    </button>
                  ))}
                </div>
                <div style={{ background:cfg.bg, borderRadius:9, padding:'10px 14px', marginTop:10, border:`1px solid ${cfg.color}30` }}>
                  <div style={{ fontSize:13, color:cfg.color, fontWeight:600, marginBottom:2 }}>{cfg.icon} {cfg.label}</div>
                  <div style={{ fontSize:12, color:cfg.color, opacity:0.85 }}>{cfg.desc}</div>
                  <div style={{ fontSize:12, color:cfg.color, opacity:0.7, marginTop:2 }}>📎 {cfg.docs}</div>
                </div>
              </div>
            )}

            {/* UPDATE / REMOVE — select existing dependent */}
            {(reqType === 'UPDATE' || reqType === 'REMOVE') && (
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8 }}>Which beneficiary? *</div>
                {dependents.length === 0 ? (
                  <div style={{ fontSize:13, color:'#94a3b8', padding:'12px 16px', background:'#f8fafc', borderRadius:9, border:'1px solid #e2e8f0' }}>
                    No beneficiaries registered yet.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {dependents.map(d => {
                      const dc = TYPE_CONFIG[d.type] || TYPE_CONFIG.NEXT_OF_KIN
                      return (
                        <label key={d.id} style={{
                          display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10, cursor:'pointer',
                          border:`1.5px solid ${selDepId===d.id ? dc.color : '#e2e8f0'}`,
                          background: selDepId===d.id ? dc.bg : '#f8fafc',
                          transition:'all 0.15s',
                        }}>
                          <input type="radio" name="dep" value={d.id} checked={selDepId===d.id}
                            onChange={() => setSelDepId(d.id)}
                            style={{ accentColor:dc.color, width:16, height:16, flexShrink:0 }}/>
                          <span style={{ fontSize:18 }}>{dc.icon}</span>
                          <div>
                            <div style={{ fontWeight:600, fontSize:14, color:'#0f2040' }}>{d.fullName}</div>
                            <div style={{ fontSize:12, color:'#64748b' }}>{dc.label}{d.relationship && ` · ${d.relationship}`}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ADD / UPDATE — form fields */}
            {(reqType === 'ADD' || reqType === 'UPDATE') && (
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:10 }}>
                  {reqType==='ADD' ? 'Beneficiary details' : 'Fields to update (fill only what needs changing)'}
                </div>
                <div className="form-grid">
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 }}>
                      Full name {reqType==='ADD'?'*':''}
                    </label>
                    <input value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))}
                      placeholder="As on national ID or birth certificate"
                      style={iS} onFocus={iF} onBlur={iB}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 }}>Date of birth</label>
                    <input type="date" value={form.dateOfBirth} onChange={e=>setForm(p=>({...p,dateOfBirth:e.target.value}))}
                      max={new Date().toISOString().split('T')[0]} style={iS} onFocus={iF} onBlur={iB}/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 }}>Phone number</label>
                    <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
                      placeholder="e.g. 0712345678" style={iS} onFocus={iF} onBlur={iB}/>
                  </div>
                  {selType === 'CHILD_UNDER_18' && reqType === 'ADD' && (
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 }}>Birth certificate number *</label>
                      <input value={form.birthCertNumber} onChange={e=>setForm(p=>({...p,birthCertNumber:e.target.value}))}
                        placeholder="e.g. 12345678" style={iS} onFocus={iF} onBlur={iB}/>
                    </div>
                  )}
                  {selType !== 'CHILD_UNDER_18' && (
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 }}>
                        National ID {reqType==='ADD'?'*':''}
                      </label>
                      <input value={form.nationalId} onChange={e=>setForm(p=>({...p,nationalId:e.target.value}))}
                        placeholder="e.g. 12345678" style={iS} onFocus={iF} onBlur={iB}/>
                    </div>
                  )}
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 }}>Relationship / description</label>
                    <input value={form.relationship} onChange={e=>setForm(p=>({...p,relationship:e.target.value}))}
                      placeholder="e.g. Eldest daughter, Spouse, etc."
                      style={iS} onFocus={iF} onBlur={iB}/>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 }}>
                {reqType==='REMOVE' ? 'Reason for removal *' : 'Additional notes (optional)'}
              </label>
              <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                rows={3} placeholder={reqType==='REMOVE'?'Reason for removal...':'Any additional information for the secretary...'}
                style={{ ...iS, resize:'vertical' as any }} onFocus={iF} onBlur={iB}/>
            </div>

            <div style={{ background:'#fef3c7', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#92400e', border:'1px solid #fde68a' }}>
              ⏳ Requests are processed by the welfare secretary within 2 working days. You will be notified via SMS and email once completed.
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button type="submit" disabled={sending}
                style={{ background:sending?'#94a3b8':'#1e3a6e', color:'#fff', padding:'11px 26px', borderRadius:9, fontSize:14, fontWeight:600, border:'none', cursor:sending?'not-allowed':'pointer' }}>
                {sending ? 'Sending...' : '📨 Send request'}
              </button>
              <button type="button" onClick={resetForm}
                style={{ background:'#f1f5f9', color:'#475569', padding:'11px 20px', borderRadius:9, fontSize:14, border:'none', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── My requests history ────────────────────────────────────────────── */}
      {requests.length > 0 && (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', marginBottom:24, overflow:'hidden' }}>
          <div style={{ padding:'13px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:600, fontSize:14, color:'#0f2040', display:'flex', justifyContent:'space-between' }}>
            <span>My requests</span>
            <span style={{ fontSize:12, color:'#94a3b8', fontWeight:400 }}>{requests.length} total</span>
          </div>
          <div>
            {requests.map((r: any, i: number) => {
              const sc = REQ_STATUS_CONFIG[r.status as keyof typeof REQ_STATUS_CONFIG] || REQ_STATUS_CONFIG.PENDING
              const depCfg = r.dependentType ? TYPE_CONFIG[r.dependentType] : null
              return (
                <div key={r.id} style={{
                  padding:'14px 20px', borderBottom: i < requests.length-1 ? '1px solid #f1f5f9' : 'none',
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12,
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:99,
                        background: r.type==='ADD'?'#dcfce7':r.type==='REMOVE'?'#fee2e2':'#e0f2fe',
                        color:      r.type==='ADD'?'#15803d':r.type==='REMOVE'?'#b91c1c':'#0369a1',
                      }}>
                        {r.type==='ADD'?'➕ Add':r.type==='UPDATE'?'✏️ Update':'🗑 Remove'}
                      </span>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:99, background:sc.bg, color:sc.color }}>
                        {sc.icon} {sc.label}
                      </span>
                      {depCfg && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:depCfg.bg, color:depCfg.color, fontWeight:600 }}>
                          {depCfg.icon} {depCfg.label}
                        </span>
                      )}
                    </div>
                    {r.fullName && <div style={{ fontSize:13, fontWeight:500, color:'#0f2040' }}>{r.fullName}</div>}
                    {r.notes    && <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{r.notes}</div>}
                    {r.status === 'REJECTED' && r.rejectionReason && (
                      <div style={{ fontSize:12, color:'#b91c1c', marginTop:4, background:'#fef2f2', padding:'6px 10px', borderRadius:7, border:'1px solid #fecaca' }}>
                        Reason: {r.rejectionReason}
                      </div>
                    )}
                    {r.status === 'APPROVED' && r.processedBy && (
                      <div style={{ fontSize:11, color:'#15803d', marginTop:4 }}>
                        Processed by {r.processedBy.fullName} · {new Date(r.processedAt).toLocaleDateString('en-KE', {day:'numeric',month:'short',year:'numeric'})}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:'#94a3b8', flexShrink:0, textAlign:'right' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-KE', {day:'numeric',month:'short',year:'numeric'})}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Beneficiaries list ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {Array(3).fill(0).map((_,i) => (
            <div key={i} style={{ height:100, background:'#f1f5f9', borderRadius:14, animation:'pulse 1.5s ease infinite' }}/>
          ))}
        </div>
      ) : dependents.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:16, padding:56, border:'1px solid #e2e8f0', textAlign:'center', color:'#94a3b8' }}>
          <div style={{ fontSize:44, marginBottom:12 }}>👥</div>
          <div style={{ fontWeight:600, color:'#64748b', marginBottom:6, fontSize:16 }}>No beneficiaries registered</div>
          <div style={{ fontSize:13, marginBottom:20 }}>Contact the welfare secretary or use the request form above to add your beneficiaries.</div>
          <button onClick={() => setShowRequest(true)}
            style={{ background:'#1e3a6e', color:'#fff', padding:'10px 22px', borderRadius:9, fontSize:14, fontWeight:600, border:'none', cursor:'pointer' }}>
            + Request to add beneficiary
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Next of Kin */}
          {nextOfKin && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
                ⭐ Primary Beneficiary (Next of Kin)
              </div>
              <div style={{ background:'linear-gradient(135deg,#fdf4ff,#f5f3ff)', borderRadius:14, padding:'22px 26px', border:'2px solid #e9d5ff', display:'flex', gap:18, alignItems:'flex-start', flexWrap:'wrap' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>⭐</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:17, color:'#0f2040', marginBottom:6 }}>{nextOfKin.fullName}</div>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:13, color:'#64748b' }}>
                    {nextOfKin.relationship && <span>👤 {nextOfKin.relationship}</span>}
                    {nextOfKin.phone        && <span>📞 {nextOfKin.phone}</span>}
                    {nextOfKin.nationalId   && <span>🪪 ID: {nextOfKin.nationalId}</span>}
                    {nextOfKin.dateOfBirth  && <span>🎂 Age: {calcAge(nextOfKin.dateOfBirth)} yrs</span>}
                  </div>
                  <div style={{ marginTop:10, fontSize:12, color:'#7c3aed', fontWeight:500, background:'rgba(124,58,237,0.08)', padding:'4px 12px', borderRadius:99, display:'inline-block' }}>
                    Receives death benefits on your behalf
                  </div>
                </div>
                {nextOfKin.isDeceased && (
                  <span style={{ fontSize:11, background:'#f1f5f9', color:'#64748b', padding:'3px 10px', borderRadius:99, fontWeight:600, flexShrink:0 }}>⚫ Deceased</span>
                )}
              </div>
            </div>
          )}

          {/* Other dependents */}
          {others.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
                Registered Dependents ({others.length})
              </div>
              <div className="ben-grid">
                {others.map(d => {
                  const dc  = TYPE_CONFIG[d.type] || TYPE_CONFIG.NEXT_OF_KIN
                  const age = d.dateOfBirth ? calcAge(d.dateOfBirth) : null
                  return (
                    <div key={d.id} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:`1.5px solid ${d.isDeceased?'#e2e8f0':dc.color+'30'}`, opacity:d.isDeceased?0.6:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                        <div style={{ width:42, height:42, borderRadius:'50%', background:dc.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                          {d.isDeceased ? '⚫' : dc.icon}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:14, color:d.isDeceased?'#94a3b8':'#0f2040', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.fullName}</div>
                          <div style={{ fontSize:11, color:dc.color, fontWeight:600 }}>{dc.label}</div>
                        </div>
                        {d.isDeceased && <span style={{ fontSize:10, background:'#f1f5f9', color:'#64748b', padding:'2px 8px', borderRadius:99, fontWeight:600, flexShrink:0 }}>⚫ Deceased</span>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:12, color:'#64748b' }}>
                        {d.relationship    && <div>👤 {d.relationship}</div>}
                        {age !== null      && <div>🎂 Age: {age} years old</div>}
                        {d.phone           && <div>📞 {d.phone}</div>}
                        {d.nationalId      && <div>🪪 ID: {d.nationalId}</div>}
                        {d.birthCertNumber && <div>📋 BC: {d.birthCertNumber}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Missing next of kin warning */}
          {!nextOfKin && (
            <div style={{ background:'#fef3c7', borderRadius:12, padding:'16px 20px', border:'1px solid #fde68a', display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ fontSize:20, flexShrink:0 }}>⚠️</div>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:'#92400e', marginBottom:4 }}>No Next of Kin registered</div>
                <div style={{ fontSize:13, color:'#92400e', lineHeight:1.6 }}>
                  You have not registered a Next of Kin. They will receive death benefits on your behalf. Please submit a request to add one.
                </div>
                <button onClick={() => { setShowRequest(true); setReqType('ADD'); setSelType('NEXT_OF_KIN'); window.scrollTo({ top:0, behavior:'smooth' }) }}
                  style={{ marginTop:10, background:'#b45309', color:'#fff', padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                  + Add Next of Kin
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
