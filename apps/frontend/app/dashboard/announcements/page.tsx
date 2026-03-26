'use client'
import { useEffect, useState, useCallback } from 'react'
import api   from '../../../lib/api'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'crater_read_announcements'

function getReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) }
  catch { return new Set() }
}
function markRead(id: string) {
  const ids = getReadIds(); ids.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}
function markAllRead(ids: string[]) {
  const existing = getReadIds(); ids.forEach(id => existing.add(id))
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing]))
}

export default function MemberAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set())
  const [readIds,       setReadIds]       = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/announcements/active')
      setAnnouncements(data.announcements || [])
      setReadIds(getReadIds())
    } catch { toast.error('Failed to load announcements') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else {
        next.add(id)
        markRead(id)
        setReadIds(getReadIds())
      }
      return next
    })
  }

  const handleMarkAllRead = () => {
    markAllRead(announcements.map(a => a.id))
    setReadIds(getReadIds())
    toast.success('All marked as read')
  }

  const filtered = announcements.filter(a =>
    !search ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.content.toLowerCase().includes(search.toLowerCase())
  )

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length

  return (
    <div style={{ padding:'32px 36px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'#0f2040', marginBottom:4 }}>
            Announcements
            {unreadCount > 0 && (
              <span style={{ marginLeft:12, fontSize:14, background:'#1e3a6e', color:'#fff', padding:'2px 10px', borderRadius:99, fontWeight:600, verticalAlign:'middle' }}>
                {unreadCount} new
              </span>
            )}
          </h1>
          <p style={{ fontSize:14, color:'#64748b' }}>
            Notices and updates from the welfare administration
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead}
            style={{ background:'#f1f5f9', color:'#475569', padding:'9px 18px', borderRadius:9, fontSize:13, fontWeight:500, border:'1px solid #e2e8f0', cursor:'pointer' }}>
            Mark all as read
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom:20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search announcements..."
          style={{ width:300, padding:'10px 14px', borderRadius:9, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none' }}
          onFocus={e => e.target.style.borderColor='#1e3a6e'}
          onBlur={e  => e.target.style.borderColor='#e2e8f0'} />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {Array(5).fill(0).map((_,i) => (
            <div key={i} style={{ height:90, background:'#f1f5f9', borderRadius:14, animation:'pulse 1.5s ease infinite' }}/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:64, background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📢</div>
          <div style={{ fontWeight:600, color:'#64748b', marginBottom:6 }}>
            {search ? 'No results found' : 'No announcements yet'}
          </div>
          <div style={{ fontSize:13 }}>
            {search ? 'Try a different search term' : 'New announcements from the admin will appear here'}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(a => {
            const isRead     = readIds.has(a.id)
            const isExpanded = expanded.has(a.id)
            return (
              <div key={a.id}
                style={{
                  background:'#fff', borderRadius:14,
                  border:`1.5px solid ${a.priority ? '#fde68a' : isRead ? '#f1f5f9' : '#bfdbfe'}`,
                  overflow:'hidden', transition:'all 0.2s',
                  boxShadow: !isRead ? '0 2px 8px rgba(30,58,110,0.06)' : 'none',
                }}>
                {/* Card header */}
                <div
                  onClick={() => toggle(a.id)}
                  style={{ padding:'18px 22px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Badges */}
                    <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
                      {a.priority && (
                        <span style={{ fontSize:11, background:'#fef3c7', color:'#b45309', padding:'2px 10px', borderRadius:99, fontWeight:600 }}>📌 Pinned</span>
                      )}
                      {!isRead && (
                        <span style={{ fontSize:11, background:'#dbeafe', color:'#1d4ed8', padding:'2px 10px', borderRadius:99, fontWeight:600 }}>● New</span>
                      )}
                    </div>
                    {/* Title */}
                    <div style={{ fontWeight: isRead ? 600 : 700, fontSize:15, color:'#0f2040', marginBottom:4 }}>{a.title}</div>
                    {/* Preview */}
                    {!isExpanded && (
                      <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6,
                        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {a.content}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>
                      {new Date(a.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}
                    </div>
                  </div>
                  <div style={{ fontSize:18, color:'#94a3b8', flexShrink:0, transition:'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                    ▾
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding:'0 22px 20px', borderTop:'1px solid #f1f5f9' }}>
                    <div style={{ fontSize:14, color:'#374151', lineHeight:1.8, whiteSpace:'pre-wrap', paddingTop:16 }}>
                      {a.content}
                    </div>
                    {a.attachmentUrl && (
                      <a href={a.attachmentUrl} target="_blank" rel="noreferrer"
                        style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:14, fontSize:13, color:'#1e3a6e', textDecoration:'none', background:'#eef2ff', padding:'8px 16px', borderRadius:8, fontWeight:500 }}>
                        📎 View attachment
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
