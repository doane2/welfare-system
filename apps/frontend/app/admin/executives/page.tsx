'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../lib/auth'
import { getExecutives, createExecutive, updateExecutive, deleteExecutive } from '../../../lib/api'
import { Badge, Modal, inputStyle, labelStyle, primaryBtn, ghostBtn, dangerBtn } from '../../../components/adminUi'

const SUGGESTED = ['Chairperson', 'Assistant Chairperson', 'Secretary', 'Assistant Secretary', 'Treasurer', 'Assistant Treasurer', 'Organizing Secretary', 'Trustee', 'Patron', 'Committee Member']
const empty = { fullName: '', position: '', phone: '', email: '', bio: '', displayOrder: '', termStart: '', termEnd: '', isActive: true }
const d10 = (v: any) => (v ? String(v).slice(0, 10) : '')

export default function ExecutivesPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { id?: string }>(null)
  const [form, setForm] = useState<any>(empty)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try { const { data } = await getExecutives({ all: true }); setItems(data.executives || []) }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed to load executives') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(empty); setModal({}) }
  const openEdit = (x: any) => {
    setForm({ fullName: x.fullName, position: x.position, phone: x.phone || '', email: x.email || '', bio: x.bio || '', displayOrder: x.displayOrder, termStart: d10(x.termStart), termEnd: d10(x.termEnd), isActive: x.isActive })
    setModal({ id: x.id })
  }

  const save = async () => {
    setBusy(true)
    const payload = { ...form, displayOrder: form.displayOrder === '' ? undefined : Number(form.displayOrder), termStart: form.termStart || null, termEnd: form.termEnd || null }
    try {
      if (modal?.id) await updateExecutive(modal.id, payload); else await createExecutive(payload)
      toast.success(modal?.id ? 'Executive updated' : 'Executive added')
      setModal(null); load()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not save') }
    finally { setBusy(false) }
  }

  const remove = async (x: any) => {
    if (!window.confirm(`Remove ${x.fullName} (${x.position})? To keep history, untick Active instead.`)) return
    try { await deleteExecutive(x.id); toast.success('Removed'); load() }
    catch (e: any) { toast.error(e.response?.data?.message || 'Could not remove') }
  }

  if (user && user.role !== 'SUPER_ADMIN') return <div style={{ padding: 36 }}>You do not have access to this page.</div>

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, color: '#0f2040', margin: 0 }}>Welfare Executive</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Shown to members on their dashboard. This list is informational and does not grant admin access.</p>
        </div>
        <button style={primaryBtn} onClick={openNew}>+ Add executive</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflowX: 'auto' }}>
        {loading ? <div style={{ padding: 28, color: '#94a3b8' }}>Loading...</div> : items.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No executives yet.</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {['Order', 'Name', 'Position', 'Contact', 'Status', 'Actions'].map((h) => <th key={h} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{x.displayOrder}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f2040' }}>{x.fullName}</td>
                  <td style={{ padding: '12px 16px' }}>{x.position}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{x.phone || '-'}<br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{x.email || ''}</span></td>
                  <td style={{ padding: '12px 16px' }}>{x.isActive ? <Badge bg="#dcfce7" fg="#166534">Active</Badge> : <Badge bg="#f1f5f9" fg="#475569">Archived</Badge>}</td>
                  <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', gap: 6 }}>
                    <button style={ghostBtn} onClick={() => openEdit(x)}>Edit</button>
                    <button style={dangerBtn} onClick={() => remove(x)}>Remove</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.id ? 'Edit executive' : 'Add executive'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label style={labelStyle}>Full name</label><input style={inputStyle} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><label style={labelStyle}>Position (pick or type your own)</label>
              <input style={inputStyle} list="exec-positions" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              <datalist id="exec-positions">{SUGGESTED.map((p) => <option key={p} value={p} />)}</datalist></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label style={labelStyle}>Email</label><input style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Term start</label><input type="date" style={inputStyle} value={form.termStart} onChange={(e) => setForm({ ...form, termStart: e.target.value })} /></div>
              <div><label style={labelStyle}>Term end</label><input type="date" style={inputStyle} value={form.termEnd} onChange={(e) => setForm({ ...form, termEnd: e.target.value })} /></div>
              <div><label style={labelStyle}>Order (blank = auto)</label><input type="number" style={inputStyle} value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} /></div>
            </div>
            <div><label style={labelStyle}>Short bio (optional)</label><textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f2040' }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (visible to members)
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={ghostBtn} onClick={() => setModal(null)}>Cancel</button>
              <button style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
