'use client'
import { useEffect, useState } from 'react'
import { useAuth }             from '../../../lib/auth'
import api                     from '../../../lib/api'
import toast                   from 'react-hot-toast'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: '#fef3c7', color: '#b45309' },
  APPROVED: { bg: '#dcfce7', color: '#15803d' },
  REJECTED: { bg: '#fee2e2', color: '#b91c1c' },
  PAID:     { bg: '#e0f2fe', color: '#0369a1' },
}

const iS: any = {
  width: '100%', padding: '10px 13px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s',
}
const iF = (e: any) => e.target.style.borderColor = '#1e3a6e'
const iB = (e: any) => e.target.style.borderColor = '#e2e8f0'

const css = `
  .loans-page      { padding: 32px 36px; }
  .loans-header    { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
  .loans-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .loan-preview    { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .loan-card-top   { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 12px; }

  @media (max-width: 900px) {
    .loans-page { padding: 24px 24px; }
    .loan-preview { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 640px) {
    .loans-page        { padding: 20px 16px; }
    .loans-header      { flex-direction: column; align-items: stretch; }
    .loans-header > button { width: 100%; }
    .loans-form-grid   { grid-template-columns: 1fr; }
    .loan-preview      { grid-template-columns: repeat(2, 1fr); }
    .loan-card-top     { flex-direction: column; gap: 8px; }
  }

  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
`

export default function MemberLoansPage() {
  const { user }                     = useAuth()
  const [loans,      setLoans]       = useState<any[]>([])
  const [memberInfo, setMemberInfo]  = useState<any>(null)
  const [loading,    setLoading]     = useState(true)
  const [showForm,   setShowForm]    = useState(false)
  const [saving,     setSaving]      = useState(false)
  const [form,       setForm]        = useState({ principal: '', interestRate: '12', repaymentMonths: '12', notes: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [loansRes, dashRes] = await Promise.allSettled([
        api.get('/loans?limit=20'),
        api.get('/dashboard/me'),
      ])
      if (loansRes.status === 'fulfilled') setLoans(loansRes.value.data.loans || [])
      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data
        setMemberInfo({
          id:             d.member?.id,
          eligible:       d.member?.loanEligible || false,
          effectiveLimit: d.member?.loanLimitOverride || 0,
          memberType:     d.member?.memberType || 'SINGLE',
          monthlyRate:    d.member?.monthlyRate || (d.member?.memberType === 'FAMILY' ? 500 : 200),
        })
      }
    } catch { toast.error('Failed to load loans') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.principal) { toast.error('Enter loan amount'); return }
    if (!memberInfo?.id) { toast.error('Unable to identify member. Please refresh.'); return }
    setSaving(true)
    try {
      await api.post('/loans', {
        userId:          memberInfo.id,
        principal:       parseFloat(form.principal),
        interestRate:    parseFloat(form.interestRate) / 100,
        repaymentMonths: parseInt(form.repaymentMonths),
        notes:           form.notes,
      })
      toast.success('Loan application submitted!')
      setShowForm(false)
      setForm({ principal: '', interestRate: '12', repaymentMonths: '12', notes: '' })
      load()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to submit application') }
    finally { setSaving(false) }
  }

  const principal       = parseFloat(form.principal) || 0
  const rate            = parseFloat(form.interestRate) / 100 || 0
  const months          = parseInt(form.repaymentMonths) || 12
  const totalDuePreview = principal * (1 + rate)
  const monthlyPreview  = totalDuePreview / months

  return (
    <div className="loans-page">
      <style>{css}</style>

      <div className="loans-header">
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>My Loans</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>View loan history and apply for a new loan</p>
        </div>
        {memberInfo?.eligible && (
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1e3a6e', color: '#fff', padding: '10px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ Apply for Loan'}
          </button>
        )}
      </div>

      {/* Eligibility card */}
      {memberInfo && (
        <div style={{ background: memberInfo.eligible ? '#dcfce7' : '#f8fafc', borderRadius: 14, padding: '18px 22px', border: `1px solid ${memberInfo.eligible ? '#86efac' : '#e2e8f0'}`, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: memberInfo.eligible ? '#15803d' : '#64748b', marginBottom: 4 }}>
              {memberInfo.eligible ? '✓ You are eligible for a loan' : 'You are not yet eligible for a loan'}
            </div>
            <div style={{ fontSize: 13, color: memberInfo.eligible ? '#15803d' : '#94a3b8' }}>
              {memberInfo.eligible
                ? `Maximum loan: KES ${Number(memberInfo.effectiveLimit).toLocaleString()}`
                : 'Contact your welfare administrator to check eligibility requirements'}
            </div>
          </div>
          <div style={{ fontSize: 28 }}>{memberInfo.eligible ? '✅' : '🔒'}</div>
        </div>
      )}

      {/* Application form */}
      {showForm && memberInfo?.eligible && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 20 }}>Loan application</div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="loans-form-grid">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Loan amount (KES) * <span style={{ color: '#94a3b8', fontWeight: 400 }}>Max: KES {Number(memberInfo.effectiveLimit).toLocaleString()}</span>
                </label>
                <input type="number" value={form.principal} onChange={e => setForm(p => ({ ...p, principal: e.target.value }))}
                  placeholder={`Max: KES ${Number(memberInfo.effectiveLimit).toLocaleString()}`} style={iS} onFocus={iF} onBlur={iB} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Interest rate (%)</label>
                <input type="number" value={form.interestRate} onChange={e => setForm(p => ({ ...p, interestRate: e.target.value }))} placeholder="12" style={iS} onFocus={iF} onBlur={iB} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Repayment period</label>
                <select value={form.repaymentMonths} onChange={e => setForm(p => ({ ...p, repaymentMonths: e.target.value }))} style={{ ...iS, background: '#fff' }}>
                  {[6, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} months</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Purpose (optional)</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Purpose of loan" style={iS} onFocus={iF} onBlur={iB} />
              </div>
            </div>

            {/* Repayment preview */}
            {principal > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Repayment preview</div>
                <div className="loan-preview">
                  {[
                    { label: 'Principal', value: `KES ${principal.toLocaleString()}` },
                    { label: 'Interest',  value: `KES ${(principal * rate).toLocaleString()}` },
                    { label: 'Total due', value: `KES ${totalDuePreview.toLocaleString()}` },
                    { label: 'Monthly',   value: `KES ${Math.ceil(monthlyPreview).toLocaleString()}` },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontWeight: 700, color: '#0f2040', fontSize: 14 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <button type="submit" disabled={saving} style={{ background: saving ? '#94a3b8' : '#1e3a6e', color: '#fff', padding: '11px 28px', borderRadius: 9, fontSize: 14, fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loans list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} style={{ height: 100, background: '#f1f5f9', borderRadius: 14, animation: 'pulse 1.5s ease infinite' }} />
          ))
        ) : loans.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 56, border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏦</div>
            <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No loans yet</div>
            <div style={{ fontSize: 13 }}>
              {memberInfo?.eligible ? 'Click "+ Apply for Loan" above to apply' : 'Contact admin to check eligibility'}
            </div>
          </div>
        ) : loans.map(l => {
          const sc     = STATUS_COLORS[l.status] || STATUS_COLORS.PENDING
          const total  = l.principal + l.principal * l.interestRate
          const repaid = (l.repayments || []).reduce((s: number, r: any) => s + r.amount, 0)
          const pct    = total > 0 ? Math.min(100, Math.round(repaid / total * 100)) : 0
          return (
            <div key={l.id} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
              <div className="loan-card-top">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: '#0f2040' }}>
                      KES {Number(l.principal).toLocaleString()}
                    </div>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                      {l.status.toLowerCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {(l.interestRate * 100).toFixed(0)}% interest · {l.repaymentSchedule?.length || 0} months · Total: KES {total.toLocaleString()}
                  </div>
                  {l.notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Purpose: {l.notes}</div>}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
                  {new Date(l.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              {l.status === 'APPROVED' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                    <span>Repaid: KES {repaid.toLocaleString()}</span>
                    <span>Remaining: KES {Math.max(0, total - repaid).toLocaleString()}</span>
                    <span style={{ fontWeight: 600, color: pct >= 100 ? '#15803d' : '#1e3a6e' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#16a34a' : '#1e3a6e', borderRadius: 99, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
