'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { inputStyle, labelStyle, primaryBtn } from '../../../components/adminUi'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

function Inner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const [info, setInfo] = useState<any>(null)
  const [error, setError] = useState('')
  const [temp, setTemp] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) { setError('This invitation link is incomplete.'); return }
    axios.get(`${API_URL}/api/auth/admin/invite/${encodeURIComponent(token)}`)
      .then((r) => setInfo(r.data))
      .catch((e) => setError(e.response?.data?.message || 'This invitation is invalid or has expired.'))
  }, [token])

  const submit = async () => {
    if (!temp || !next) return toast.error('Fill in all fields')
    if (next.length < 10 || !/[a-z]/.test(next) || !/[A-Z]/.test(next) || !/\d/.test(next))
      return toast.error('Use at least 10 characters with upper case, lower case and a number')
    if (next !== confirm) return toast.error('Passwords do not match')
    setBusy(true)
    try {
      await axios.post(`${API_URL}/api/auth/admin/accept-invite`, { token, tempPassword: temp, newPassword: next })
      toast.success('Password set. Please sign in.')
      router.push('/admin/login')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not complete setup')
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(160deg,#091529,#1e3a6e)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 22, color: '#0f2040', margin: '0 0 6px' }}>Set up your admin account</h1>
        {error ? (
          <p style={{ color: '#b91c1c', fontSize: 14, lineHeight: 1.6 }}>{error}</p>
        ) : !info ? (
          <p style={{ color: '#64748b', fontSize: 14 }}>Checking invitation...</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
              Hello {info.fullName}. You were invited as <b>{info.role}</b> ({info.email}). Enter the temporary password sent to you by email or SMS, then choose your own.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={labelStyle}>Temporary password (from your email or SMS)</label>
                <input type="text" style={inputStyle} value={temp} onChange={(e) => setTemp(e.target.value)} autoComplete="off" /></div>
              <div><label style={labelStyle}>New password</label>
                <input type="password" style={inputStyle} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></div>
              <div><label style={labelStyle}>Confirm new password</label>
                <input type="password" style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div>
              <button style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>{busy ? 'Saving...' : 'Save password'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return <Suspense fallback={null}><Inner /></Suspense>
}
