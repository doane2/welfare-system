'use client'
import { useState, useRef, useEffect } from 'react'
import Link     from 'next/link'
import { useRouter } from 'next/navigation'
import toast    from 'react-hot-toast'
import axios    from 'axios'
import { useAuth } from '../../lib/auth'

const API_URL    = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const ADMIN_ROLES = ['SUPER_ADMIN', 'TREASURER', 'SECRETARY']

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .login-root {
    min-height: 100vh; display: flex;
    background: linear-gradient(160deg, #091529 0%, #1e3a6e 100%);
  }
  .login-left {
    flex: 1; display: flex; flex-direction: column;
    justify-content: center; padding: 60px 80px;
    border-right: 1px solid rgba(255,255,255,0.07);
  }
  .login-right {
    width: 480px; display: flex; align-items: center;
    justify-content: center; padding: 48px;
  }
  .login-form-wrap { width: 100%; max-width: 380px; }
  .login-input {
    width: 100%; padding: 12px 16px; border-radius: 10px;
    font-size: 14px; background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12); color: #fff;
    outline: none; transition: border-color 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .login-input::placeholder { color: rgba(255,255,255,0.3); }
  .login-input:focus { border-color: #e6b020; }
  .login-input-pass { padding-right: 56px; }
  .login-submit {
    width: 100%; background: #e6b020; color: #0f2040;
    padding: 14px; border-radius: 10px; font-size: 15px;
    font-weight: 700; border: none; cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .login-submit:disabled { background: #b8891a; cursor: not-allowed; }
  .login-submit:not(:disabled):hover { background: #f5c842; }

  /* OTP input boxes */
  .otp-input {
    width: 52px; height: 60px; text-align: center;
    font-size: 26px; font-weight: 700; border-radius: 10px;
    background: rgba(255,255,255,0.07);
    border: 2px solid rgba(255,255,255,0.15); color: #fff;
    outline: none; transition: border-color 0.15s, background 0.15s;
    font-family: monospace; caret-color: #e6b020;
  }
  .otp-input:focus { border-color: #e6b020; background: rgba(230,176,32,0.08); }
  .otp-input.filled { border-color: rgba(255,255,255,0.3); }

  @media (max-width: 900px) {
    .login-left  { padding: 48px 40px; }
    .login-right { width: 420px; padding: 40px 32px; }
  }
  @media (max-width: 640px) {
    .login-root  { flex-direction: column; }
    .login-left  { flex: none; padding: 32px 24px 28px; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); }
    .login-bullets { display: none; }
    .login-hero-h1 { font-size: 26px !important; margin-bottom: 6px !important; }
    .login-hero-p  { font-size: 13px !important; margin-top: 6px !important; }
    .login-right   { width: 100%; padding: 32px 24px 48px; align-items: flex-start; }
    .login-form-wrap { max-width: 100%; }
    .otp-input { width: 44px; height: 54px; font-size: 22px; }
  }
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
`

export default function LoginPage() {
  const router        = useRouter()
  const { signIn }    = useAuth()

  // ── Step 1 — credentials ─────────────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)

  // ── Step 2 — OTP ─────────────────────────────────────────────────────────
  const [step,         setStep]         = useState<'credentials'|'otp'>('credentials')
  const [otpToken,     setOtpToken]     = useState('')
  const [otpDigits,    setOtpDigits]    = useState(['','','','','',''])
  const [verifying,    setVerifying]    = useState(false)
  const [resending,    setResending]    = useState(false)
  const [maskedEmail,  setMaskedEmail]  = useState('')
  const [maskedPhone,  setMaskedPhone]  = useState('')
  const [countdown,    setCountdown]    = useState(0)
  const otpRefs = useRef<(HTMLInputElement|null)[]>([])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-focus first OTP box when step changes
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }, [step])

  // ── Step 1 submit ─────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please enter your email and password'); return }
    setLoading(true)
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, { email, password })

      if (data.requiresOtp) {
        // Admin — go to OTP step
        setOtpToken(data.otpToken)
        setMaskedEmail(data.maskedEmail || '')
        setMaskedPhone(data.maskedPhone || '')
        setOtpDigits(['','','','','',''])
        setStep('otp')
        setCountdown(60)
        toast.success('OTP sent! Check your phone and email.')
      } else {
        // Member — direct login
        signIn(data.token, data.user)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP digit input handler ───────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...otpDigits]
    next[index] = digit
    setOtpDigits(next)

    // Auto-advance to next box
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const code = [...next].join('')
      if (code.length === 6) verifyOtp(code)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft'  && index > 0) otpRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus()
  }

  // Handle paste — fill all 6 boxes at once
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6)
    setOtpDigits(next)
    const lastFilled = Math.min(pasted.length, 5)
    otpRefs.current[lastFilled]?.focus()
    if (pasted.length === 6) verifyOtp(pasted)
  }

  // ── Step 2 verify OTP ─────────────────────────────────────────────────────
  const verifyOtp = async (code?: string) => {
    const otp = code || otpDigits.join('')
    if (otp.length !== 6) { toast.error('Please enter all 6 digits'); return }
    setVerifying(true)
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/verify-otp`, { otpToken, otp })
      toast.success(`Welcome, ${data.user.fullName.split(' ')[0]}!`)
      signIn(data.token, data.user)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Incorrect OTP. Please try again.'
      toast.error(msg)
      if (err.response?.data?.expired) {
        setStep('credentials')
        setOtpDigits(['','','','','',''])
      } else {
        // Clear digits and refocus on wrong OTP
        setOtpDigits(['','','','','',''])
        setTimeout(() => otpRefs.current[0]?.focus(), 50)
      }
    } finally {
      setVerifying(false)
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const resendOtp = async () => {
    if (countdown > 0) return
    setResending(true)
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/resend-otp`, { otpToken })
      setOtpToken(data.otpToken)
      setOtpDigits(['','','','','',''])
      setCountdown(60)
      otpRefs.current[0]?.focus()
      toast.success('New OTP sent to your phone and email.')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP.')
      if (err.response?.data?.expired) setStep('credentials')
    } finally {
      setResending(false)
    }
  }

  const allFilled = otpDigits.every(d => d !== '')

  return (
    <div className="login-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* ── LEFT — branding ──────────────────────────────────────────────── */}
      <div className="login-left">
        <Link href="/" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:12, marginBottom:48 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:'rgba(230,176,32,0.15)', border:'1.5px solid #e6b020', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia,serif', fontWeight:700, fontSize:17, color:'#f5c842', flexShrink:0 }}>CS</div>
          <div>
            <div style={{ fontFamily:'Georgia,serif', fontSize:17, fontWeight:700, color:'#fff', lineHeight:1.1 }}>Crater SDA Welfare</div>
            <div style={{ fontSize:11, color:'#f5c842', letterSpacing:'0.1em', textTransform:'uppercase' }}>Member Portal</div>
          </div>
        </Link>

        <h1 className="login-hero-h1" style={{ fontFamily:'Georgia,serif', fontSize:38, fontWeight:700, color:'#fff', lineHeight:1.2, marginBottom:14 }}>
          {step === 'otp' ? 'Verify\nyour identity' : 'Welcome\nback'}
        </h1>
        <p className="login-hero-p" style={{ fontSize:15, color:'rgba(255,255,255,0.5)', lineHeight:1.75, maxWidth:360, whiteSpace:'pre-line' }}>
          {step === 'otp'
            ? 'Enter the 6-digit code sent to your phone and email to complete sign in.'
            : 'Log in to manage contributions, view your welfare standing and make payments.'}
        </p>

        <div className="login-bullets" style={{ marginTop:'auto', paddingTop:48, display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { icon:'🔒', text:'2FA secured for all admin accounts'      },
            { icon:'📱', text:'Pay via M-Pesa STK Push from the portal' },
            { icon:'📄', text:'Download PDF statements at any time'      },
          ].map(b => (
            <div key={b.text} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:18 }}>{b.icon}</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT — form ─────────────────────────────────────────────────── */}
      <div className="login-right">
        <div className="login-form-wrap" style={{ animation:'fadeIn 0.3s ease' }}>

          {/* ── STEP 1: Credentials ─────────────────────────────────────── */}
          {step === 'credentials' && (
            <>
              <div style={{ marginBottom:32 }}>
                <h2 style={{ fontSize:24, fontWeight:700, color:'#fff', marginBottom:6 }}>Sign in</h2>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>Enter your email and password to continue</p>
              </div>

              <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', marginBottom:8 }}>Email address</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                    placeholder="you@example.com" autoComplete="email" className="login-input"/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', marginBottom:8 }}>Password</label>
                  <div style={{ position:'relative' }}>
                    <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                      placeholder="Your password" autoComplete="current-password"
                      className="login-input login-input-pass"/>
                    <button type="button" onClick={()=>setShowPass(v=>!v)}
                      style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:13, fontFamily:'DM Sans,sans-serif', padding:'4px 0' }}>
                      {showPass?'Hide':'Show'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="login-submit">
                  {loading
                    ? <span style={{ display:'inline-flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                        <span style={{ width:16, height:16, border:'2px solid #0f2040', borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/>
                        Signing in...
                      </span>
                    : 'Sign In →'}
                </button>
              </form>

              <p style={{ marginTop:28, textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.3)' }}>
                Not a member? <span style={{ color:'#f5c842' }}>Contact your welfare administrator</span>
              </p>
              <Link href="/" style={{ display:'block', textAlign:'center', marginTop:16, fontSize:13, color:'rgba(255,255,255,0.25)', textDecoration:'none' }}>
                ← Back to home
              </Link>
            </>
          )}

          {/* ── STEP 2: OTP ─────────────────────────────────────────────── */}
          {step === 'otp' && (
            <>
              <div style={{ marginBottom:32 }}>
                <div style={{ width:56, height:56, borderRadius:14, background:'rgba(230,176,32,0.15)', border:'1.5px solid rgba(230,176,32,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:16 }}>🔐</div>
                <h2 style={{ fontSize:24, fontWeight:700, color:'#fff', marginBottom:8 }}>Two-factor verification</h2>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', lineHeight:1.65 }}>
                  A 6-digit code was sent to
                  {maskedPhone && <><br/><span style={{ color:'#f5c842' }}>📱 {maskedPhone}</span></>}
                  {maskedEmail && <><br/><span style={{ color:'#f5c842' }}>✉️ {maskedEmail}</span></>}
                </p>
              </div>

              {/* OTP boxes */}
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:28 }} onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`otp-input ${digit ? 'filled' : ''}`}
                    disabled={verifying}
                  />
                ))}
              </div>

              {/* Verify button */}
              <button onClick={() => verifyOtp()} disabled={verifying || !allFilled} className="login-submit"
                style={{ opacity: !allFilled ? 0.6 : 1 }}>
                {verifying
                  ? <span style={{ display:'inline-flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                      <span style={{ width:16, height:16, border:'2px solid #0f2040', borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }}/>
                      Verifying...
                    </span>
                  : 'Verify code →'}
              </button>

              {/* Resend + back */}
              <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:10, alignItems:'center' }}>
                <button onClick={resendOtp} disabled={countdown > 0 || resending}
                  style={{ background:'none', border:'none', cursor: countdown>0 ? 'default' : 'pointer', fontSize:13, color: countdown>0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', fontFamily:'DM Sans,sans-serif' }}>
                  {resending ? 'Sending...' : countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </button>
                <button onClick={() => { setStep('credentials'); setOtpDigits(['','','','','','']) }}
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'rgba(255,255,255,0.3)', fontFamily:'DM Sans,sans-serif' }}>
                  ← Use a different account
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
