'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { useAuth } from '../../lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

function ActivateAccountContent() {
  const searchParams           = useSearchParams()
  const { signIn }             = useAuth()
  const token                  = searchParams.get('token')

  const [step,      setStep]   = useState<'loading'|'form'|'success'|'error'>('loading')
  const [password,  setPass]   = useState('')
  const [confirm,   setConf]   = useState('')
  const [showPass,  setShow]   = useState(false)
  const [submitting,setSub]    = useState(false)
  const [errorMsg,  setErr]    = useState('')

  useEffect(() => {
    if (!token) {
      setStep('error')
      setErr('Activation link is invalid or missing. Please contact your administrator.')
      return
    }
    setStep('form')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!password || !confirm) { setErr('Please fill in both fields.'); return }
    if (password.length < 6)   { setErr('Password must be at least 6 characters.'); return }
    if (password !== confirm)  { setErr('Passwords do not match.'); return }

    setSub(true)
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/activate`, { token, password })
      setStep('success')
      setTimeout(() => {
        signIn(data.token, data.user)
      }, 1800)
    } catch (err: any) {
      setErr(err.response?.data?.message || 'Activation failed. The link may have expired.')
    } finally {
      setSub(false)
    }
  }

  const level = password.length === 0 ? 0 : password.length < 4 ? 1 : password.length < 7 ? 2 : password.length < 10 ? 3 : 4
  const levelColor = ['','#ef4444','#f59e0b','#3b82f6','#16a34a'][level]
  const levelLabel = ['','Too short','Weak','Good','Strong'][level]

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'linear-gradient(160deg,#091529 0%,#1e3a6e 100%)' }}>

      {/* ── LEFT — branding ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 72px', borderRight:'1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:12, marginBottom:52 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:'rgba(230,176,32,0.15)', border:'1.5px solid #e6b020', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:17, color:'#f5c842' }}>CS</div>
          <div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:700, color:'#fff', lineHeight:1.1 }}>Crater SDA Welfare</div>
            <div style={{ fontSize:11, color:'#f5c842', letterSpacing:'0.1em', textTransform:'uppercase' }}>Nakuru, Kenya</div>
          </div>
        </Link>

        <h1 style={{ fontFamily:'Georgia,serif', fontSize:34, fontWeight:700, color:'#fff', lineHeight:1.2, marginBottom:14 }}>
          Welcome to your<br />Member Dashboard
        </h1>
        <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.8, marginBottom:44, maxWidth:360 }}>
          Your account has been created by your welfare administrator.
          Set a secure password to activate your account — you'll be taken straight to your dashboard.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { icon:'💳', text:'Pay contributions via M-Pesa STK Push'   },
            { icon:'📋', text:'View your full contribution history'       },
            { icon:'🏥', text:'Submit and track welfare claims'           },
            { icon:'📄', text:'Download PDF statements anytime'           },
          ].map(b => (
            <div key={b.text} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{b.icon}</div>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.45)' }}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT — form ── */}
      <div style={{ width:480, display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
        <div style={{ width:'100%', maxWidth:380 }}>

          {/* LOADING */}
          {step === 'loading' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,0.15)', borderTopColor:'#e6b020', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 0.8s linear infinite' }}/>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>Verifying your link...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* FORM */}
          {step === 'form' && (
            <div style={{ background:'#fff', borderRadius:20, padding:'40px 36px', boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>
              <div style={{ marginBottom:26 }}>
                <h2 style={{ fontSize:22, fontWeight:700, color:'#0f2040', marginBottom:6 }}>Set Your Password</h2>
                <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>
                  Choose a secure password. You will be taken to your dashboard immediately after.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
                {/* Password */}
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>New Password</label>
                  <div style={{ position:'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPass(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoFocus
                      style={{ width:'100%', padding:'11px 44px 11px 14px', borderRadius:9, border:'1.5px solid #e2e8f0', fontSize:14, outline:'none', boxSizing:'border-box' }}
                      onFocus={e => e.target.style.borderColor='#1e3a6e'}
                      onBlur={e  => e.target.style.borderColor='#e2e8f0'}
                    />
                    <button type="button" onClick={() => setShow(!showPass)}
                      style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:12 }}>
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {/* Strength */}
                  {password.length > 0 && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex:1, height:4, borderRadius:2, background: level >= i ? levelColor : '#e2e8f0', transition:'background 0.2s' }}/>
                        ))}
                      </div>
                      <div style={{ fontSize:11, color:levelColor }}>{levelLabel}</div>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>Confirm Password</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConf(e.target.value)}
                    placeholder="Repeat your password"
                    style={{ width:'100%', padding:'11px 14px', borderRadius:9, border:`1.5px solid ${confirm.length > 0 && confirm !== password ? '#fca5a5' : '#e2e8f0'}`, fontSize:14, outline:'none', boxSizing:'border-box' }}
                    onFocus={e => e.target.style.borderColor='#1e3a6e'}
                    onBlur={e  => e.target.style.borderColor= confirm !== password && confirm.length > 0 ? '#fca5a5' : '#e2e8f0'}
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <div style={{ fontSize:11, color:'#ef4444', marginTop:4 }}>Passwords do not match</div>
                  )}
                </div>

                {/* Error */}
                {errorMsg && (
                  <div style={{ background:'#fee2e2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#b91c1c' }}>
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={submitting} style={{
                  background: submitting ? '#94a3b8' : '#1e3a6e',
                  color:'#fff', padding:13, borderRadius:10, fontSize:15, fontWeight:700,
                  border:'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  marginTop:4, transition:'background 0.15s',
                }}>
                  {submitting ? 'Activating...' : 'Activate & Go to Dashboard →'}
                </button>
              </form>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div style={{ background:'#fff', borderRadius:20, padding:'44px 36px', boxShadow:'0 24px 64px rgba(0,0,0,0.3)', textAlign:'center' }}>
              <div style={{ width:68, height:68, borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:30 }}>✓</div>
              <h2 style={{ fontSize:22, fontWeight:700, color:'#0f2040', marginBottom:10 }}>Account Activated!</h2>
              <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, marginBottom:28 }}>
                Your password has been set. Taking you to your dashboard now...
              </p>
              <div style={{ display:'flex', justifyContent:'center', gap:6 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#1e3a6e', animation:'bounce 1.2s ease infinite', animationDelay:`${i*0.2}s` }}/>
                ))}
              </div>
              <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-8px);opacity:1}}`}</style>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div style={{ background:'#fff', borderRadius:20, padding:'44px 36px', boxShadow:'0 24px 64px rgba(0,0,0,0.3)', textAlign:'center' }}>
              <div style={{ width:68, height:68, borderRadius:'50%', background:'#fee2e2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:28 }}>✕</div>
              <h2 style={{ fontSize:22, fontWeight:700, color:'#0f2040', marginBottom:10 }}>Link Invalid</h2>
              <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, marginBottom:28 }}>{errorMsg}</p>
              <Link href="/login" style={{ display:'inline-block', background:'#1e3a6e', color:'#fff', padding:'12px 32px', borderRadius:10, fontSize:14, fontWeight:600, textDecoration:'none' }}>
                Back to Login
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg,#091529 0%,#1e3a6e 100%)' }}>
        <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,0.15)', borderTopColor:'#e6b020', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <ActivateAccountContent />
    </Suspense>
  )
}