'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import api from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg:'#fef3c7', color:'#b45309' },
  APPROVED: { bg:'#dcfce7', color:'#15803d' },
  REJECTED: { bg:'#fee2e2', color:'#b91c1c' },
  PAID:     { bg:'#e0f2fe', color:'#0369a1' },
}

export default function AdminLoansPage() {
  const { user }                    = useAuth()
  const searchParams                = useSearchParams()
  const [loans,    setLoans]        = useState<any[]>([])
  const [loading,  setLoading]      = useState(true)
  const [total,    setTotal]        = useState(0)
  const [page,     setPage]         = useState(1)
  const [filter,   setFilter]       = useState(searchParams.get('status') || 'ALL')
  const [acting,   setActing]       = useState<string | null>(null)
  const LIMIT = 15

  const canAct = ['SUPER_ADMIN', 'TREASURER'].includes(user?.role)

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: LIMIT }
      if (filter !== 'ALL') params.status = filter
      const { data } = await api.get('/loans', { params })
      setLoans(data.loans || [])
      setTotal(data.total || 0)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, filter])

  const approve = async (id: string) => {
    setActing(id)
    try {
      await api.patch(`/loans/${id}/approve`)
      toast.success('Loan approved! Member notified.')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve loan')
    } finally { setActing(null) }
  }

  const reject = async (id: string) => {
    setActing(id)
    try {
      await api.patch(`/loans/${id}/reject`)
      toast.success('Loan rejected.')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject loan')
    } finally { setActing(null) }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'#0f2040', marginBottom:4 }}>Loans</h1>
        <p style={{ fontSize:14, color:'#64748b' }}>Review and manage member loan applications</p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {['ALL','PENDING','APPROVED','REJECTED','PAID'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }} style={{
            padding:'7px 16px', borderRadius:8, fontSize:13, fontWeight:500,
            border: filter === f ? 'none' : '1px solid #e2e8f0',
            background: filter === f ? '#1e3a6e' : '#fff',
            color: filter === f ? '#fff' : '#64748b',
            cursor:'pointer', transition:'all 0.15s',
          }}>{f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}</button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:13, color:'#94a3b8', alignSelf:'center' }}>{total} loans</span>
      </div>

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['Member','Principal','Interest','Total Due','Repayment','Status', canAct ? 'Action' : ''].filter(Boolean).map(h => (
                <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(6).fill(0).map((_,i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  {Array(canAct ? 7 : 6).fill(0).map((_,j) => (
                    <td key={j} style={{ padding:'14px 16px' }}>
                      <div style={{ height:14, background:'#f1f5f9', borderRadius:4, animation:'pulse 1.5s ease infinite' }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : loans.length === 0 ? (
              <tr><td colSpan={canAct ? 7 : 6} style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>No loans found</td></tr>
            ) : loans.map(l => {
              const totalDue = l.principal + l.principal * l.interestRate
              const months   = l.repaymentSchedule?.length || 0
              const sc       = STATUS_COLORS[l.status] || STATUS_COLORS.PENDING
              return (
                <tr key={l.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ fontWeight:600, color:'#0f2040' }}>{l.user?.fullName}</div>
                    <div style={{ fontSize:12, color:'#94a3b8' }}>{l.user?.memberNumber}</div>
                  </td>
                  <td style={{ padding:'14px 16px', fontWeight:600, color:'#0f2040' }}>KES {Number(l.principal).toLocaleString()}</td>
                  <td style={{ padding:'14px 16px', color:'#64748b' }}>{(l.interestRate * 100).toFixed(0)}%</td>
                  <td style={{ padding:'14px 16px', fontWeight:600, color:'#0f2040' }}>KES {totalDue.toLocaleString()}</td>
                  <td style={{ padding:'14px 16px', fontSize:13, color:'#64748b' }}>{months} months</td>
                  <td style={{ padding:'14px 16px' }}>
                    <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:sc.bg, color:sc.color }}>
                      {l.status.toLowerCase()}
                    </span>
                  </td>
                  {canAct && (
                    <td style={{ padding:'14px 16px' }}>
                      {l.status === 'PENDING' ? (
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => approve(l.id)} disabled={acting === l.id} style={{ padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:600, background: acting === l.id ? '#94a3b8' : '#16a34a', color:'#fff', border:'none', cursor: acting === l.id ? 'not-allowed' : 'pointer' }}>
                            {acting === l.id ? '...' : '✓ Approve'}
                          </button>
                          <button onClick={() => reject(l.id)} disabled={acting === l.id} style={{ padding:'7px 12px', borderRadius:7, fontSize:12, fontWeight:600, background:'transparent', color:'#dc2626', border:'1.5px solid #fecaca', cursor: acting === l.id ? 'not-allowed' : 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize:12, color:'#94a3b8' }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
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
