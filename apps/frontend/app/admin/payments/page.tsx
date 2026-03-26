'use client'
import { useEffect, useState } from 'react'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [acting,   setActing]   = useState<string | null>(null)
  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/mpesa/pending?page=${page}&limit=${LIMIT}`)
      setPayments(data.payments || [])
      setTotal(data.total || 0)
    } catch { toast.error('Failed to load pending payments') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page])

  const approve = async (id: string) => {
    setActing(id)
    try {
      await api.patch(`/mpesa/${id}/approve`)
      toast.success('Payment approved! Member notified via SMS & email.')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Approval failed')
    } finally { setActing(null) }
  }

  const reject = async (id: string) => {
    setActing(id)
    try {
      await api.patch(`/mpesa/${id}/reject`)
      toast.success('Payment rejected.')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rejection failed')
    } finally { setActing(null) }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'#0f2040', marginBottom:4 }}>Payment Approvals</h1>
        <p style={{ fontSize:14, color:'#64748b' }}>Oldest first — approve or reject each payment. Two-admin rule enforced.</p>
      </div>

      <div style={{ display:'flex', gap:16, marginBottom:24 }}>
        <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, padding:'12px 20px' }}>
          <span style={{ fontSize:13, color:'#92400e', fontWeight:500 }}>⏳ {total} pending approval{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['Member','Amount','Channel','M-Pesa Ref','Period','Date Received','Action'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_,i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  {Array(7).fill(0).map((_,j) => (
                    <td key={j} style={{ padding:'14px 16px' }}>
                      <div style={{ height:14, background:'#f1f5f9', borderRadius:4, animation:'pulse 1.5s ease infinite' }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:'56px 16px', color:'#94a3b8' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>✓</div>
                <div style={{ fontWeight:600, color:'#15803d' }}>No pending payments</div>
              </td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ fontWeight:600, color:'#0f2040' }}>{p.user?.fullName}</div>
                  <div style={{ fontSize:12, color:'#94a3b8' }}>{p.user?.memberNumber}</div>
                </td>
                <td style={{ padding:'14px 16px', fontWeight:700, color:'#0f2040' }}>KES {Number(p.amount).toLocaleString()}</td>
                <td style={{ padding:'14px 16px' }}>
                  <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background: p.method === 'MPESA' ? '#e0f2fe' : '#f1f5f9', color: p.method === 'MPESA' ? '#0369a1' : '#475569' }}>{p.method}</span>
                </td>
                <td style={{ padding:'14px 16px', fontFamily:'monospace', fontSize:12, color:'#475569' }}>{p.mpesaRef || '—'}</td>
                <td style={{ padding:'14px 16px', fontSize:13, color:'#64748b' }}>{p.contribution?.period || '—'}</td>
                <td style={{ padding:'14px 16px', fontSize:12, color:'#94a3b8' }}>
                  {new Date(p.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' })}
                </td>
                <td style={{ padding:'14px 16px' }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => approve(p.id)} disabled={acting === p.id} style={{ padding:'7px 16px', borderRadius:7, fontSize:13, fontWeight:600, background: acting === p.id ? '#94a3b8' : '#16a34a', color:'#fff', border:'none', cursor: acting === p.id ? 'not-allowed' : 'pointer' }}>
                      {acting === p.id ? '...' : '✓ Approve'}
                    </button>
                    <button onClick={() => reject(p.id)} disabled={acting === p.id} style={{ padding:'7px 16px', borderRadius:7, fontSize:13, fontWeight:600, background:'transparent', color:'#dc2626', border:'1.5px solid #fecaca', cursor: acting === p.id ? 'not-allowed' : 'pointer' }}>
                      ✕ Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderTop:'1px solid #e2e8f0' }}>
            <span style={{ fontSize:13, color:'#94a3b8' }}>Page {page} of {totalPages}</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:13, cursor:'pointer' }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:13, cursor:'pointer' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
