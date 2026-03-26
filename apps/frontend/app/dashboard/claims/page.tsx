'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import api   from '../../../lib/api'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
type ClaimType   = 'MEDICAL' | 'DEATH' | 'EDUCATION'
type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface UploadedDoc { url: string; filename: string; mimeType: string }

// ── Config ────────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<ClaimType, { label:string; icon:string; bg:string; color:string; desc:string; docs:string }> = {
  MEDICAL:   { label:'Medical',   icon:'🏥', bg:'#fee2e2', color:'#b91c1c', desc:'Hospital bills, treatment costs, prescription receipts',  docs:'Hospital receipt, doctor\'s letter, prescription'    },
  DEATH:     { label:'Death',     icon:'🕊️', bg:'#f1f5f9', color:'#475569', desc:'Bereavement support for member or registered dependent',  docs:'Death certificate, burial permit, ID of deceased'    },
  EDUCATION: { label:'Education', icon:'🎓', bg:'#e0f2fe', color:'#0369a1', desc:'School fees, learning materials for member\'s children',  docs:'School admission letter, fee structure, report card' },
}

const STATUS_CONFIG: Record<ClaimStatus, { label:string; bg:string; color:string; icon:string }> = {
  PENDING:  { label:'Pending review', bg:'#fef3c7', color:'#b45309', icon:'⏳' },
  APPROVED: { label:'Approved',       bg:'#dcfce7', color:'#15803d', icon:'✓'  },
  REJECTED: { label:'Not approved',   bg:'#fee2e2', color:'#b91c1c', icon:'✕'  },
}

// ── Cloudinary config — read from env vars ────────────────────────────────────
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'welfare_claims'
const CLOUDINARY_CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    || ''

const iS: any = {
  width:'100%', padding:'10px 13px', borderRadius:8,
  border:'1.5px solid #e2e8f0', fontSize:13, outline:'none',
  boxSizing:'border-box', fontFamily:'inherit',
}
const iF = (e:any) => e.target.style.borderColor = '#1e3a6e'
const iB = (e:any) => e.target.style.borderColor = '#e2e8f0'

const css = `
  .claims-page { padding: 32px 36px; }
  .claims-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
  .type-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
  .form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .drop-zone { border: 2px dashed #e2e8f0; border-radius: 12px; padding: 28px; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; }
  .drop-zone:hover, .drop-zone.drag { border-color: #1e3a6e; background: #eef2ff; }
  @media (max-width: 900px) { .claims-page { padding: 24px; } .type-grid { grid-template-columns: repeat(3,1fr); } }
  @media (max-width: 640px) { .claims-page { padding: 20px 16px; } .form-grid { grid-template-columns: 1fr; } .type-grid { grid-template-columns: repeat(3,1fr); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes spin  { to { transform: rotate(360deg) } }
`

// ── File upload helper — direct browser → Cloudinary ─────────────────────────
async function uploadToCloudinary(
  file: File,
  onProgress: (pct: number) => void
): Promise<UploadedDoc> {
  // Guard: env vars must be set
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      'Cloudinary is not configured. Ask your administrator to set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.'
    )
  }
  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary upload preset is not configured. Ask your administrator to set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.'
    )
  }

  const fd = new FormData()
  fd.append('file',          file)
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  fd.append('folder',        'welfare/claims')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const r = JSON.parse(xhr.responseText)
          resolve({ url: r.secure_url, filename: file.name, mimeType: file.type })
        } catch {
          reject(new Error('Unexpected response from Cloudinary'))
        }
      } else {
        // Parse Cloudinary's error body for a useful message
        let msg = `Upload failed (HTTP ${xhr.status})`
        try {
          const errBody = JSON.parse(xhr.responseText)
          if (errBody?.error?.message) {
            msg = errBody.error.message
            // Common Cloudinary errors → friendly messages
            if (msg.includes('preset')) {
              msg = `Upload preset "${CLOUDINARY_UPLOAD_PRESET}" not found. Please create it as an unsigned preset in your Cloudinary dashboard.`
            } else if (msg.includes('cloud_name') || msg.includes('cloud name')) {
              msg = `Invalid Cloudinary cloud name "${CLOUDINARY_CLOUD_NAME}". Check NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.`
            }
          }
        } catch { /* ignore JSON parse error, use generic msg */ }
        reject(new Error(msg))
      }
    }

    xhr.onerror = () => reject(new Error('Network error — could not reach Cloudinary. Check your internet connection.'))
    xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'))
    xhr.timeout = 60_000 // 60 s

    xhr.send(fd)
  })
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MemberClaimsPage() {
  const [claims,    setClaims]    = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [expanded,  setExpanded]  = useState<string|null>(null)
  const [dragOver,  setDragOver]  = useState(false)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  // Form state
  const [claimType,     setClaimType]     = useState<ClaimType>('MEDICAL')
  const [title,         setTitle]         = useState('')
  const [description,   setDescription]   = useState('')
  const [amount,        setAmount]        = useState('')
  const [docs,          setDocs]          = useState<UploadedDoc[]>([])
  const [uploading,     setUploading]     = useState(false)
  const [uploadPct,     setUploadPct]     = useState(0)
  const [uploadingFile, setUploadingFile] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/claims?limit=50')
      setClaims(data.claims || [])
    } catch { toast.error('Failed to load claims') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setClaimType('MEDICAL'); setTitle(''); setDescription('')
    setAmount(''); setDocs([]); setShowForm(false)
  }

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    if (docs.length + arr.length > 5) { toast.error('Maximum 5 documents per claim'); return }

    for (const file of arr) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10 MB limit`); continue }

      // Match backend ALLOWED_MIMETYPES exactly (no gif — not supported by cloudinaryService)
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowed.includes(file.type)) {
        toast.error(`${file.name}: unsupported type. Allowed: JPG, PNG, WEBP, PDF`)
        continue
      }

      setUploading(true); setUploadingFile(file.name); setUploadPct(0)
      try {
        const uploaded = await uploadToCloudinary(file, pct => setUploadPct(pct))
        setDocs(prev => [...prev, uploaded])
        toast.success(`${file.name} uploaded`)
      } catch (err: any) {
        // Show the specific error message, not just a generic one
        toast.error(err.message || `Failed to upload ${file.name}`, { duration: 6000 })
        console.error('Upload error:', err)
      } finally {
        setUploading(false); setUploadingFile(''); setUploadPct(0)
      }
    }
  }

  const removeDoc = (i: number) => setDocs(prev => prev.filter((_, idx) => idx !== i))

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim())       { toast.error('Title is required');       return }
    if (!description.trim()) { toast.error('Description is required'); return }
    setSaving(true)
    try {
      await api.post('/claims', {
        type: claimType, title, description,
        amount: amount ? parseFloat(amount) : undefined,
        documents: docs,
      })
      toast.success('Claim submitted! You will be notified once reviewed.')
      resetForm(); load()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to submit claim') }
    finally { setSaving(false) }
  }

  const tc_form = TYPE_CONFIG[claimType]

  return (
    <div className="claims-page">
      <style>{css}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="claims-header">
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'#0f2040', marginBottom:4 }}>My Claims</h1>
          <p style={{ fontSize:14, color:'#64748b' }}>Submit and track your welfare claims</p>
        </div>
        <button onClick={() => showForm ? resetForm() : setShowForm(true)}
          style={{ background: showForm ? '#f1f5f9' : '#1e3a6e', color: showForm ? '#475569' : '#fff', padding:'10px 22px', borderRadius:9, fontSize:14, fontWeight:600, border:'none', cursor:'pointer' }}>
          {showForm ? 'Cancel' : '+ New Claim'}
        </button>
      </div>

      {/* ── Cloudinary config warning (dev helper) ─────────────────────────── */}
      {!CLOUDINARY_CLOUD_NAME && (
        <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#92400e' }}>
          ⚠️ <strong>Document uploads are disabled.</strong> NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set in your environment. You can still submit claims without documents.
        </div>
      )}

      {/* ── New claim form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:16, padding:28, border:'1px solid #e2e8f0', marginBottom:24 }}>
          <div style={{ fontWeight:700, fontSize:16, color:'#0f2040', marginBottom:6 }}>Submit a welfare claim</div>
          <div style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>All claims are reviewed within 5 working days. You will be notified by SMS and email.</div>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

            {/* Step 1 — Claim type */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:10 }}>1. Select claim type *</div>
              <div className="type-grid">
                {(Object.entries(TYPE_CONFIG) as [ClaimType, typeof TYPE_CONFIG[ClaimType]][]).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setClaimType(key)}
                    style={{
                      padding:'12px 10px', borderRadius:10, textAlign:'center', cursor:'pointer',
                      border: `2px solid ${claimType===key ? cfg.color : '#e2e8f0'}`,
                      background: claimType===key ? cfg.bg : '#f8fafc',
                      transition:'all 0.15s',
                    }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>{cfg.icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color: claimType===key ? cfg.color : '#475569' }}>{cfg.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ background: tc_form.bg, borderRadius:10, padding:'12px 16px', border:`1px solid ${tc_form.color}30` }}>
                <div style={{ fontSize:13, color: tc_form.color, fontWeight:600, marginBottom:4 }}>
                  {tc_form.icon} {tc_form.label} — {tc_form.desc}
                </div>
                <div style={{ fontSize:12, color: tc_form.color, opacity:0.8 }}>
                  📎 Required documents: {tc_form.docs}
                </div>
              </div>
            </div>

            {/* Step 2 — Details */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:10 }}>2. Claim details</div>
              <div className="form-grid">
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:6 }}>Title *</label>
                  <input value={title} onChange={e=>setTitle(e.target.value)}
                    placeholder={`e.g. ${claimType==='MEDICAL'?'Hospital bill for appendix surgery':claimType==='DEATH'?'Death of spouse John Doe':'Primary school fees — Form 1'}`}
                    style={iS} onFocus={iF} onBlur={iB} maxLength={150}/>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:3, textAlign:'right' }}>{title.length}/150</div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:6 }}>Amount requested (KES)</label>
                  <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                    placeholder="Optional — leave blank if unknown"
                    style={iS} onFocus={iF} onBlur={iB} min="0"/>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:6 }}>Description *</label>
                  <textarea value={description} onChange={e=>setDescription(e.target.value)}
                    rows={4} placeholder="Provide full details: what happened, when, where, who is affected and how much support is needed..."
                    style={{ ...iS, resize:'vertical' as any }} onFocus={iF} onBlur={iB}/>
                </div>
              </div>
            </div>

            {/* Step 3 — Documents */}
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>
                3. Supporting documents
                <span style={{ marginLeft:8, fontSize:11, color:'#94a3b8', fontWeight:400 }}>
                  ({docs.length}/5) — PDF, JPG, PNG, WEBP up to 10 MB each
                </span>
              </div>

              {/* Drop zone — only shown when Cloudinary is configured */}
              {CLOUDINARY_CLOUD_NAME && docs.length < 5 && !uploading && (
                <div
                  className={`drop-zone ${dragOver ? 'drag' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📎</div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#0f2040', marginBottom:4 }}>
                    Drop files here or click to browse
                  </div>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>{tc_form.docs}</div>
                  <input ref={fileInputRef} type="file" multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display:'none' }}
                    onChange={e => e.target.files && handleFiles(e.target.files)}/>
                </div>
              )}

              {/* Upload progress */}
              {uploading && (
                <div style={{ background:'#eef2ff', borderRadius:10, padding:'14px 18px', border:'1px solid #c7d2fe' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1e3a6e' }}>
                      Uploading {uploadingFile}...
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1e3a6e' }}>{uploadPct}%</div>
                  </div>
                  <div style={{ background:'#c7d2fe', borderRadius:99, height:6, overflow:'hidden' }}>
                    <div style={{ width:`${uploadPct}%`, height:'100%', background:'#1e3a6e', borderRadius:99, transition:'width 0.2s' }}/>
                  </div>
                </div>
              )}

              {/* Uploaded files */}
              {docs.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
                  {docs.map((d, i) => {
                    const isImg = d.mimeType?.startsWith('image/')
                    const isPdf = d.mimeType === 'application/pdf'
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#f8fafc', borderRadius:9, border:'1px solid #e2e8f0' }}>
                        {isImg ? (
                          <img src={d.url} alt={d.filename} style={{ width:40, height:40, borderRadius:6, objectFit:'cover', flexShrink:0 }}/>
                        ) : (
                          <div style={{ width:40, height:40, borderRadius:6, background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                            {isPdf ? '📄' : '📎'}
                          </div>
                        )}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#0f2040', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.filename}</div>
                          <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#1e3a6e', textDecoration:'none' }}>View file ↗</a>
                        </div>
                        <button type="button" onClick={() => removeDoc(i)}
                          style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:16, flexShrink:0, padding:'2px 4px' }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Submit */}
            <div style={{ display:'flex', gap:10, paddingTop:4 }}>
              <button type="submit" disabled={saving || uploading}
                style={{ background: (saving||uploading) ? '#94a3b8' : '#1e3a6e', color:'#fff', padding:'12px 28px', borderRadius:9, fontSize:14, fontWeight:600, border:'none', cursor:(saving||uploading)?'not-allowed':'pointer' }}>
                {saving ? 'Submitting...' : '🏥 Submit Claim'}
              </button>
              <button type="button" onClick={resetForm}
                style={{ background:'#f1f5f9', color:'#475569', padding:'12px 20px', borderRadius:9, fontSize:14, border:'none', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Claims list ─────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {loading ? (
          Array(4).fill(0).map((_,i) => (
            <div key={i} style={{ height:100, background:'#f1f5f9', borderRadius:14, animation:'pulse 1.5s ease infinite' }}/>
          ))
        ) : claims.length === 0 ? (
          <div style={{ background:'#fff', borderRadius:16, padding:56, border:'1px solid #e2e8f0', textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🏥</div>
            <div style={{ fontWeight:600, color:'#64748b', marginBottom:6 }}>No claims yet</div>
            <div style={{ fontSize:13 }}>Submit a claim when you need welfare support</div>
          </div>
        ) : claims.map(c => {
          const tc = TYPE_CONFIG[c.type as ClaimType]       || TYPE_CONFIG.MEDICAL
          const sc = STATUS_CONFIG[c.status as ClaimStatus] || STATUS_CONFIG.PENDING
          const isOpen = expanded === c.id

          return (
            <div key={c.id} style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${c.status==='APPROVED'?'#86efac':c.status==='REJECTED'?'#fecaca':'#e2e8f0'}`, overflow:'hidden' }}>
              <div style={{ padding:'18px 22px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}
                onClick={() => setExpanded(isOpen ? null : c.id)}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:99, background:tc.bg, color:tc.color }}>
                      {tc.icon} {tc.label}
                    </span>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:99, background:sc.bg, color:sc.color }}>
                      {sc.icon} {sc.label}
                    </span>
                    {c.documents?.length > 0 && (
                      <span style={{ fontSize:11, color:'#94a3b8' }}>📎 {c.documents.length} doc{c.documents.length>1?'s':''}</span>
                    )}
                  </div>
                  <div style={{ fontWeight:600, fontSize:15, color:'#0f2040', marginBottom:4 }}>{c.title}</div>
                  {!isOpen && (
                    <div style={{ fontSize:13, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {c.description}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:12, color:'#94a3b8', marginBottom:4 }}>
                    {new Date(c.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' })}
                  </div>
                  {c.amount && <div style={{ fontSize:13, fontWeight:600, color:'#1e3a6e' }}>KES {Number(c.amount).toLocaleString()}</div>}
                  <div style={{ fontSize:16, color:'#94a3b8', marginTop:4, transition:'transform 0.2s', transform: isOpen?'rotate(180deg)':'none' }}>▾</div>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding:'0 22px 20px', borderTop:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:14, color:'#374151', lineHeight:1.8, paddingTop:14, whiteSpace:'pre-wrap', marginBottom:16 }}>
                    {c.description}
                  </div>

                  {c.status === 'REJECTED' && c.rejectionReason && (
                    <div style={{ background:'#fef2f2', borderRadius:9, padding:'12px 16px', border:'1px solid #fecaca', marginBottom:14 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#b91c1c', marginBottom:4 }}>Reason for rejection</div>
                      <div style={{ fontSize:13, color:'#b91c1c' }}>{c.rejectionReason}</div>
                    </div>
                  )}

                  {c.reviewedBy && (
                    <div style={{ fontSize:12, color:'#94a3b8', marginBottom:14 }}>
                      Reviewed by {c.reviewedBy.fullName} · {new Date(c.updatedAt).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' })}
                    </div>
                  )}

                  {c.documents?.length > 0 && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8 }}>Supporting documents</div>
                      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                        {c.documents.map((d: any) => {
                          const isImg = d.mimeType?.startsWith('image/')
                          return (
                            <a key={d.id} href={d.url} target="_blank" rel="noreferrer"
                              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0', textDecoration:'none', fontSize:12, color:'#1e3a6e' }}>
                              {isImg
                                ? <img src={d.url} alt={d.filename} style={{ width:28, height:28, borderRadius:4, objectFit:'cover' }}/>
                                : <span>📄</span>
                              }
                              {d.filename}
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
