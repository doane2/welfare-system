'use client'
import { useEffect, useState, useCallback } from 'react'
import api   from '../../../lib/api'
import toast from 'react-hot-toast'

type Announcement = {
  id: string; title: string; content: string
  active: boolean; priority: boolean; attachmentUrl?: string
  createdAt: string; updatedAt: string
}

const iS: any = {
  width:'100%', padding:'11px 14px', borderRadius:9,
  border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box',
}
const iF = (e:any) => e.target.style.borderColor = '#1e3a6e'
const iB = (e:any) => e.target.style.borderColor = '#e2e8f0'

const EMPTY = { title:'', content:'', active:true, priority:false, attachmentUrl:'' }

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stats,  setStats]   = useState({ total:0, active:0, inactive:0, priority:0 })
  const [loading,setLoading] = useState(true)
  const [search, setSearch]  = useState('')
  const [filter, setFilter]  = useState<'ALL'|'ACTIVE'|'INACTIVE'|'PRIORITY'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<string|null>(null)
  const [form,     setForm]     = useState({ ...EMPTY })
  const [saving,   setSaving]   = useState(false)
  const [preview,  setPreview]  = useState(false)
  const [charCount,setCharCount]= useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit:50 }
      if (filter === 'ACTIVE')   params.active = 'true'
      if (filter === 'INACTIVE') params.active = 'false'
      if (search) params.search = search
      const { data } = await api.get('/announcements', { params })
      let list = data.announcements || []
      if (filter === 'PRIORITY') list = list.filter((a:Announcement) => a.priority)
      setAnnouncements(list)
      if (data.stats) setStats(data.stats)
    } catch { toast.error('Failed to load announcements') }
    finally  { setLoading(false) }
  }, [filter, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCharCount(form.content.length) }, [form.content])

  const openCreate = () => {
    setEditId(null)
    setForm({ ...EMPTY })
    setPreview(false)
    setShowForm(true)
  }

  const openEdit = (a: Announcement) => {
    setEditId(a.id)
    setForm({ title:a.title, content:a.content, active:a.active, priority:a.priority, attachmentUrl:a.attachmentUrl||'' })
    setPreview(false)
    setShowForm(true)
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return }
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/announcements/${editId}`, form)
        toast.success('Announcement updated!')
      } else {
        await api.post('/announcements', form)
        toast.success(form.active ? '📢 Announcement posted! Members notified via SMS & email.' : 'Announcement saved as draft.')
      }
      setShowForm(false)
      setEditId(null)
      setForm({ ...EMPTY })
      load()
    } catch (e:any) {
      toast.error(e.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const toggle = async (id: string) => {
    try {
      await api.patch(`/announcements/${id}/toggle`)
      toast.success('Status updated')
      load()
    } catch { toast.error('Failed') }
  }

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      await api.delete(`/announcements/${id}`)
      toast.success('Deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const cancelForm = () => { setShowForm(false); setEditId(null); setForm({ ...EMPTY }) }

  return (
    <div style={{ padding:'32px 36px' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'#0f2040', marginBottom:4 }}>Announcements</h1>
          <p style={{ fontSize:14, color:'#64748b' }}>Post notices · sent instantly via SMS & email to all active members</p>
        </div>
        <button onClick={openCreate}
          style={{ background:'#1e3a6e', color:'#fff', padding:'10px 22px', borderRadius:9, fontSize:14, fontWeight:600, border:'none', cursor:'pointer' }}>
          + New Announcement
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total',    value:stats.total,    color:'#1e3a6e', bg:'#eef2ff' },
          { label:'Active',   value:stats.active,   color:'#15803d', bg:'#dcfce7' },
          { label:'Inactive', value:stats.inactive, color:'#64748b', bg:'#f1f5f9' },
          { label:'Pinned',   value:stats.priority, color:'#b45309', bg:'#fef3c7' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'16px 20px', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Create / Edit form ───────────────────────────────────────────── */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:16, padding:28, border:'2px solid #e2e8f0', marginBottom:28 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontWeight:700, fontSize:16, color:'#0f2040' }}>
              {editId ? '✏️ Edit Announcement' : '📢 New Announcement'}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setPreview(p => !p)}
                style={{ padding:'7px 14px', borderRadius:8, background:preview?'#1e3a6e':'#f1f5f9', color:preview?'#fff':'#475569', border:'none', cursor:'pointer', fontSize:13, fontWeight:500 }}>
                {preview ? '✏️ Edit' : '👁 Preview'}
              </button>
            </div>
          </div>

          {preview ? (
            /* Preview mode */
            <div style={{ background:'#f8fafc', borderRadius:12, padding:24, border:'1px solid #e2e8f0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                {form.priority && <span style={{ fontSize:11, background:'#fef3c7', color:'#b45309', padding:'2px 10px', borderRadius:99, fontWeight:600 }}>📌 Pinned</span>}
                <span style={{ fontSize:11, background: form.active?'#dcfce7':'#f1f5f9', color:form.active?'#15803d':'#64748b', padding:'2px 10px', borderRadius:99, fontWeight:600 }}>
                  {form.active ? 'Active' : 'Draft'}
                </span>
              </div>
              <div style={{ fontWeight:700, fontSize:17, color:'#0f2040', marginBottom:10, borderLeft:'3px solid #e6b020', paddingLeft:14 }}>{form.title || 'Untitled'}</div>
              <div style={{ fontSize:14, color:'#475569', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{form.content || 'No content yet...'}</div>
              {form.attachmentUrl && (
                <a href={form.attachmentUrl} target="_blank" rel="noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:12, fontSize:13, color:'#1e3a6e', textDecoration:'none', background:'#eef2ff', padding:'6px 12px', borderRadius:7 }}>
                  📎 View attachment
                </a>
              )}
            </div>
          ) : (
            /* Edit mode */
            <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>Title *</label>
                <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))}
                  placeholder="e.g. Monthly meeting this Saturday"
                  style={iS} onFocus={iF} onBlur={iB} maxLength={120} />
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:3, textAlign:'right' }}>{form.title.length}/120</div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Message *
                  <span style={{ marginLeft:8, fontSize:11, color: charCount > 500 ? '#dc2626' : '#94a3b8', fontWeight:400 }}>{charCount} characters</span>
                </label>
                <textarea value={form.content} onChange={e => setForm(p=>({...p,content:e.target.value}))}
                  rows={5} placeholder="Full announcement message..."
                  style={{ ...iS, resize:'vertical' as any }} onFocus={iF} onBlur={iB} />
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Attachment URL <span style={{ fontWeight:400, color:'#94a3b8' }}>(optional — link to PDF, image, etc.)</span>
                </label>
                <input value={form.attachmentUrl} onChange={e => setForm(p=>({...p,attachmentUrl:e.target.value}))}
                  placeholder="https://..."
                  style={iS} onFocus={iF} onBlur={iB} />
              </div>

              <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.active} onChange={e=>setForm(p=>({...p,active:e.target.checked}))}
                    style={{ width:16, height:16, accentColor:'#1e3a6e' }}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Send notifications</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>SMS + email to all active members</div>
                  </div>
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.checked}))}
                    style={{ width:16, height:16, accentColor:'#b45309' }}/>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>📌 Pin to top</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>Appears first on member dashboard</div>
                  </div>
                </label>
              </div>

              {!form.active && (
                <div style={{ background:'#f8fafc', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#64748b', border:'1px solid #e2e8f0' }}>
                  💡 This will be saved as a draft — no SMS or email will be sent. Activate it later when ready.
                </div>
              )}

              <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                <button type="submit" disabled={saving}
                  style={{ background:saving?'#94a3b8':'#1e3a6e', color:'#fff', padding:'11px 28px', borderRadius:9, fontSize:14, fontWeight:600, border:'none', cursor:saving?'not-allowed':'pointer' }}>
                  {saving ? 'Saving...' : editId ? '💾 Save Changes' : form.active ? '📢 Post Announcement' : '💾 Save Draft'}
                </button>
                <button type="button" onClick={cancelForm}
                  style={{ background:'#f1f5f9', color:'#475569', padding:'11px 20px', borderRadius:9, fontSize:14, border:'none', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Search + Filter ──────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>{setSearch(e.target.value)}}
          placeholder="Search announcements..."
          style={{ ...iS, width:260, padding:'9px 14px' }} onFocus={iF} onBlur={iB} />
        <div style={{ display:'flex', gap:2, background:'#f1f5f9', padding:4, borderRadius:10 }}>
          {(['ALL','ACTIVE','INACTIVE','PRIORITY'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:500,
              border:'none', cursor:'pointer',
              background: filter===f ? '#fff' : 'transparent',
              color:       filter===f ? '#0f2040' : '#94a3b8',
              boxShadow:   filter===f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
              {f === 'PRIORITY' ? '📌 Pinned' : f.charAt(0)+f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? (
          Array(4).fill(0).map((_,i) => (
            <div key={i} style={{ height:110, background:'#f1f5f9', borderRadius:14, animation:'pulse 1.5s ease infinite' }}/>
          ))
        ) : announcements.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', color:'#94a3b8' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📢</div>
            <div style={{ fontWeight:600, color:'#64748b', marginBottom:6 }}>No announcements found</div>
            <div style={{ fontSize:13 }}>
              {search ? 'Try a different search term' : 'Click "+ New Announcement" to create one'}
            </div>
          </div>
        ) : announcements.map(a => (
          <div key={a.id} style={{
            background:'#fff', borderRadius:14, padding:'20px 24px',
            border:`1.5px solid ${a.priority ? '#fde68a' : a.active ? '#e2e8f0' : '#f1f5f9'}`,
            opacity: a.active ? 1 : 0.7,
            transition:'all 0.15s',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
              <div style={{ flex:1, minWidth:0 }}>
                {/* Badges */}
                <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                  {a.priority && (
                    <span style={{ fontSize:11, background:'#fef3c7', color:'#b45309', padding:'2px 10px', borderRadius:99, fontWeight:600 }}>📌 Pinned</span>
                  )}
                  <span style={{ fontSize:11, background:a.active?'#dcfce7':'#f1f5f9', color:a.active?'#15803d':'#64748b', padding:'2px 10px', borderRadius:99, fontWeight:600 }}>
                    {a.active ? '● Active' : '○ Inactive'}
                  </span>
                </div>
                {/* Title */}
                <div style={{ fontWeight:700, fontSize:15, color:'#0f2040', marginBottom:6 }}>{a.title}</div>
                {/* Content preview */}
                <div style={{ fontSize:13, color:'#64748b', lineHeight:1.65,
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {a.content}
                </div>
                {/* Attachment */}
                {a.attachmentUrl && (
                  <a href={a.attachmentUrl} target="_blank" rel="noreferrer"
                    style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:8, fontSize:12, color:'#1e3a6e', textDecoration:'none' }}>
                    📎 Attachment
                  </a>
                )}
                {/* Date */}
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:8 }}>
                  {new Date(a.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}
                  {a.updatedAt !== a.createdAt && ` · Updated ${new Date(a.updatedAt).toLocaleDateString('en-KE', { day:'numeric', month:'short' })}`}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                <button onClick={() => openEdit(a)}
                  style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:500, background:'#eef2ff', color:'#1e3a6e', border:'none', cursor:'pointer' }}>
                  Edit
                </button>
                <button onClick={() => toggle(a.id)}
                  style={{ padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:500, background:'#f1f5f9', color:'#475569', border:'none', cursor:'pointer' }}>
                  {a.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => del(a.id, a.title)}
                  style={{ padding:'7px 12px', borderRadius:8, fontSize:12, background:'none', color:'#dc2626', border:'1px solid #fecaca', cursor:'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
