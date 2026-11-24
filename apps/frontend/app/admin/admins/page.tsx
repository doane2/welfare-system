'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../lib/auth'
import {
  getAdminUsers, createAdminUser, updateAdminUser, deactivateAdminUser,
  reactivateAdminUser, resetAdminCredentials, deleteAdminUser,
} from '../../../lib/api'
import { Badge, Modal, inputStyle, labelStyle, primaryBtn, ghostBtn, dangerBtn } from '../../../components/adminUi'

const ROLE_NAMES: Record<string, string> = { SUPER_ADMIN: 'Platform Admin', TREASURER: 'Treasurer', SECRETARY: 'Secretary' }
const ROLE_STYLE: Record<string, { bg: string; fg: string }> = {
  SUPER_ADMIN: { bg: '#fef3c7', fg: '#92400e' }, TREASURER: { bg: '#dcfce7', fg: '#166534' }, SECRETARY: { bg: '#e0e7ff', fg: '#3730a3' },
}
const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  ACTIVE: { bg: '#dcfce7', fg: '#166534', label: 'Active' },
  INVITE_PENDING: { bg: '#fef3c7', fg: '#92400e', label: 'Invite pending' },
  INVITE_EXPIRED: { bg: '#fee2e2', fg: '#991b1b', label: 'Invite expired' },
  DEACTIVATED: { bg: '#f1f5f9', fg: '#475569', label: 'Deactivated' },
}
const empty = { fullName: '', email: '', phone: '', role: 'TREASURER' }

export default function AdminsPage() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState<any[]>([])
  const [limits, setLimits] = useState<any>({})
  const [viewerIsPrimary, setViewerIsPrimary] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; admin?: any }>(null)
  const [form, setForm] = useState<any>(empty)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await getAdminUsers()
      setAdmins(data.admins || []); setLimits(data.limits || {}); setViewerIsPrimary(!!data.viewerIsPrimary)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load administrators')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const roleFull = (r: string) => limits[r] && limits[r].used >= limits[r].max
  const allowedRoles = viewerIsPrimary ? ['SUPER_ADMIN', 'TREASURER', 'SECRETARY'] : ['TREASURER', 'SECRETARY']

  const openCreate = () => { setForm({ ...empty, role: allowedRoles.find((r) => !roleFull(r)) || 'TREASURER' }); setModal({ mode: 'create' }) }
  const openEdit = (a: any) => { setForm({ fullName: a.fullName, phone: a.phone || '', role: a.role, email: a.email }); setModal({ mode: 'edit', admin: a }) }

  const save = async () => {
    setBusy(true)
    try {
      if (modal?.mode === 'create') {
        const { data } = await createAdminUser({ fullName: form.fullName, email: form.email, phone: form.phone, role: form.role })
        setResult({ title: 'Administrator created', ...data })
      } else if (modal?.admin) {
        await updateAdminUser(modal.admin.id, { fullName: form.fullName, phone: form.phone, role: form.role })
        toast.success('Administrator updated')
      }
      setModal(null); load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save')
    } finally { setBusy(false) }
  }

  const act = async (fn: () => Promise<any>, ok: string, confirmMsg?: string, showResult?: boolean) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    try {
      const { data } = await fn()
      if (showResult) setResult({ title: 'New credentials issued', ...data }); else toast.success(data.message || ok)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Action failed')
    }
  }

  if (user && user.role !== 'SUPER_ADMIN') return <div style={{ padding: 36 }}>You do not have access to this page.</div>

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, color: '#0f2040', margin: 0 }}>Administrators</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Admin accounts are separate from member accounts and must use a different email.</p>
        </div>
        <button style={primaryBtn} onClick={openCreate}>+ Add administrator</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
        {['SUPER_ADMIN', 'TREASURER', 'SECRETARY'].map((r) => (
          <div key={r} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{r === 'SUPER_ADMIN' ? 'Super admins (incl. primary)' : ROLE_NAMES[r] + 's'}</div>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 24, fontWeight: 700, color: roleFull(r) ? '#b45309' : '#1e3a6e' }}>{limits[r]?.used ?? '-'} / {limits[r]?.max ?? '-'}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflowX: 'auto' }}>
        {loading ? <div style={{ padding: 28, color: '#94a3b8' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {['Name', 'Role', 'Status', 'Contact', 'Actions'].map((h) => <th key={h} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {admins.map((a) => {
                const st = STATUS_STYLE[a.status] || STATUS_STYLE.ACTIVE
                const rs = ROLE_STYLE[a.role]
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f2040' }}>{a.fullName}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.createdByAdmin ? `Added by ${a.createdByAdmin.fullName}` : 'Seeded account'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><Badge bg={rs.bg} fg={rs.fg}>{a.label}</Badge></td>
                    <td style={{ padding: '12px 16px' }}><Badge bg={st.bg} fg={st.fg}>{st.label}</Badge></td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{a.email}<br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{a.phone || 'No phone'}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      {a.isPrimary ? <span style={{ fontSize: 12, color: '#92400e' }}>Protected - cannot be changed</span>
                        : !a.canManage ? <span style={{ fontSize: 12, color: '#94a3b8' }}>No permission</span>
                        : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={ghostBtn} onClick={() => openEdit(a)}>Edit</button>
                            {a.status === 'DEACTIVATED'
                              ? <button style={ghostBtn} onClick={() => act(() => reactivateAdminUser(a.id), 'Reactivated')}>Reactivate</button>
                              : <>
                                  <button style={ghostBtn} onClick={() => act(() => resetAdminCredentials(a.id), 'Reset', `Issue new temporary credentials to ${a.fullName}? Their current sessions will end.`, true)}>Reset credentials</button>
                                  <button style={dangerBtn} onClick={() => act(() => deactivateAdminUser(a.id), 'Deactivated', `Deactivate ${a.fullName}? They will be signed out immediately.`)}>Deactivate</button>
                                </>}
                            <button style={dangerBtn} onClick={() => act(() => deleteAdminUser(a.id), 'Deleted', `Permanently delete ${a.fullName}? This only works if they have no activity history.`)}>Delete</button>
                          </div>
                        )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Add administrator' : 'Edit administrator'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={labelStyle}>Full name</label><input style={inputStyle} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><label style={labelStyle}>Email (must differ from any member email)</label>
              <input style={{ ...inputStyle, background: modal.mode === 'edit' ? '#f1f5f9' : '#fff' }} disabled={modal.mode === 'edit'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label style={labelStyle}>Phone (receives the temporary password and OTPs)</label><input style={inputStyle} placeholder="+2547XXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label style={labelStyle}>Role</label>
              <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {allowedRoles.map((r) => {
                  const blocked = roleFull(r) && !(modal.admin && modal.admin.role === r)
                  return <option key={r} value={r} disabled={blocked}>{ROLE_NAMES[r]}{blocked ? ' (limit reached)' : ''}</option>
                })}
              </select></div>
            {modal.mode === 'create' && <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>The temporary password and invitation link are sent by email and SMS (to whichever channels are available). They must set their own password before using the portal.</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={ghostBtn} onClick={() => setModal(null)}>Cancel</button>
              <button style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>{busy ? 'Saving...' : modal.mode === 'create' ? 'Create & send invite' : 'Save changes'}</button>
            </div>
          </div>
        </Modal>
      )}

      {result && (
        <Modal title={result.title} onClose={() => setResult(null)}>
          <div style={{ fontSize: 14, color: '#0f2040', lineHeight: 1.8 }}>
            <div>{result.delivery?.email ? 'Sent' : 'Not sent'}: email (temporary password + link)</div>
            <div>{result.delivery?.sms ? 'Sent' : 'Not sent'}: SMS (temporary password + link)</div>
          </div>
          {result.manualCredentials && (
            <div style={{ marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14, fontSize: 13 }}>
              <b>Neither email nor SMS could be delivered.</b> Share these securely with the administrator. They are shown only once.
              <div style={{ marginTop: 10, wordBreak: 'break-all' }}>Temporary password: <b style={{ fontFamily: 'monospace' }}>{result.manualCredentials.tempPassword}</b></div>
              <div style={{ marginTop: 6, wordBreak: 'break-all' }}>Invite link: {result.manualCredentials.inviteLink}</div>
              <button style={{ ...ghostBtn, marginTop: 10 }} onClick={() => { navigator.clipboard.writeText(`Temporary password: ${result.manualCredentials.tempPassword}\nInvite link: ${result.manualCredentials.inviteLink}`); toast.success('Copied') }}>Copy both</button>
            </div>
          )}
          <div style={{ textAlign: 'right', marginTop: 18 }}><button style={primaryBtn} onClick={() => setResult(null)}>Done</button></div>
        </Modal>
      )}
    </div>
  )
}
