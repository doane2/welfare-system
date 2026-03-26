'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
  APPROVED: {bg:'#dcfce7',color:'#15803d'},
  PENDING:  {bg:'#fef3c7',color:'#b45309'},
  REJECTED: {bg:'#fee2e2',color:'#b91c1c'},
}

export default function AdminContributionsPage() {
  const { user }                    = useAuth()
  const router                      = useRouter()
  const [contributions, setC]       = useState<any[]>([])
  const [loading,  setLoading]      = useState(true)
  const [total,    setTotal]        = useState(0)
  const [page,     setPage]         = useState(1)
  const [status,   setStatus]       = useState('ALL')
  const [type,     setType]         = useState('ALL')
  const [acting,   setActing]       = useState<string|null>(null)
  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: LIMIT }
      if (status !== 'ALL') params.status = status
      if (type   !== 'ALL') params.type   = type
      const { data } = await api.get('/contributions', { params })
      setC(data.contributions || [])
      setTotal(data.total || 0)
    } catch { toast.error('Failed to load contributions') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, status, type])

  const approve = async (id: string) => {
    setActing(id)
    try {
      await api.patch(`/contributions/${id}/approve`)
      toast.success('Contribution approved!')
      load()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setActing(null) }
  }

  const reject = async (id: string) => {
    setActing(id)
    try {
      await api.patch(`/contributions/${id}/reject`)
      toast.success('Contribution rejected.')
      load()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setActing(null) }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const canAct     = ['SUPER_ADMIN','TREASURER'].includes(user?.role)

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'#0f2040', marginBottom:4 }}>Contributions</h1>
        <p style={{ fontSize:14, color:'#64748b' }}>All member contribution records — approve, reject or edit inline via member detail</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4 }}>
          {['ALL','PENDING','APPROVED','REJECTED'].map(f => (
            <button key={f} onClick={() => { setStatus(f); setPage(1) }} style={{
              padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer',
              border: status===f ? 'none' : '1px solid #e2e8f0',
              background: status===f ? '#1e3a6e' : '#fff',
              color: status===f ? '#fff' : '#64748b',
            }}>{f === 'ALL' ? 'All status' : f.toLowerCase()}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {['ALL','MONTHLY','REGISTRATION','EMERGENCY'].map(f => (
            <button key={f} onClick={() => { setType(f); setPage(1) }} style={{
              padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer',
              border: type===f ? 'none' : '1px solid #e2e8f0',
              background: type===f ? '#0369a1' : '#fff',
              color: type===f ? '#fff' : '#64748b',
            }}>{f === 'ALL' ? 'All types' : f.toLowerCase()}</button>
          ))}
        </div>
        <span style={{ marginLeft:'auto', fontSize:13, color:'#94a3b8', alignSelf:'center' }}>{total} records</span>
      </div>

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['Member','Period','Type','Amount','Paid','Status', canAct ? 'Action' : ''].filter(Boolean).map(h => (
                <th key={h} style={{ textAlign:'left', padding:'11px 16px', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(0).map((_,i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  {Array(canAct ? 7 : 6).fill(0).map((_,j) => (
                    <td key={j} style={{ padding:'13px 16px' }}>
                      <div style={{ height:13, background:'#f1f5f9', borderRadius:4, animation:'pulse 1.5s ease infinite' }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : contributions.length === 0 ? (
              <tr><td colSpan={canAct ? 7 : 6} style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>No contributions found</td></tr>
            ) : contributions.map(c => {
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.PENDING
              return (
                <tr key={c.id} style={{ borderBottom:'1px solid #f1f5f9', cursor:'pointer', transition:'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#fafafa'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
                >
                  <td style={{ padding:'13px 16px' }}
                    onClick={() => router.push(`/admin/members/${c.user?.id}?tab=contributions`)}>
                    <div style={{ fontWeight:600, color:'#0f2040', fontSize:13 }}>{c.user?.fullName}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace' }}>{c.user?.memberNumber}</div>
                  </td>
                  <td style={{ padding:'13px 16px', fontWeight:500, color:'#0f2040' }}>{c.period || '—'}</td>
                  <td style={{ padding:'13px 16px' }}>
                    <span style={{ fontSize:11, background:'#eef2ff', color:'#1e3a6e', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>{c.type}</span>
                  </td>
                  <td style={{ padding:'13px 16px', fontWeight:700, color:'#0f2040' }}>KES {Number(c.amount).toLocaleString()}</td>
                  <td style={{ padding:'13px 16px', fontSize:13, color: c.paid ? '#15803d' : '#dc2626' }}>{c.paid ? '✓ Yes' : '✗ No'}</td>
                  <td style={{ padding:'13px 16px' }}>
                    <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:sc.bg, color:sc.color }}>
                      {c.status.toLowerCase()}
                    </span>
                  </td>
                  {canAct && (
                    <td style={{ padding:'13px 16px' }}>
                      {c.status === 'PENDING' ? (
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => approve(c.id)} disabled={acting===c.id} style={{ padding:'5px 12px', borderRadius:7, background:acting===c.id?'#94a3b8':'#16a34a', color:'#fff', border:'none', cursor:'pointer', fontSize:11, fontWeight:600 }}>
                            {acting===c.id?'...':'✓ Approve'}
                          </button>
                          <button onClick={() => reject(c.id)} disabled={acting===c.id} style={{ padding:'5px 10px', borderRadius:7, background:'none', color:'#dc2626', border:'1px solid #fecaca', cursor:'pointer', fontSize:11 }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => router.push(`/admin/members/${c.user?.id}`)} style={{ padding:'5px 12px', borderRadius:7, background:'#f1f5f9', color:'#1e3a6e', border:'1px solid #e2e8f0', cursor:'pointer', fontSize:11, fontWeight:500 }}>
                          View member
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 20px', borderTop:'1px solid #e2e8f0' }}>
            <span style={{ fontSize:13, color:'#94a3b8' }}>Page {page} of {totalPages} · {total} records</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:13, cursor:'pointer', color:'#475569' }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:13, cursor:'pointer', color:'#475569' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
