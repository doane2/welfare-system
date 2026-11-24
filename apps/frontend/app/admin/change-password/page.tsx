'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { changePassword } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { inputStyle, labelStyle, primaryBtn } from '../../../components/adminUi'

export default function ChangePasswordPage() {
  const { user, signIn } = useAuth()
  const router = useRouter()
  const forced = !!user?.mustChangePassword
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!current || !next) return toast.error('Fill in all fields')
    if (next.length < 10 || !/[a-z]/.test(next) || !/[A-Z]/.test(next) || !/\d/.test(next))
      return toast.error('Use at least 10 characters with upper case, lower case and a number')
    if (next !== confirm) return toast.error('Passwords do not match')
    if (next === current) return toast.error('New password must differ from the current one')
    setBusy(true)
    try {
      const { data } = await changePassword(current, next)
      toast.success('Password updated')
      signIn(data.token, data.user) // stores the fresh session and returns to the dashboard
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not change password')
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, border: '1px solid #e2e8f0' }}>
        <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 22, color: '#0f2040', margin: '0 0 6px' }}>
          {forced ? 'Set your own password' : 'Change password'}
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 22px', lineHeight: 1.6 }}>
          {forced ? 'For security you must replace your temporary password before using the admin portal.' : 'Choose a strong password you do not use anywhere else.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelStyle}>{forced ? 'Temporary password' : 'Current password'}</label>
            <input type="password" style={inputStyle} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></div>
          <div><label style={labelStyle}>New password</label>
            <input type="password" style={inputStyle} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></div>
          <div><label style={labelStyle}>Confirm new password</label>
            <input type="password" style={inputStyle} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div>
          <button style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>{busy ? 'Saving...' : 'Update password'}</button>
          {forced
            ? <button onClick={() => { localStorage.clear(); window.location.href = '/admin/login' }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Sign out</button>
            : <button onClick={() => router.push('/admin')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Cancel</button>}
        </div>
      </div>
    </div>
  )
}
