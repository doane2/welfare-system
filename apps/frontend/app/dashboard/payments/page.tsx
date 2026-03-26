'use client'
import { useState, useEffect } from 'react'
import { useAuth }             from '../../../lib/auth'
import { initiateSTKPush }     from '../../../lib/api'
import toast                   from 'react-hot-toast'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CY     = new Date().getFullYear()
const YEARS  = [CY - 1, CY, CY + 1]

const BUSINESS_NO = '856121'
const ACCOUNT_NO  = 'welfare'

const iS: any = {
  width: '100%', padding: '11px 14px', borderRadius: 9,
  border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.15s', fontFamily: 'inherit',
}
const iF = (e: any) => e.target.style.borderColor = '#1e3a6e'
const iB = (e: any) => e.target.style.borderColor = '#e2e8f0'

const css = `
  .pay-page    { padding: 32px 36px; }
  .pay-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; max-width: 960px; }
  .pay-tabs    { display: flex; gap: 2px; background: #f1f5f9; padding: 4px; border-radius: 12px; width: fit-content; margin-bottom: 32px; }
  .pay-tabs button { padding: 10px 24px; border-radius: 9px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
  .pay-detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 8px; }

  @media (max-width: 900px) {
    .pay-page  { padding: 24px 24px; }
    .pay-grid  { grid-template-columns: 1fr; max-width: 100%; }
  }

  @media (max-width: 640px) {
    .pay-page  { padding: 20px 16px; }
    .pay-tabs  { width: 100%; }
    .pay-tabs button { flex: 1; padding: 10px 12px; font-size: 13px; text-align: center; }
    .pay-grid  { gap: 20px; }
  }

  @keyframes spin { to { transform: rotate(360deg) } }
`

export default function PaymentsPage() {
  const { user }                           = useAuth()
  const [tab,           setTab]            = useState<'stk' | 'manual'>('stk')
  const [phone,         setPhone]          = useState(user?.phone || '')
  const [amount,        setAmount]         = useState('')
  const [period,        setPeriod]         = useState(`${MONTHS[new Date().getMonth()]} ${CY}`)
  const [loading,       setLoading]        = useState(false)
  const [stkSent,       setStkSent]        = useState(false)
  const [stkUnavailable, setStkUnavailable] = useState(false)
  const [memberRate,    setMemberRate]     = useState<{ monthly: number; annual: number; type: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { default: api } = await import('../../../lib/api')
        const { data } = await api.get('/dashboard/me')
        const monthly  = data.member?.monthlyRate || (data.member?.memberType === 'FAMILY' ? 500 : 200)
        setMemberRate({ monthly, annual: monthly * 12, type: data.member?.memberType || 'SINGLE' })
        setAmount(String(monthly))
        if (user?.phone) setPhone(user.phone)
      } catch {}
    }
    load()
  }, [user])

  const handleSTK = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !amount || !period) { toast.error('Fill in all fields'); return }
    setLoading(true)
    try {
      await initiateSTKPush({ phone, amount: Number(amount), period, userId: user?.id })
      setStkSent(true)
      toast.success('STK Push sent! Check your phone.')
    } catch (err: any) {
      const isSoon = err.response?.data?.comingSoon === true || err.response?.status === 503
      if (isSoon) { setStkUnavailable(true) }
      else { toast.error(err.response?.data?.message || 'STK Push failed. Use manual option.') }
    } finally { setLoading(false) }
  }

  const monthlyRate = memberRate?.monthly || 500
  const annualRate  = memberRate?.annual  || (monthlyRate * 12)
  const memberType  = memberRate?.type    || 'SINGLE'

  return (
    <div className="pay-page">
      <style>{css}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>Make a Payment</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          Pay your {memberType === 'FAMILY' ? 'family' : 'single'} member contribution of
          <strong style={{ color: '#0f2040' }}> KES {monthlyRate.toLocaleString()}/month</strong> via M-Pesa
        </p>
      </div>

      {/* Tabs */}
      <div className="pay-tabs">
        {[
          { key: 'stk',    label: '📱 STK Push (Auto)' },
          { key: 'manual', label: '🏦 Manual Paybill'  },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            background: tab === t.key ? '#fff' : 'transparent',
            color:      tab === t.key ? '#0f2040' : '#94a3b8',
            boxShadow:  tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      <div className="pay-grid">

        {/* ── LEFT ── */}
        <div>
          {tab === 'stk' && (
            <>
              {stkUnavailable ? (
                <div style={{ background: '#fff', borderRadius: 16, padding: 36, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>🚧</div>
                  <h3 style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: '#0f2040', marginBottom: 10 }}>STK Push Coming Soon</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
                    Automatic M-Pesa payment prompts are not yet available. Please use the manual Paybill option.
                  </p>
                  <button onClick={() => { setTab('manual'); setStkUnavailable(false) }}
                    style={{ background: '#1e3a6e', color: '#fff', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    Use Manual Paybill →
                  </button>
                </div>

              ) : stkSent ? (
                <div style={{ background: '#fff', borderRadius: 16, padding: 36, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>📲</div>
                  <h3 style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color: '#0f2040', marginBottom: 10 }}>Check Your Phone!</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
                    An M-Pesa request of <strong>KES {Number(amount).toLocaleString()}</strong> was sent to <strong>{phone}</strong>.<br />
                    Enter your M-Pesa PIN to complete the payment.
                  </p>
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#64748b' }}>
                    ⏱ The prompt expires in <strong>60 seconds</strong>.
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => setStkSent(false)} style={{ background: '#f1f5f9', color: '#475569', padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>← Try again</button>
                    <button onClick={() => setTab('manual')} style={{ background: 'none', color: '#1e3a6e', padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 500, border: '1.5px solid #c7d2fe', cursor: 'pointer' }}>Use Manual Instead</button>
                  </div>
                </div>

              ) : (
                <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #e2e8f0' }}>
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f2040', marginBottom: 4 }}>M-Pesa STK Push</div>
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>We'll send a payment prompt directly to your phone</div>
                  </div>
                  <form onSubmit={handleSTK} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>M-Pesa Phone Number</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" style={iS} onFocus={iF} onBlur={iB} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Amount (KES) — Monthly: KES {monthlyRate.toLocaleString()}</label>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" style={iS} onFocus={iF} onBlur={iB} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Contribution Period</label>
                      <select value={period} onChange={e => setPeriod(e.target.value)} style={{ ...iS, background: '#fff' }}>
                        {YEARS.flatMap(y => MONTHS.map(m => `${m} ${y}`)).map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" disabled={loading} style={{ background: loading ? '#94a3b8' : '#e6b020', color: '#0f2040', padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
                      {loading
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0f2040', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Sending...</span>
                        : '📱 Send M-Pesa Prompt'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {tab === 'manual' && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f2040', marginBottom: 4 }}>Manual Paybill Payment</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>Follow these steps on your M-Pesa menu</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
                {[
                  'Open M-Pesa on your phone',
                  'Select Lipa na M-Pesa',
                  'Select Pay Bill',
                  `Enter Business Number: ${BUSINESS_NO}`,
                  `Enter Account Number: ${ACCOUNT_NO}`,
                  `Enter Amount (KES ${monthlyRate.toLocaleString()} or more), PIN and Send`,
                ].map((step, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e3a6e', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                      {i < arr.length - 1 && <div style={{ width: 2, height: 20, background: '#e2e8f0' }} />}
                    </div>
                    <div style={{ fontSize: 14, color: '#374151', paddingTop: 5, paddingBottom: 18 }}>{step}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: '1.5px dashed #cbd5e1', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Payment Details</div>
                {[
                  { label: 'Business Number', value: BUSINESS_NO,                             copy: true  },
                  { label: 'Account Number',  value: ACCOUNT_NO,                              copy: true  },
                  { label: 'Member Number',   value: user?.memberNumber || 'Your Member No.', copy: true  },
                  { label: 'Monthly Amount',  value: `KES ${monthlyRate.toLocaleString()}`,   copy: false },
                  { label: 'Annual Amount',   value: `KES ${annualRate.toLocaleString()} (by 31 Mar)`, copy: false },
                ].map(d => (
                  <div key={d.label} className="pay-detail-row">
                    <span style={{ fontSize: 13, color: '#64748b' }}>{d.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: d.copy ? 15 : 13, color: '#0f2040', fontFamily: d.copy ? 'monospace' : 'inherit' }}>{d.value}</span>
                      {d.copy && (
                        <button onClick={() => { navigator.clipboard.writeText(d.value); toast.success(`Copied: ${d.value}`) }}
                          style={{ fontSize: 11, color: '#1e3a6e', background: '#eef2ff', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '13px 16px', background: '#fef3c7', borderRadius: 10, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                ⚠️ After paying, notify your administrator with the M-Pesa confirmation code (e.g. <strong>SL7XXXXXXX</strong>) for fast approval.
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Info panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'linear-gradient(135deg,#0f2040,#1e3a6e)', borderRadius: 16, padding: 24, color: '#fff' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>My contribution</div>
            {[
              { l: 'Member type',     v: memberType === 'FAMILY' ? 'Family Member' : 'Single Member' },
              { l: 'Monthly rate',    v: `KES ${monthlyRate.toLocaleString()}/month` },
              { l: 'Annual rate',     v: `KES ${annualRate.toLocaleString()}/year` },
              { l: 'Annual deadline', v: '31 March each year' },
            ].map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 13, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{r.l}</span>
                <span style={{ fontWeight: 600, color: '#f5c842' }}>{r.v}</span>
              </div>
            ))}
          </div>

          {tab === 'stk' && !stkUnavailable && (
            <div style={{ background: '#eef2ff', borderRadius: 14, padding: 22, border: '1px solid #c7d2fe' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e3a6e', marginBottom: 10 }}>💡 STK Push Tips</div>
              {[
                'Ensure your phone has a signal',
                'Have your M-Pesa PIN ready before clicking Send',
                'Use the phone number registered to M-Pesa',
                'The prompt expires after 60 seconds',
                'Check your M-Pesa balance covers the amount',
              ].map(tip => (
                <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', fontSize: 13, color: '#3730a3' }}>
                  <span style={{ color: '#6366f1', marginTop: 1 }}>·</span><span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'manual' && (
            <div style={{ background: '#f0fdf4', borderRadius: 14, padding: 22, border: '1px solid #86efac' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#15803d', marginBottom: 10 }}>✓ After Paying</div>
              {[
                'Save your M-Pesa confirmation SMS',
                'Share the code with your admin for approval',
                'Your dashboard will update once approved',
                'Approval typically takes 1–2 business days',
              ].map(tip => (
                <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', fontSize: 13, color: '#15803d' }}>
                  <span style={{ marginTop: 1 }}>✓</span><span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f2040', marginBottom: 6 }}>📄 Need a receipt?</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>Download your full contribution statement as a PDF.</div>
            <a href="/dashboard/statements" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1e3a6e', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Download Statement →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
