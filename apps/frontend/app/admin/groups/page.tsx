'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../lib/auth'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

const iS: any = {
  padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none',
}
const iF = (e: any) => e.target.style.borderColor = '#1e3a6e'
const iB = (e: any) => e.target.style.borderColor = '#e2e8f0'

export default function AdminGroupsPage() {
  const { user }                        = useAuth()
  const [groups,    setGroups]          = useState<any[]>([])
  const [loading,   setLoading]         = useState(true)
  const [showForm,  setShowForm]        = useState(false)
  const [creating,  setCreating]        = useState(false)
  const [form,      setForm]            = useState({ name: '', description: '' })
  const [selected,  setSelected]        = useState<any>(null)
  // Use member NUMBER (e.g. MBR-2026-XXXXX), not UUID
  const [memberNumber, setMemberNumber] = useState('')
  const [adding,    setAdding]          = useState(false)
  const [removing,  setRemoving]        = useState<string | null>(null)

  const canCreate = ['SUPER_ADMIN', 'SECRETARY'].includes(user?.role)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/groups?limit=50')
      setGroups(data.groups || [])
    } catch { toast.error('Failed to load groups') }
    finally { setLoading(false) }
  }

  const loadGroup = async (id: string) => {
    try {
      const { data } = await api.get(`/groups/${id}`)
      setSelected(data.group)
    } catch { toast.error('Failed to load group details') }
  }

  useEffect(() => { load() }, [])

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Group name is required'); return }
    setCreating(true)
    try {
      await api.post('/groups', form)
      toast.success('Group created!')
      setShowForm(false)
      setForm({ name: '', description: '' })
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create group')
    } finally { setCreating(false) }
  }

  // Add member by MEMBER NUMBER — backend looks up the user by memberNumber
  const addMember = async (groupId: string) => {
    const num = memberNumber.trim()
    if (!num) { toast.error('Enter a member number (e.g. MBR-2026-12345)'); return }
    setAdding(true)
    try {
      // Send memberNumber; backend resolves to userId
      await api.post(`/groups/${groupId}/members`, { memberNumber: num })
      toast.success(`Member ${num} added to group!`)
      setMemberNumber('')
      loadGroup(groupId)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Member not found — check the member number')
    } finally { setAdding(false) }
  }

  const removeMember = async (groupId: string, mId: string) => {
    if (!confirm('Remove this member from the group?')) return
    setRemoving(mId)
    try {
      await api.delete(`/groups/${groupId}/members/${mId}`)
      toast.success('Member removed from group.')
      loadGroup(groupId)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member')
    } finally { setRemoving(null) }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this group? Members will be unassigned but not deleted.')) return
    try {
      await api.delete(`/groups/${id}`)
      toast.success('Group deleted.')
      setSelected(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete group')
    }
  }

  return (
    <div style={{ padding: '32px 36px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>Groups</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>
            Manage welfare groups · add members using their <strong>member number</strong> (e.g. MBR-2026-XXXXX)
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(!showForm)} style={{ background: '#1e3a6e', color: '#fff', padding: '10px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            + New Group
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && canCreate && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 16 }}>Create New Group</div>
          <form onSubmit={createGroup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Group name *"
              style={{ ...iS, width: '100%', boxSizing: 'border-box' as any }}
              onFocus={iF} onBlur={iB} />
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              style={{ ...iS, width: '100%', boxSizing: 'border-box' as any }}
              onFocus={iF} onBlur={iB} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={creating} style={{ background: creating ? '#94a3b8' : '#1e3a6e', color: '#fff', padding: '10px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: 'none', cursor: creating ? 'not-allowed' : 'pointer' }}>
                {creating ? 'Creating...' : 'Create Group'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#475569', padding: '10px 18px', borderRadius: 9, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.1fr' : '1fr', gap: 24 }}>

        {/* Groups list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} style={{ height: 80, background: '#f1f5f9', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
            ))
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏘️</div>
              <div style={{ fontWeight: 600, color: '#64748b' }}>No groups yet</div>
              {canCreate && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Click "+ New Group" to create one</div>}
            </div>
          ) : groups.map(g => (
            <div key={g.id} onClick={() => loadGroup(g.id)} style={{
              background: '#fff', borderRadius: 14, padding: '18px 20px',
              border: `1.5px solid ${selected?.id === g.id ? '#1e3a6e' : '#e2e8f0'}`,
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: selected?.id === g.id ? '0 4px 16px rgba(30,58,110,0.1)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040' }}>{g.name}</div>
                  {g.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Created {new Date(g.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ background: '#eef2ff', borderRadius: 99, padding: '4px 12px', fontSize: 13, fontWeight: 600, color: '#1e3a6e' }}>
                    {g._count?.members ?? g.members?.length ?? 0} members
                  </div>
                  {selected?.id === g.id && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e3a6e' }} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Group detail panel */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', alignSelf: 'start' }}>

            {/* Panel header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f2040' }}>{selected.name}</div>
                {selected.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{selected.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {canCreate && (
                  <button onClick={() => deleteGroup(selected.id)} style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
                    Delete group
                  </button>
                )}
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
              </div>
            </div>

            {/* Add member by member number */}
            <div style={{ background: '#f8fafc', borderRadius: 11, padding: '14px 16px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Add member by member number</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={memberNumber}
                  onChange={e => setMemberNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMember(selected.id)}
                  placeholder="e.g. MBR-2026-12345"
                  style={{ ...iS, flex: 1 }}
                  onFocus={iF}
                  onBlur={iB}
                />
                <button
                  onClick={() => addMember(selected.id)}
                  disabled={adding}
                  style={{ background: adding ? '#94a3b8' : '#1e3a6e', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: adding ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {adding ? '...' : '+ Add'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                Enter the member's number as shown on their dashboard (e.g. MBR-2026-46844)
              </div>
            </div>

            {/* Members list */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Members ({selected.members?.length || 0})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {(selected.members || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
                  No members yet — add one using their member number above
                </div>
              ) : (selected.members || []).map((m: any) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 9, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1e3a6e', flexShrink: 0 }}>
                      {m.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f2040' }}>{m.fullName}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{m.memberNumber}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, background: m.memberType === 'FAMILY' ? '#eef2ff' : '#f1f5f9', color: m.memberType === 'FAMILY' ? '#1e3a6e' : '#64748b', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                      {m.memberType || 'SINGLE'}
                    </span>
                    <button
                      onClick={() => removeMember(selected.id, m.id)}
                      disabled={removing === m.id}
                      style={{ background: 'none', border: '1px solid #fecaca', color: removing === m.id ? '#94a3b8' : '#dc2626', cursor: removing === m.id ? 'not-allowed' : 'pointer', fontSize: 12, padding: '4px 10px', borderRadius: 6 }}
                    >
                      {removing === m.id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  )
}
