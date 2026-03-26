'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '../../../../lib/api'
import { useAuth } from '../../../../lib/auth'
import toast from 'react-hot-toast'

type Tab = 'overview'|'payments'|'contributions'|'loans'|'dependents'|'account'|'deceased'

const TABS:{key:Tab;label:string;roles:string[]}[] = [
  {key:'overview',      label:'Overview',           roles:['SUPER_ADMIN','TREASURER','SECRETARY']},
  {key:'payments',      label:'Payments',           roles:['SUPER_ADMIN','TREASURER']},
  {key:'contributions', label:'Contributions',      roles:['SUPER_ADMIN','TREASURER']},
  {key:'loans',         label:'Loans',              roles:['SUPER_ADMIN','TREASURER']},
  {key:'dependents',    label:'Dependents',         roles:['SUPER_ADMIN','SECRETARY']},
  {key:'account',       label:'🔧 Account Mgmt',   roles:['SUPER_ADMIN']},
  {key:'deceased',      label:'⚫ Deceased',        roles:['SUPER_ADMIN','SECRETARY']},
]

const SC:{[k:string]:{bg:string;color:string}} = {
  APPROVED:{bg:'#dcfce7',color:'#15803d'}, PAID:{bg:'#dcfce7',color:'#15803d'},
  COMPLETED:{bg:'#dcfce7',color:'#15803d'}, PENDING:{bg:'#fef3c7',color:'#b45309'},
  PENDING_APPROVAL:{bg:'#fef3c7',color:'#b45309'}, REJECTED:{bg:'#fee2e2',color:'#b91c1c'},
  FAILED:{bg:'#fee2e2',color:'#b91c1c'},
}

const Badge = ({status}:{status:string}) => {
  const s = SC[status]||{bg:'#f1f5f9',color:'#475569'}
  return <span style={{display:'inline-flex',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,background:s.bg,color:s.color}}>{status.replace(/_/g,' ').toLowerCase()}</span>
}

const iS:any={width:'100%',padding:'10px 13px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box'}
const iF=(e:any)=>e.target.style.borderColor='#1e3a6e'
const iB=(e:any)=>e.target.style.borderColor='#e2e8f0'

function Skel({cols,rows}:{cols:number;rows:number}) {
  return (
    <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <tbody>
          {Array(rows).fill(0).map((_,i)=>(
            <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
              {Array(cols).fill(0).map((_,j)=>(
                <td key={j} style={{padding:'13px 16px'}}>
                  <div style={{height:13,background:'#f1f5f9',borderRadius:4,animation:'pulse 1.5s ease infinite'}}/>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MemberDetailPage() {
  const {id}               = useParams<{id:string}>()
  const {user:au}          = useAuth()
  const router             = useRouter()
  const [member,setMember] = useState<any>(null)
  const [tab,setTab]       = useState<Tab>('overview')
  const [loading,setL]     = useState(true)
  const [td,setTd]         = useState<any>(null)
  const [tl,setTl]         = useState(false)
  const [ll,setLl]         = useState<any>(null)

  useEffect(()=>{
    api.get(`/members/${id}`)
      .then(({data})=>setMember(data.member||data))
      .catch(()=>toast.error('Failed to load member'))
      .finally(()=>setL(false))
  },[id])

  useEffect(()=>{
    if(!id||tab==='overview'||tab==='account')return
    setTd(null);setTl(true)
    const load=async()=>{
      try{
        if(tab==='payments'){
          const[pr,cr]=await Promise.allSettled([api.get(`/mpesa/pending?limit=100`),api.get(`/contributions?userId=${id}&limit=100`)])
          const pend=pr.status==='fulfilled'?(pr.value.data.payments||[]).filter((p:any)=>p.userId===id):[]
          const pays=(cr.status==='fulfilled'?(cr.value.data.contributions||[]):[]).flatMap((c:any)=>c.payments||[])
          setTd({pending:pend,payments:pays})
        }else if(tab==='contributions'){
          const{data}=await api.get(`/contributions?userId=${id}&limit=100`)
          setTd(data)
        }else if(tab==='loans'){
          const[lr,lim]=await Promise.allSettled([api.get(`/loans?userId=${id}&limit=50`),api.get(`/loans/limit/${id}`)])
          setTd(lr.status==='fulfilled'?lr.value.data:{loans:[]})
          if(lim.status==='fulfilled')setLl(lim.value.data)
        }else if(tab==='dependents'){
          const [depRes, reqRes] = await Promise.allSettled([
            api.get(`/dependents/member/${id}`),
            api.get(`/beneficiary-requests?memberId=${id}`),
          ])
          const dependents = depRes.status === 'fulfilled' ? depRes.value.data : {}
          const requests   = reqRes.status === 'fulfilled' ? (reqRes.value.data.requests || []) : []
          setTd({ ...dependents, beneficiaryRequests: requests })
        }
      }catch(e:any){console.error('Tab error:',e.message);toast.error(`Failed to load ${tab}`)}
      finally{setTl(false)}
    }
    load()
  },[tab,id])

  const refresh=()=>{const c=tab;setTab('overview');setTimeout(()=>setTab(c),40)}
  const refreshMember=()=>{
    api.get(`/members/${id}`).then(({data})=>setMember(data.member||data)).catch(()=>{})
  }

  const vt=TABS.filter(t=>t.roles.includes(au?.role))
  const canEdit=['SUPER_ADMIN','SECRETARY'].includes(au?.role)

  // ── Derive header status badge ───────────────────────────────────────────
  const headerBadge = (m: any) => {
    if (m.accountStatus === 'ANONYMISED') return { label: 'Anonymised', bg: '#f1f5f9',  color: '#475569' }
    if (m.accountStatus === 'INACTIVE')   return { label: 'Inactive',   bg: '#fee2e2',  color: '#b91c1c' }
    if (m.isActive)                        return { label: 'Active',     bg: '#dcfce7',  color: '#15803d' }
    return                                        { label: 'Pending',    bg: '#fef3c7',  color: '#b45309' }
  }

  if(loading) return(
    <div style={{padding:'32px 36px'}}>
      {Array(3).fill(0).map((_,i)=><div key={i} style={{height:60,background:'#f1f5f9',borderRadius:12,marginBottom:14,animation:'pulse 1.5s ease infinite'}}/>)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )

  if(!member) return(
    <div style={{padding:'32px 36px',textAlign:'center'}}>
      <p style={{color:'#94a3b8',marginBottom:16}}>Member not found.</p>
      <Link href="/admin/members" style={{color:'#1e3a6e',fontSize:14}}>← Back to members</Link>
    </div>
  )

  const badge = headerBadge(member)

  return(
    <div style={{padding:'32px 36px',maxWidth:'100%',boxSizing:'border-box' as any,overflowX:'hidden'}}>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <Link href="/admin/members" style={{color:'#94a3b8',textDecoration:'none',fontSize:22,lineHeight:1}}>←</Link>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:'#eef2ff',border:'2px solid #1e3a6e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'#1e3a6e',flexShrink:0}}>
              {member.accountStatus === 'ANONYMISED'
                ? '🔒'
                : member.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <h1 style={{fontFamily:'Georgia,serif',fontSize:20,fontWeight:700,color:'#0f2040',marginBottom:4}}>{member.fullName}</h1>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{fontSize:12,color:'#64748b',fontFamily:'monospace'}}>{member.memberNumber}</span>
                <span style={{display:'inline-flex',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600,background:badge.bg,color:badge.color}}>{badge.label}</span>
                <span style={{display:'inline-flex',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600,background:'#eef2ff',color:'#1e3a6e'}}>{member.memberType||'SINGLE'}</span>
                {member.loanEligible&&<span style={{display:'inline-flex',padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:600,background:'#dcfce7',color:'#15803d'}}>Loan eligible</span>}
              </div>
            </div>
          </div>
        </div>
        {canEdit && member.accountStatus !== 'ANONYMISED' && (
          <Link href={`/admin/members/${id}/edit`}
            style={{display:'inline-flex',alignItems:'center',gap:8,background:'#1e3a6e',color:'#fff',padding:'10px 22px',borderRadius:9,fontSize:14,fontWeight:600,textDecoration:'none',flexShrink:0}}>
            ✏️ Edit Member Info
          </Link>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div style={{display:'flex',borderBottom:'1px solid #e2e8f0',marginBottom:24,overflowX:'auto',WebkitOverflowScrolling:'touch' as any}}>
        {vt.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            padding:'10px 18px',borderRadius:'8px 8px 0 0',fontSize:13,fontWeight:500,
            border:'none',cursor:'pointer',whiteSpace:'nowrap',
            background:tab===t.key?'#fff':'transparent',
            color:tab===t.key?'#0f2040':'#94a3b8',
            borderBottom:tab===t.key?'2px solid #1e3a6e':'2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div style={{minWidth:0,overflow:'hidden'}}>
        {tab==='overview'      &&<OverviewTab      member={member} canEdit={canEdit} memberId={id} onRefreshMember={refreshMember}/>}
        {tab==='payments'      &&<PaymentsTab      data={td} loading={tl} onRefresh={refresh}/>}
        {tab==='contributions' &&<ContributionsTab data={td} loading={tl} memberId={id} onRefresh={refresh}/>}
        {tab==='loans'         &&<LoansTab         data={td} loading={tl} loanLimit={ll} memberId={id} onRefresh={refresh}/>}
        {tab==='dependents'    &&<DependentsTab    data={td} loading={tl} memberId={id} onRefresh={refresh} adminRole={au?.role}/>}
        {tab==='account'       &&<AccountMgmtTab  member={member} memberId={id} onRefreshMember={refreshMember}/>}
        {tab==='deceased'      &&<DeceasedTab      memberId={id} member={member} onRefreshMember={refreshMember}/>}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}

// ── ACCOUNT MANAGEMENT TAB ────────────────────────────────────────────────────
function AccountMgmtTab({member, memberId, onRefreshMember}: {member:any; memberId:string; onRefreshMember:()=>void}) {
  const [acting,  setActing]  = useState<string|null>(null)
  const [showAnon, setShowAnon] = useState(false)
  const [anonConfirm, setAnonConfirm] = useState('')

  const status = member.accountStatus || 'ACTIVE'
  const isAnon  = status === 'ANONYMISED'

  const activate = async () => {
    setActing('activate')
    try {
      await api.post(`/members/${memberId}/activate`)
      toast.success('Account activated — member notified by email.')
      onRefreshMember()
    } catch (e:any) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setActing(null) }
  }

  const deactivate = async () => {
    if (!confirm(`Deactivate ${member.fullName}'s account? They will not be able to log in until reactivated.`)) return
    setActing('deactivate')
    try {
      await api.post(`/members/${memberId}/deactivate`)
      toast.success('Account deactivated — member notified by email.')
      onRefreshMember()
    } catch (e:any) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setActing(null) }
  }

  const sendReset = async () => {
    setActing('reset')
    try {
      await api.post(`/members/${memberId}/send-reset-link`)
      toast.success(`Password reset link sent to ${member.email}`)
    } catch (e:any) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setActing(null) }
  }

  const anonymise = async () => {
    if (anonConfirm !== 'ANONYMISE') { toast.error('Type ANONYMISE to confirm'); return }
    setActing('anonymise')
    try {
      await api.post(`/members/${memberId}/anonymise`)
      toast.success('Account anonymised. All personal data has been removed.')
      setShowAnon(false)
      setAnonConfirm('')
      onRefreshMember()
    } catch (e:any) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setActing(null) }
  }

  const btn = (label:string, onClick:()=>void, opts:{bg:string;color:string;disabled?:boolean;border?:string}) => (
    <button onClick={onClick} disabled={opts.disabled || acting !== null}
      style={{
        padding: '10px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600,
        border: opts.border || 'none',
        background: (opts.disabled || acting !== null) ? '#f1f5f9' : opts.bg,
        color:      (opts.disabled || acting !== null) ? '#94a3b8' : opts.color,
        cursor:     (opts.disabled || acting !== null) ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}>
      {acting ? '...' : label}
    </button>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{background:'#fff',borderRadius:14,padding:24,border:'1px solid #e2e8f0'}}>
        <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:16}}>Current account status</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
          {[
            { l: 'Account Status', v: status,                   c: status==='ACTIVE'?'#15803d':status==='INACTIVE'?'#b91c1c':'#475569' },
            { l: 'Login Enabled',  v: member.isActive?'Yes':'No', c: member.isActive?'#15803d':'#b91c1c' },
            { l: 'Deactivated At', v: member.deactivatedAt ? new Date(member.deactivatedAt).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}) : '—', c: '#0f2040' },
          ].map(s=>(
            <div key={s.l} style={{background:'#f8fafc',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{s.l}</div>
              <div style={{fontSize:15,fontWeight:700,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
        {member.anonymisedAt && (
          <div style={{marginTop:12,fontSize:12,color:'#94a3b8'}}>
            Anonymised on {new Date(member.anonymisedAt).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}
          </div>
        )}
      </div>

      {!isAnon && (
        <div style={{background:'#fff',borderRadius:14,padding:24,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>Activate / Deactivate</div>
          <p style={{fontSize:13,color:'#64748b',marginBottom:18,lineHeight:1.6}}>
            Deactivating prevents the member from logging in — all data is preserved and can be restored by activating again.
            The member will receive an email notification on either action.
          </p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {status !== 'ACTIVE' && btn('✅ Activate Account', activate, {bg:'#16a34a', color:'#fff', disabled: isAnon})}
            {status === 'ACTIVE' && btn('⏸ Deactivate Account', deactivate, {bg:'#fff', color:'#b91c1c', border:'1.5px solid #fecaca'})}
          </div>
        </div>
      )}

      {!isAnon && (
        <div style={{background:'#fff',borderRadius:14,padding:24,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>Password Reset</div>
          <p style={{fontSize:13,color:'#64748b',marginBottom:18,lineHeight:1.6}}>
            Use this when a member requests help resetting their password. A secure link valid for <strong>24 hours</strong> will be sent
            directly to <strong>{member.email}</strong>. The link is single-use and invalidated after use.
          </p>
          <div style={{display:'flex',gap:10}}>
            {btn('🔑 Send Password Reset Link', sendReset, {
              bg:'#1e3a6e', color:'#fff',
              disabled: status === 'INACTIVE',
            })}
          </div>
          {status === 'INACTIVE' && (
            <p style={{fontSize:12,color:'#b91c1c',marginTop:10}}>⚠️ Activate the account before sending a reset link.</p>
          )}
        </div>
      )}

      <div style={{
        background: isAnon ? '#f8fafc' : '#fff',
        borderRadius:14, padding:24,
        border: `1.5px solid ${isAnon ? '#e2e8f0' : '#fecaca'}`,
      }}>
        <div style={{fontSize:11,fontWeight:600,color:isAnon?'#94a3b8':'#b91c1c',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>
          {isAnon ? 'Account Anonymised' : '⚠️  Anonymise Account (Irreversible)'}
        </div>

        {isAnon ? (
          <div style={{display:'flex',gap:14,alignItems:'flex-start',marginTop:8}}>
            <div style={{fontSize:28}}>🔒</div>
            <div>
              <p style={{fontSize:13,color:'#64748b',margin:0,lineHeight:1.6}}>
                This account has been anonymised. All personal information has been permanently removed.
                This action cannot be undone.
              </p>
              {member.anonymisedAt && (
                <p style={{fontSize:12,color:'#94a3b8',marginTop:6}}>
                  Anonymised on {new Date(member.anonymisedAt).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <p style={{fontSize:13,color:'#64748b',marginBottom:18,lineHeight:1.6}}>
              Anonymising permanently replaces all personal information (name, email, phone, national ID) with placeholder values.
              The account is locked and <strong>cannot be restored</strong>. Only use this upon a verified written request from the member.
            </p>

            {!showAnon ? (
              <button onClick={() => setShowAnon(true)} disabled={acting !== null}
                style={{padding:'10px 22px',borderRadius:9,fontSize:13,fontWeight:600,border:'1.5px solid #fecaca',background:'transparent',color:'#b91c1c',cursor:'pointer'}}>
                🗑 Request Anonymisation
              </button>
            ) : (
              <div style={{background:'#fef2f2',borderRadius:10,padding:'18px 20px',border:'1px solid #fecaca'}}>
                <p style={{fontSize:13,color:'#b91c1c',fontWeight:600,marginBottom:6}}>This action is permanent and cannot be undone.</p>
                <p style={{fontSize:13,color:'#64748b',marginBottom:14}}>
                  Type <strong>ANONYMISE</strong> below to confirm you want to permanently remove all personal data for <strong>{member.fullName}</strong>.
                </p>
                <input
                  value={anonConfirm}
                  onChange={e => setAnonConfirm(e.target.value)}
                  placeholder="Type ANONYMISE to confirm"
                  style={{...iS, marginBottom:14, borderColor:'#fecaca', fontFamily:'monospace', fontSize:14, letterSpacing:2}}
                  onFocus={(e:any) => e.target.style.borderColor='#dc2626'}
                  onBlur={(e:any)  => e.target.style.borderColor='#fecaca'}
                />
                <div style={{display:'flex',gap:8}}>
                  <button onClick={anonymise}
                    disabled={anonConfirm !== 'ANONYMISE' || acting !== null}
                    style={{
                      padding:'10px 22px',borderRadius:9,fontSize:13,fontWeight:600,border:'none',
                      background: (anonConfirm !== 'ANONYMISE' || acting !== null) ? '#f1f5f9' : '#dc2626',
                      color:      (anonConfirm !== 'ANONYMISE' || acting !== null) ? '#94a3b8' : '#fff',
                      cursor:     (anonConfirm !== 'ANONYMISE' || acting !== null) ? 'not-allowed' : 'pointer',
                    }}>
                    {acting === 'anonymise' ? 'Anonymising...' : '🗑 Confirm — Anonymise Permanently'}
                  </button>
                  <button onClick={() => { setShowAnon(false); setAnonConfirm('') }}
                    style={{padding:'10px 18px',borderRadius:9,fontSize:13,border:'none',background:'#f1f5f9',color:'#475569',cursor:'pointer'}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function OverviewTab({member,canEdit,memberId,onRefreshMember}:{member:any;canEdit:boolean;memberId:string;onRefreshMember:()=>void}) {
  const [changing,   setChanging]   = useState(false)
  const [newType,    setNewType]    = useState(member.memberType||'SINGLE')
  const [savingType, setSavingType] = useState(false)

  const saveType = async () => {
    if (newType === member.memberType) { setChanging(false); return }
    setSavingType(true)
    try {
      await api.put(`/members/${memberId}`, { memberType: newType })
      toast.success(`Member type updated to ${newType}! Rate: KES ${newType==='FAMILY'?500:200}/month`)
      setChanging(false); onRefreshMember()
    } catch (e:any) { toast.error(e.response?.data?.message||'Failed to update') }
    finally { setSavingType(false) }
  }

  const rows = [
    {l:'Full name',   v:member.fullName},
    {l:'Email',       v:member.email},
    {l:'Phone',       v:member.phone||'—'},
    {l:'National ID', v:member.nationalId||'—'},
    {l:'Member no.',  v:member.memberNumber},
    {l:'Group',       v:member.group?.name||'—'},
    {l:'Joined',      v:new Date(member.createdAt).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})},
    {l:'Loan eligible',v:member.loanEligible?'Yes':'No'},
  ]

  return(
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20}}>
      <div style={{background:'#fff',borderRadius:14,padding:24,border:'1px solid #e2e8f0',minWidth:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em'}}>Member information</div>
          {canEdit&&<Link href={`/admin/members/${memberId}/edit`} style={{fontSize:13,color:'#1e3a6e',fontWeight:500,textDecoration:'none',background:'#eef2ff',padding:'5px 12px',borderRadius:7}}>✏️ Edit</Link>}
        </div>
        {rows.map(r=>(
          <div key={r.l} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #f1f5f9',fontSize:13,gap:12}}>
            <span style={{color:'#64748b',flexShrink:0}}>{r.l}</span>
            <span style={{fontWeight:500,color:'#0f2040',textAlign:'right',wordBreak:'break-word' as any,minWidth:0}}>{r.v}</span>
          </div>
        ))}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:16,minWidth:0}}>
        <div style={{background:'#fff',borderRadius:14,padding:24,border:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em'}}>Member type & contribution rate</div>
            {canEdit&&!changing&&<button onClick={()=>setChanging(true)} style={{fontSize:12,color:'#1e3a6e',background:'#eef2ff',border:'none',padding:'5px 12px',borderRadius:7,cursor:'pointer',fontWeight:500}}>Change type</button>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:changing?16:0}}>
            {[
              {type:'SINGLE',rate:200,label:'Single member',active:member.memberType==='SINGLE'},
              {type:'FAMILY',rate:500,label:'Family member', active:member.memberType==='FAMILY'},
            ].map(t=>(
              <div key={t.type} style={{background:t.active?'#eef2ff':'#f8fafc',borderRadius:10,padding:'14px 16px',border:`1.5px solid ${t.active?'#1e3a6e':'#e2e8f0'}`}}>
                <div style={{fontWeight:600,fontSize:13,color:t.active?'#1e3a6e':'#64748b',marginBottom:4}}>{t.active&&'✓ '}{t.label}</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>KES {t.rate}/month</div>
                <div style={{fontSize:12,color:'#94a3b8'}}>KES {t.rate*12}/year</div>
              </div>
            ))}
          </div>
          {changing&&canEdit&&(
            <div style={{background:'#f8fafc',borderRadius:10,padding:16,border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:12,fontWeight:500,color:'#374151',marginBottom:10}}>Select new member type:</div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                {[{v:'SINGLE',l:'Single member — KES 200/month (KES 2,400/year)'},{v:'FAMILY',l:'Family member — KES 500/month (KES 6,000/year)'}].map(o=>(
                  <label key={o.v} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 12px',borderRadius:8,background:newType===o.v?'#eef2ff':'transparent',border:`1px solid ${newType===o.v?'#c7d2fe':'transparent'}`}}>
                    <input type="radio" value={o.v} checked={newType===o.v} onChange={e=>setNewType(e.target.value)} style={{accentColor:'#1e3a6e'}}/>
                    <span style={{fontSize:13,color:newType===o.v?'#1e3a6e':'#374151',fontWeight:newType===o.v?500:400}}>{o.l}</span>
                  </label>
                ))}
              </div>
              <div style={{background:'#fef3c7',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#92400e',marginBottom:12}}>
                ⚠️ Changing member type immediately updates the monthly rate and recalculates arrears on the member's dashboard.
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={saveType} disabled={savingType} style={{background:savingType?'#94a3b8':'#1e3a6e',color:'#fff',padding:'9px 20px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',cursor:savingType?'not-allowed':'pointer'}}>{savingType?'Saving...':'Save change'}</button>
                <button onClick={()=>{setChanging(false);setNewType(member.memberType||'SINGLE')}} style={{background:'#f1f5f9',color:'#475569',padding:'9px 16px',borderRadius:8,fontSize:13,border:'none',cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div style={{background:'linear-gradient(135deg,#0f2040,#1e3a6e)',borderRadius:14,padding:20,color:'#fff'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:14}}>Contribution summary</div>
          {[
            {l:'Monthly rate',  v:`KES ${(member.monthlyRate||200).toLocaleString()}/month`},
            {l:'Annual rate',   v:`KES ${((member.monthlyRate||200)*12).toLocaleString()}/year`},
            {l:'Loan eligible', v:member.loanEligible?'Yes':'No'},
            {l:'Loan limit',    v:member.loanLimitOverride?`KES ${Number(member.loanLimitOverride).toLocaleString()} (manual)`:'Auto-calculated'},
          ].map(r=>(
            <div key={r.l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.08)',fontSize:13,gap:8}}>
              <span style={{color:'rgba(255,255,255,0.5)',flexShrink:0}}>{r.l}</span>
              <span style={{fontWeight:500,color:'#f5c842',textAlign:'right'}}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
function PaymentsTab({data,loading,onRefresh}:any){
  const[acting,setActing]=useState<string|null>(null)
  const approve=async(pid:string)=>{setActing(pid);try{await api.patch(`/mpesa/${pid}/approve`);toast.success('Approved!');onRefresh()}catch(e:any){toast.error(e.response?.data?.message||'Failed')}finally{setActing(null)}}
  if(loading)return<Skel cols={5} rows={5}/>
  const pend=data?.pending||[],pays=data?.payments||[]
  return<div style={{display:'flex',flexDirection:'column',gap:20}}>
    {pend.length>0&&<div style={{background:'#fff',borderRadius:14,border:'1px solid #fde68a',overflow:'hidden'}}>
      <div style={{padding:'13px 20px',background:'#fef3c7',fontWeight:600,fontSize:13,color:'#b45309'}}>⏳ {pend.length} pending approval</div>
      <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr style={{background:'#fefce8'}}>{['Amount','Method','Ref','Period','Date',''].map(h=><th key={h} style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
      <tbody>{pend.map((p:any)=><tr key={p.id} style={{borderTop:'1px solid #f1f5f9'}}>
        <td style={{padding:'12px 16px',fontWeight:700,whiteSpace:'nowrap'}}>KES {Number(p.amount).toLocaleString()}</td>
        <td style={{padding:'12px 16px',fontSize:12}}>{p.method}</td>
        <td style={{padding:'12px 16px',fontFamily:'monospace',fontSize:11}}>{p.mpesaRef||'—'}</td>
        <td style={{padding:'12px 16px',fontSize:12}}>{p.contribution?.period||'—'}</td>
        <td style={{padding:'12px 16px',fontSize:11,color:'#94a3b8',whiteSpace:'nowrap'}}>{new Date(p.createdAt).toLocaleDateString('en-KE')}</td>
        <td style={{padding:'12px 16px'}}><button onClick={()=>approve(p.id)} disabled={acting===p.id} style={{padding:'6px 14px',borderRadius:7,background:acting===p.id?'#94a3b8':'#16a34a',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>{acting===p.id?'...':'✓ Approve'}</button></td>
      </tr>)}</tbody></table>
      </div>
    </div>}
    <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
      <div style={{padding:'13px 20px',borderBottom:'1px solid #e2e8f0',fontWeight:600,fontSize:14,color:'#0f2040'}}>Payment history ({pays.length})</div>
      {pays.length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No payments recorded</div>:
      <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr style={{background:'#f8fafc'}}>{['Amount','Method','M-Pesa Ref','Status','Date'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
      <tbody>{pays.map((p:any)=><tr key={p.id} style={{borderTop:'1px solid #f1f5f9'}}>
        <td style={{padding:'12px 16px',fontWeight:600,whiteSpace:'nowrap'}}>KES {Number(p.amount).toLocaleString()}</td>
        <td style={{padding:'12px 16px'}}>{p.method}</td>
        <td style={{padding:'12px 16px',fontFamily:'monospace',fontSize:11}}>{p.mpesaRef||'—'}</td>
        <td style={{padding:'12px 16px'}}><Badge status={p.status}/></td>
        <td style={{padding:'12px 16px',fontSize:11,color:'#94a3b8',whiteSpace:'nowrap'}}>{new Date(p.createdAt).toLocaleDateString('en-KE')}</td>
      </tr>)}</tbody></table>
      </div>}
    </div>
  </div>
}

// ── CONTRIBUTIONS ─────────────────────────────────────────────────────────────
function ContributionsTab({data,loading,memberId,onRefresh}:any){
  const[ed,setEd]=useState<string|null>(null)
  const[ef,setEf]=useState<any>({})
  const[sv,setSv]=useState(false)
  const[show,setShow]=useState(false)
  const[ad,setAd]=useState(false)
  const[af,setAf]=useState({amount:'',type:'MONTHLY',period:'',dueDate:'',mpesaRef:''})
  useEffect(()=>{const n=new Date();const ms=['January','February','March','April','May','June','July','August','September','October','November','December'];setAf(p=>({...p,period:`${ms[n.getMonth()]} ${n.getFullYear()}`,dueDate:n.toISOString().split('T')[0]}))},[])
  useEffect(()=>{const onFocus=()=>onRefresh();const onVisible=()=>{if(document.visibilityState==='visible')onRefresh()};window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onVisible);return()=>{window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisible)}},[onRefresh])
  const iS2:any={padding:'7px 9px',borderRadius:6,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',boxSizing:'border-box'}
  const saveEdit=async(cid:string)=>{setSv(true);try{await api.patch(`/contributions/${cid}/edit`,ef);toast.success('Updated — member notified!');setEd(null);onRefresh()}catch(e:any){toast.error(e.response?.data?.message||'Failed')}finally{setSv(false)}}
  const addContrib=async(e:React.FormEvent)=>{e.preventDefault();if(!af.amount||!af.period||!af.dueDate){toast.error('Fill all required fields');return};setAd(true);try{const{data:contrib}=await api.post('/contributions',{userId:memberId,amount:parseFloat(af.amount),type:af.type,period:af.period,dueDate:af.dueDate});if(af.mpesaRef.trim()){await api.post('/payments',{userId:memberId,contributionId:contrib.contribution?.id,amount:parseFloat(af.amount),method:'MPESA',mpesaRef:af.mpesaRef.trim()}).catch(()=>toast('Contribution added but M-Pesa ref could not be linked',{icon:'⚠️'}))};toast.success('Contribution added!');setShow(false);setAf(p=>({...p,amount:'',mpesaRef:''}));onRefresh()}catch(e:any){toast.error(e.response?.data?.message||'Failed')}finally{setAd(false)}}
  if(loading)return<Skel cols={6} rows={6}/>
  const cs=data?.contributions||[]
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div style={{fontSize:13,color:'#64748b'}}>{data?.total||cs.length} records<span style={{marginLeft:8,fontSize:12,color:'#94a3b8'}}>· auto-refreshes on focus</span></div>
        <button onClick={()=>setShow(!show)} style={{padding:'9px 20px',borderRadius:9,background:'#1e3a6e',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>{show?'Cancel':'+ Add contribution'}</button>
      </div>
      {show&&(<div style={{background:'#fff',borderRadius:14,padding:22,border:'1px solid #e2e8f0'}}><div style={{fontWeight:600,fontSize:14,color:'#0f2040',marginBottom:16}}>Add contribution record</div><form onSubmit={addContrib} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Amount (KES) *</label><input type="number" value={af.amount} onChange={e=>setAf(p=>({...p,amount:e.target.value}))} placeholder="e.g. 500" style={{...iS2,width:'100%',padding:'10px 13px'}} onFocus={(e:any)=>e.target.style.borderColor='#1e3a6e'} onBlur={(e:any)=>e.target.style.borderColor='#e2e8f0'}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Type *</label><select value={af.type} onChange={e=>setAf(p=>({...p,type:e.target.value}))} style={{...iS2,width:'100%',padding:'10px 13px',background:'#fff'}}>{['MONTHLY','REGISTRATION','EMERGENCY'].map(t=><option key={t}>{t}</option>)}</select></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Period *</label><input value={af.period} onChange={e=>setAf(p=>({...p,period:e.target.value}))} placeholder="e.g. March 2026" style={{...iS2,width:'100%',padding:'10px 13px'}} onFocus={(e:any)=>e.target.style.borderColor='#1e3a6e'} onBlur={(e:any)=>e.target.style.borderColor='#e2e8f0'}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Due date *</label><input type="date" value={af.dueDate} onChange={e=>setAf(p=>({...p,dueDate:e.target.value}))} style={{...iS2,width:'100%',padding:'10px 13px'}} onFocus={(e:any)=>e.target.style.borderColor='#1e3a6e'} onBlur={(e:any)=>e.target.style.borderColor='#e2e8f0'}/></div><div style={{gridColumn:'1/-1'}}><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>M-Pesa Reference<span style={{marginLeft:6,fontSize:11,color:'#94a3b8',fontWeight:400}}>(optional)</span></label><input value={af.mpesaRef} onChange={e=>setAf(p=>({...p,mpesaRef:e.target.value}))} placeholder="e.g. SL7XXXXXXX" style={{...iS2,width:'100%',padding:'10px 13px',fontFamily:'monospace'}} onFocus={(e:any)=>e.target.style.borderColor='#1e3a6e'} onBlur={(e:any)=>e.target.style.borderColor='#e2e8f0'}/></div><div style={{gridColumn:'1/-1'}}><button type="submit" disabled={ad} style={{background:ad?'#94a3b8':'#1e3a6e',color:'#fff',padding:'10px 22px',borderRadius:9,fontSize:13,fontWeight:600,border:'none',cursor:ad?'not-allowed':'pointer'}}>{ad?'Adding...':'Add record'}</button></div></form></div>)}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>{cs.length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No contributions found</div>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr style={{background:'#f8fafc'}}>{['Period','Type','Amount','M-Pesa Ref','Status','Paid','Action'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>{cs.map((c:any)=>ed===c.id?<tr key={c.id} style={{borderTop:'1px solid #f1f5f9',background:'#f8fafc'}}><td style={{padding:'10px 14px'}}><input value={ef.period} onChange={e=>setEf((p:any)=>({...p,period:e.target.value}))} style={{...iS2,width:110}}/></td><td style={{padding:'10px 14px',fontSize:12,color:'#64748b'}}>{c.type}</td><td style={{padding:'10px 14px'}}><input type="number" value={ef.amount} onChange={e=>setEf((p:any)=>({...p,amount:e.target.value}))} style={{...iS2,width:90}}/></td><td style={{padding:'10px 14px',fontSize:12,color:'#94a3b8',fontFamily:'monospace'}}>{c.payments?.[0]?.mpesaRef||'—'}</td><td style={{padding:'10px 14px'}}><select value={ef.status} onChange={e=>setEf((p:any)=>({...p,status:e.target.value}))} style={{...iS2}}>{['PENDING','APPROVED','REJECTED'].map(s=><option key={s}>{s}</option>)}</select></td><td style={{padding:'10px 14px'}}><input type="checkbox" checked={ef.paid} onChange={e=>setEf((p:any)=>({...p,paid:e.target.checked}))}/></td><td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:6}}><button onClick={()=>saveEdit(c.id)} disabled={sv} style={{padding:'5px 11px',borderRadius:6,background:sv?'#94a3b8':'#1e3a6e',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:600}}>{sv?'...':'Save'}</button><button onClick={()=>setEd(null)} style={{padding:'5px 9px',borderRadius:6,background:'#f1f5f9',color:'#475569',border:'none',cursor:'pointer',fontSize:12}}>✕</button></div></td></tr>:<tr key={c.id} style={{borderTop:'1px solid #f1f5f9'}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#fafafa'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}><td style={{padding:'12px 16px',fontWeight:500,color:'#0f2040',whiteSpace:'nowrap'}}>{c.period}</td><td style={{padding:'12px 16px'}}><span style={{fontSize:11,background:'#eef2ff',color:'#1e3a6e',padding:'2px 8px',borderRadius:99,fontWeight:600,whiteSpace:'nowrap'}}>{c.type}</span></td><td style={{padding:'12px 16px',fontWeight:600,color:'#0f2040',whiteSpace:'nowrap'}}>KES {Number(c.amount).toLocaleString()}</td><td style={{padding:'12px 16px',fontFamily:'monospace',fontSize:12,color:'#475569'}}>{c.payments?.[0]?.mpesaRef||'—'}</td><td style={{padding:'12px 16px'}}><span style={{display:'inline-flex',padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:600,background:c.status==='APPROVED'?'#dcfce7':c.status==='REJECTED'?'#fee2e2':'#fef3c7',color:c.status==='APPROVED'?'#15803d':c.status==='REJECTED'?'#b91c1c':'#b45309',whiteSpace:'nowrap'}}>{c.status.toLowerCase()}</span></td><td style={{padding:'12px 16px',fontSize:13,color:c.paid?'#15803d':'#dc2626'}}>{c.paid?'✓ Yes':'✗ No'}</td><td style={{padding:'12px 16px'}}><button onClick={()=>{setEd(c.id);setEf({amount:c.amount,period:c.period,status:c.status,paid:c.paid})}} style={{padding:'5px 11px',borderRadius:6,background:'#f1f5f9',color:'#1e3a6e',border:'1px solid #e2e8f0',cursor:'pointer',fontSize:12,fontWeight:500}}>Edit</button></td></tr>)}</tbody></table></div>}</div>
    </div>
  )
}

// ── LOANS ─────────────────────────────────────────────────────────────────────
function LoansTab({data,loading,loanLimit:ll,memberId,onRefresh}:any){
  const[show,setShow]=useState(false)
  const[f,setF]=useState({eligible:false,limitOverride:''})
  const[sv,setSv]=useState(false)
  useEffect(()=>{if(ll)setF({eligible:ll.loanEligible,limitOverride:ll.manualOverride||''})},[ll])
  const save=async()=>{setSv(true);try{await api.patch(`/loans/eligibility/${memberId}`,{eligible:f.eligible,limitOverride:f.limitOverride||null});toast.success('Updated!');setShow(false);onRefresh()}catch(e:any){toast.error(e.response?.data?.message||'Failed')}finally{setSv(false)}}
  if(loading)return<Skel cols={6} rows={4}/>
  const loans=data?.loans||[]
  return<div style={{display:'flex',flexDirection:'column',gap:20}}>
    {ll&&<div style={{background:'#fff',borderRadius:14,padding:22,border:'1px solid #e2e8f0'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><div style={{fontWeight:600,fontSize:14,color:'#0f2040'}}>Loan eligibility</div><button onClick={()=>setShow(!show)} style={{padding:'7px 15px',borderRadius:8,background:'#1e3a6e',color:'#fff',border:'none',cursor:'pointer',fontSize:13}}>{show?'Cancel':'Manage'}</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:show?16:0}}>{[{l:'Status',v:ll.loanEligible?'Eligible':'Not eligible',c:ll.loanEligible?'#15803d':'#94a3b8'},{l:'Auto limit',v:`KES ${Number(ll.autoLimit||0).toLocaleString()}`},{l:'Effective limit',v:`KES ${Number(ll.effectiveLimit||0).toLocaleString()}`,c:'#1e3a6e'}].map(s=><div key={s.l} style={{background:'#f8fafc',borderRadius:9,padding:'12px 14px'}}><div style={{fontSize:11,color:'#94a3b8',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.l}</div><div style={{fontSize:15,fontWeight:700,color:s.c||'#0f2040'}}>{s.v}</div></div>)}</div><div style={{fontSize:12,color:'#94a3b8'}}>{ll.autoReason}</div>{show&&<div style={{marginTop:16,background:'#f8fafc',borderRadius:10,padding:18,border:'1px solid #e2e8f0'}}><label style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,cursor:'pointer'}}><input type="checkbox" checked={f.eligible} onChange={e=>setF(p=>({...p,eligible:e.target.checked}))} style={{width:15,height:15}}/><span style={{fontSize:13,fontWeight:500,color:'#0f2040'}}>Member is eligible for loans</span></label><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Manual limit override (KES)</label><input type="number" value={f.limitOverride} onChange={e=>setF(p=>({...p,limitOverride:e.target.value}))} placeholder={`Auto: KES ${Number(ll.autoLimit||0).toLocaleString()}`} style={{...iS,marginBottom:12}} onFocus={iF} onBlur={iB}/><button onClick={save} disabled={sv} style={{background:sv?'#94a3b8':'#1e3a6e',color:'#fff',padding:'9px 22px',borderRadius:9,fontSize:13,fontWeight:600,border:'none',cursor:sv?'not-allowed':'pointer'}}>{sv?'Saving...':'Save'}</button></div>}</div>}
    <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}><div style={{padding:'13px 20px',borderBottom:'1px solid #e2e8f0',fontWeight:600,fontSize:14,color:'#0f2040'}}>Loan history ({loans.length})</div>{loans.length===0?<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:13}}>No loans found</div>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr style={{background:'#f8fafc'}}>{['Principal','Rate','Total due','Months','Repaid','Status','Date'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 16px',fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead><tbody>{loans.map((l:any)=>{const d=l.principal+l.principal*l.interestRate;const r=(l.repayments||[]).reduce((s:number,x:any)=>s+x.amount,0);return<tr key={l.id} style={{borderTop:'1px solid #f1f5f9'}}><td style={{padding:'12px 16px',fontWeight:600,whiteSpace:'nowrap'}}>KES {Number(l.principal).toLocaleString()}</td><td style={{padding:'12px 16px'}}>{(l.interestRate*100).toFixed(0)}%</td><td style={{padding:'12px 16px',whiteSpace:'nowrap'}}>KES {d.toLocaleString()}</td><td style={{padding:'12px 16px'}}>{l.repaymentSchedule?.length||0}</td><td style={{padding:'12px 16px',color:r>=d?'#15803d':'#0f2040',fontWeight:500,whiteSpace:'nowrap'}}>KES {r.toLocaleString()}</td><td style={{padding:'12px 16px'}}><Badge status={l.status}/></td><td style={{padding:'12px 16px',fontSize:11,color:'#94a3b8',whiteSpace:'nowrap'}}>{new Date(l.createdAt).toLocaleDateString('en-KE')}</td></tr>})}</tbody></table></div>}</div>
  </div>
}

// ── DEPENDENTS TAB ────────────────────────────────────────────────────────────
const DEP_TYPE_CFG: Record<string,{label:string;icon:string;bg:string;color:string}> = {
  CHILD_UNDER_18: {label:'Child (under 18)', icon:'👶', bg:'#e0f2fe', color:'#0369a1'},
  CHILD_18_25:    {label:'Child (18–25)',     icon:'🧑', bg:'#eef2ff', color:'#1e3a6e'},
  PARENT:         {label:'Parent',            icon:'👴', bg:'#f0fdf4', color:'#15803d'},
  SIBLING:        {label:'Sibling',           icon:'👫', bg:'#fef3c7', color:'#b45309'},
  NEXT_OF_KIN:    {label:'Next of kin',       icon:'⭐', bg:'#fdf4ff', color:'#7c3aed'},
}
const DT=[{v:'CHILD_UNDER_18',l:'Child (under 18)',b:true,n:false,p:false},{v:'CHILD_18_25',l:'Child (18–25)',b:false,n:true,p:false},{v:'PARENT',l:'Parent',b:false,n:true,p:false},{v:'SIBLING',l:'Sibling',b:false,n:true,p:false},{v:'NEXT_OF_KIN',l:'Next of kin',b:false,n:true,p:true}]

function DependentsTab({data,loading,memberId,onRefresh,adminRole}:any){
  const[show,setShow]=useState(false);const[sv,setSv]=useState(false);const[editDep,setEditDep]=useState<any>(null);const[editForm,setEditForm]=useState<any>({});const[saving,setSaving]=useState(false);const[acting,setActing]=useState<string|null>(null);const[rejectId,setRejectId]=useState<string|null>(null);const[rejectNote,setRejectNote]=useState('')
  const[f,setF]=useState({fullName:'',type:'NEXT_OF_KIN',dateOfBirth:'',nationalId:'',birthCertNumber:'',phone:'',relationship:''})
  const sel=DT.find(t=>t.v===f.type)!
  const sub=async(e:React.FormEvent)=>{e.preventDefault();setSv(true);try{await api.post(`/dependents/member/${memberId}`,f);toast.success('Added — member notified!');setShow(false);setF({fullName:'',type:'NEXT_OF_KIN',dateOfBirth:'',nationalId:'',birthCertNumber:'',phone:'',relationship:''});onRefresh()}catch(e:any){toast.error(e.response?.data?.message||'Failed')}finally{setSv(false)}}
  const rem=async(did:string)=>{if(!confirm('Remove this dependent?'))return;try{await api.delete(`/dependents/${did}`);toast.success('Removed');onRefresh()}catch{toast.error('Failed')}}
  const startEdit=(d:any)=>{setEditDep(d.id);setEditForm({fullName:d.fullName||'',dateOfBirth:d.dateOfBirth?d.dateOfBirth.split('T')[0]:'',nationalId:d.nationalId||'',birthCertNumber:d.birthCertNumber||'',phone:d.phone||'',relationship:d.relationship||''})}
  const saveEdit=async(did:string)=>{setSaving(true);try{await api.put(`/dependents/${did}`,editForm);toast.success('Dependent updated!');setEditDep(null);onRefresh()}catch(e:any){toast.error(e.response?.data?.message||'Failed')}finally{setSaving(false)}}
  const approveRequest=async(reqId:string)=>{setActing(reqId);try{await api.patch(`/beneficiary-requests/${reqId}/approve`);toast.success('Request approved and change applied! Member notified.');onRefresh()}catch(e:any){toast.error(e.response?.data?.message||'Failed')}finally{setActing(null)}}
  const rejectRequest=async(reqId:string)=>{if(!rejectNote.trim()){toast.error('Please provide a rejection reason');return};setActing(reqId);try{await api.patch(`/beneficiary-requests/${reqId}/reject`,{reason:rejectNote});toast.success('Request rejected. Member notified.');setRejectId(null);setRejectNote('');onRefresh()}catch(e:any){toast.error(e.response?.data?.message||'Failed')}finally{setActing(null)}}
  if(loading)return<div style={{display:'flex',flexDirection:'column',gap:10}}>{Array(3).fill(0).map((_,i)=><div key={i} style={{height:70,background:'#f1f5f9',borderRadius:12,animation:'pulse 1.5s ease infinite'}}/>)}</div>
  const deps=data?.dependents||[];const benReqs=data?.beneficiaryRequests||[];const pending=benReqs.filter((r:any)=>r.status==='PENDING')
  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {benReqs.length>0&&<div style={{background:'#fff',borderRadius:14,border:`1.5px solid ${pending.length>0?'#fde68a':'#e2e8f0'}`,overflow:'hidden'}}><div style={{padding:'13px 20px',borderBottom:'1px solid #e2e8f0',background:pending.length>0?'#fef3c7':'#f8fafc',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}><div style={{fontWeight:600,fontSize:14,color:pending.length>0?'#b45309':'#0f2040'}}>📨 Beneficiary change requests{pending.length>0&&<span style={{marginLeft:8,fontSize:11,background:'#b45309',color:'#fff',padding:'2px 8px',borderRadius:99,fontWeight:700}}>{pending.length} pending</span>}</div><span style={{fontSize:12,color:'#94a3b8'}}>{benReqs.length} total</span></div>{benReqs.map((req:any,i:number)=>{const isPending=req.status==='PENDING';const typeColor=req.type==='ADD'?'#15803d':req.type==='REMOVE'?'#b91c1c':'#0369a1';const typeBg=req.type==='ADD'?'#dcfce7':req.type==='REMOVE'?'#fee2e2':'#e0f2fe';const depCfg=req.dependentType?DEP_TYPE_CFG[req.dependentType]:null;const isActing=acting===req.id;const isRejecting=rejectId===req.id;return(<div key={req.id} style={{padding:'16px 20px',borderBottom:i<benReqs.length-1?'1px solid #f1f5f9':'none',background:isPending?'#fffbeb':'#fff',opacity:isPending?1:0.8}}><div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,flexWrap:'wrap'}}><span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:99,background:typeBg,color:typeColor}}>{req.type==='ADD'?'➕ Add':req.type==='UPDATE'?'✏️ Update':'🗑 Remove'}</span>{depCfg&&<span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:99,background:depCfg.bg,color:depCfg.color}}>{depCfg.icon} {depCfg.label}</span>}{isPending?<span style={{fontSize:11,fontWeight:600,background:'#fef3c7',color:'#b45309',padding:'2px 8px',borderRadius:99}}>⏳ Pending</span>:req.status==='APPROVED'?<span style={{fontSize:11,fontWeight:600,background:'#dcfce7',color:'#15803d',padding:'2px 8px',borderRadius:99}}>✓ Approved</span>:<span style={{fontSize:11,fontWeight:600,background:'#fee2e2',color:'#b91c1c',padding:'2px 8px',borderRadius:99}}>✕ Rejected</span>}<span style={{fontSize:11,color:'#94a3b8',marginLeft:'auto'}}>{new Date(req.createdAt).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</span></div><div style={{background:'#f8fafc',borderRadius:9,padding:'12px 14px',border:'1px solid #e2e8f0',marginBottom:isPending?12:0}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'6px 20px',fontSize:12,color:'#374151'}}>{req.fullName&&<div><span style={{color:'#94a3b8'}}>Name: </span><strong>{req.fullName}</strong></div>}{req.dateOfBirth&&<div><span style={{color:'#94a3b8'}}>DOB: </span>{req.dateOfBirth.split('T')[0]}</div>}{req.nationalId&&<div><span style={{color:'#94a3b8'}}>ID: </span>{req.nationalId}</div>}{req.phone&&<div><span style={{color:'#94a3b8'}}>Phone: </span>{req.phone}</div>}{req.birthCertNumber&&<div><span style={{color:'#94a3b8'}}>BC: </span>{req.birthCertNumber}</div>}{req.relationship&&<div><span style={{color:'#94a3b8'}}>Relationship: </span>{req.relationship}</div>}{req.notes&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#94a3b8'}}>Notes: </span>{req.notes}</div>}</div></div>{!isPending&&req.processedBy&&<div style={{fontSize:11,color:'#94a3b8',marginTop:8}}>{req.status==='APPROVED'?'✓ Approved':'✕ Rejected'} by {req.processedBy.fullName} · {new Date(req.processedAt).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}{req.rejectionReason&&<span style={{color:'#b91c1c'}}> · Reason: {req.rejectionReason}</span>}</div>}{isPending&&!isRejecting&&<div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}><button onClick={()=>approveRequest(req.id)} disabled={isActing} style={{padding:'8px 20px',borderRadius:8,background:isActing?'#94a3b8':'#16a34a',color:'#fff',border:'none',cursor:isActing?'not-allowed':'pointer',fontSize:13,fontWeight:600}}>{isActing?'Approving...':'✓ Approve & apply'}</button><button onClick={()=>setRejectId(req.id)} disabled={isActing} style={{padding:'8px 14px',borderRadius:8,background:'transparent',color:'#dc2626',border:'1.5px solid #fecaca',cursor:'pointer',fontSize:13,fontWeight:600}}>✕ Reject</button></div>}{isPending&&isRejecting&&<div style={{marginTop:12,background:'#fef2f2',borderRadius:9,padding:'14px 16px',border:'1px solid #fecaca'}}><div style={{fontSize:13,fontWeight:500,color:'#b91c1c',marginBottom:8}}>Rejection reason (sent to member)</div><textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)} rows={3} placeholder="e.g. Insufficient information provided..." style={{...iS,marginBottom:10,borderColor:'#fecaca'}} autoFocus onFocus={(e:any)=>e.target.style.borderColor='#dc2626'} onBlur={(e:any)=>e.target.style.borderColor='#fecaca'}/><div style={{display:'flex',gap:8}}><button onClick={()=>rejectRequest(req.id)} disabled={isActing||!rejectNote.trim()} style={{padding:'8px 18px',borderRadius:8,background:(!rejectNote.trim()||isActing)?'#94a3b8':'#dc2626',color:'#fff',border:'none',cursor:(!rejectNote.trim()||isActing)?'not-allowed':'pointer',fontSize:13,fontWeight:600}}>{isActing?'Rejecting...':'Confirm rejection'}</button><button onClick={()=>{setRejectId(null);setRejectNote('')}} style={{padding:'8px 14px',borderRadius:8,background:'#f1f5f9',color:'#475569',border:'none',cursor:'pointer',fontSize:13}}>Cancel</button></div></div>}</div>)})}</div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}><div style={{fontSize:13,color:'#64748b'}}>{deps.length} dependent(s)<span style={{marginLeft:8,fontSize:12,color:'#94a3b8'}}>· Adding Child/Parent/Sibling auto-upgrades member to FAMILY rate</span></div><button onClick={()=>setShow(!show)} style={{padding:'9px 20px',borderRadius:9,background:'#1e3a6e',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>{show?'Cancel':'+ Add dependent'}</button></div>
      {show&&<div style={{background:'#fff',borderRadius:14,padding:22,border:'1px solid #e2e8f0'}}><div style={{fontWeight:600,fontSize:14,color:'#0f2040',marginBottom:16}}>Add dependent directly</div><form onSubmit={sub} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Full name *</label><input value={f.fullName} onChange={e=>setF(p=>({...p,fullName:e.target.value}))} placeholder="Full legal name" style={iS} onFocus={iF} onBlur={iB}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Relationship type *</label><select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} style={{...iS,background:'#fff'}}>{DT.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Date of birth</label><input type="date" value={f.dateOfBirth} onChange={e=>setF(p=>({...p,dateOfBirth:e.target.value}))} style={iS} onFocus={iF} onBlur={iB}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Relationship description</label><input value={f.relationship} onChange={e=>setF(p=>({...p,relationship:e.target.value}))} placeholder="e.g. Eldest son" style={iS} onFocus={iF} onBlur={iB}/></div>{sel.b&&<div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Birth cert no. *</label><input value={f.birthCertNumber} onChange={e=>setF(p=>({...p,birthCertNumber:e.target.value}))} placeholder="Birth cert number" style={iS} onFocus={iF} onBlur={iB}/></div>}{sel.n&&<div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>National ID *</label><input value={f.nationalId} onChange={e=>setF(p=>({...p,nationalId:e.target.value}))} placeholder="National ID" style={iS} onFocus={iF} onBlur={iB}/></div>}{sel.p&&<div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Phone *</label><input type="tel" value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} placeholder="07XXXXXXXX" style={iS} onFocus={iF} onBlur={iB}/></div>}<div style={{gridColumn:'1/-1'}}><button type="submit" disabled={sv} style={{background:sv?'#94a3b8':'#1e3a6e',color:'#fff',padding:'10px 22px',borderRadius:9,fontSize:13,fontWeight:600,border:'none',cursor:sv?'not-allowed':'pointer'}}>{sv?'Adding...':'Add dependent'}</button></div></form></div>}
      {deps.length===0&&!show?<div style={{background:'#fff',borderRadius:14,padding:40,border:'1px solid #e2e8f0',textAlign:'center',color:'#94a3b8',fontSize:13}}>No dependents registered</div>:deps.map((d:any)=>{const dc=DEP_TYPE_CFG[d.type]||DEP_TYPE_CFG.NEXT_OF_KIN;return(<div key={d.id} style={{background:'#fff',borderRadius:12,border:`1.5px solid ${dc.color}30`,overflow:'hidden'}}><div style={{padding:'15px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}><div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:40,height:40,borderRadius:'50%',background:dc.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{dc.icon}</div><div><div style={{fontWeight:600,fontSize:14,color:'#0f2040'}}>{d.fullName}</div><div style={{fontSize:12,color:dc.color,fontWeight:500,marginTop:1}}>{dc.label}{d.relationship&&` · ${d.relationship}`}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>{d.nationalId&&`ID: ${d.nationalId}`}{d.birthCertNumber&&` BC: ${d.birthCertNumber}`}{d.phone&&` · ${d.phone}`}{d.dateOfBirth&&` · DOB: ${d.dateOfBirth.split('T')[0]}`}</div><div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>Added {new Date(d.createdAt).toLocaleDateString('en-KE')}{d.notified&&<span style={{marginLeft:8,color:'#15803d'}}>· Notified ✓</span>}</div></div></div><div style={{display:'flex',gap:8,flexShrink:0}}><button onClick={()=>editDep===d.id?setEditDep(null):startEdit(d)} style={{padding:'6px 14px',borderRadius:7,background:'#eef2ff',color:'#1e3a6e',border:'1px solid #c7d2fe',cursor:'pointer',fontSize:12,fontWeight:500}}>{editDep===d.id?'Cancel':'✏️ Edit'}</button><button onClick={()=>rem(d.id)} style={{padding:'6px 12px',borderRadius:7,background:'none',color:'#dc2626',border:'1px solid #fecaca',cursor:'pointer',fontSize:12}}>Remove</button></div></div>{editDep===d.id&&<div style={{padding:'16px 18px',borderTop:'1px solid #f1f5f9',background:'#f8fafc'}}><div style={{fontWeight:600,fontSize:13,color:'#0f2040',marginBottom:12}}>Edit dependent details</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Full name</label><input value={editForm.fullName} onChange={e=>setEditForm((p:any)=>({...p,fullName:e.target.value}))} style={iS} onFocus={iF} onBlur={iB}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Date of birth</label><input type="date" value={editForm.dateOfBirth} onChange={e=>setEditForm((p:any)=>({...p,dateOfBirth:e.target.value}))} style={iS} onFocus={iF} onBlur={iB}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>National ID</label><input value={editForm.nationalId} onChange={e=>setEditForm((p:any)=>({...p,nationalId:e.target.value}))} style={iS} onFocus={iF} onBlur={iB}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Phone</label><input value={editForm.phone} onChange={e=>setEditForm((p:any)=>({...p,phone:e.target.value}))} style={iS} onFocus={iF} onBlur={iB}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Birth cert no.</label><input value={editForm.birthCertNumber} onChange={e=>setEditForm((p:any)=>({...p,birthCertNumber:e.target.value}))} style={iS} onFocus={iF} onBlur={iB}/></div><div><label style={{display:'block',fontSize:12,fontWeight:500,color:'#374151',marginBottom:5}}>Relationship</label><input value={editForm.relationship} onChange={e=>setEditForm((p:any)=>({...p,relationship:e.target.value}))} style={iS} onFocus={iF} onBlur={iB}/></div><div style={{gridColumn:'1/-1',display:'flex',gap:8}}><button onClick={()=>saveEdit(d.id)} disabled={saving} style={{background:saving?'#94a3b8':'#1e3a6e',color:'#fff',padding:'9px 22px',borderRadius:9,fontSize:13,fontWeight:600,border:'none',cursor:saving?'not-allowed':'pointer'}}>{saving?'Saving...':'Save changes'}</button><button onClick={()=>setEditDep(null)} style={{background:'#f1f5f9',color:'#475569',padding:'9px 16px',borderRadius:9,fontSize:13,border:'none',cursor:'pointer'}}>Cancel</button></div></div></div>}</div>)})}
    </div>
  )
}

// ── DECEASED ──────────────────────────────────────────────────────────────────
function DeceasedTab({memberId,member,onRefreshMember}:{memberId:string;member:any;onRefreshMember:()=>void}){
  const[dependents,setDependents]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[selected,setSelected]=useState<{id:string|null;type:'member'|'dependent';name:string}|null>(null);const[decDate,setDecDate]=useState('');const[certNumber,setCertNumber]=useState('');const[notes,setNotes]=useState('')
  useEffect(()=>{api.get(`/dependents/member/${memberId}`).then(({data})=>setDependents(data.dependents||[])).catch(()=>{}).finally(()=>setLoading(false))},[memberId])
  const DEP_LABELS:Record<string,string>={CHILD_UNDER_18:'Child (under 18)',CHILD_18_25:'Child (18–25)',PARENT:'Parent',SIBLING:'Sibling',NEXT_OF_KIN:'Next of kin'}
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(!selected){toast.error('Select who passed away');return};if(!decDate){toast.error('Date of death is required');return};if(!certNumber){toast.error('Death certificate number is required');return};setSaving(true);try{const payload={...(selected.type==='member'?{memberId}:{memberId,dependentId:selected.id}),deceasedAt:decDate,notes:`Death certificate: ${certNumber}${notes?`. ${notes}`:''}`};await api.post('/reports/deceased',payload);if(selected.type==='member')toast.success(`${selected.name} flagged as deceased. Consider filing a DEATH claim.`,{duration:6000});else toast.success(`${selected.name} flagged as deceased.`);setSelected(null);setDecDate('');setCertNumber('');setNotes('');onRefreshMember()}catch(e:any){toast.error(e.response?.data?.message||'Failed to save')}finally{setSaving(false)}}
  const unflag=async()=>{if(!confirm('Remove the deceased flag for this member? This will reactivate their account.'))return;try{await api.post('/reports/unflag-deceased',{memberId});toast.success('Deceased flag removed — account reactivated');onRefreshMember()}catch{toast.error('Failed to remove flag')}}
  const iS2:any={width:'100%',padding:'10px 13px',borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none',boxSizing:'border-box'}
  if(member.isDeceased)return(<div style={{display:'flex',flexDirection:'column',gap:16}}><div style={{background:'#f1f5f9',borderRadius:14,padding:'22px 24px',border:'1px solid #e2e8f0',display:'flex',gap:16,alignItems:'flex-start'}}><div style={{fontSize:32}}>⚫</div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:16,color:'#374151',marginBottom:6}}>{member.fullName} — Deceased</div><div style={{display:'flex',flexDirection:'column',gap:4,fontSize:13,color:'#64748b'}}>{member.deceasedAt&&<div>📅 Date of death: <strong>{new Date(member.deceasedAt).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}</strong></div>}{member.deceasedNotes&&<div>📋 Notes: <strong>{member.deceasedNotes}</strong></div>}<div style={{marginTop:4,color:'#94a3b8',fontSize:12}}>Account deactivated · flagged by administrator</div></div></div></div>{dependents.length>0&&<div style={{background:'#fff',borderRadius:14,padding:'20px 24px',border:'1px solid #e2e8f0'}}><div style={{fontWeight:600,fontSize:14,color:'#0f2040',marginBottom:14}}>Dependents</div>{dependents.map((d:any)=><div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f1f5f9',gap:10}}><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{fontSize:16}}>{d.isDeceased?'⚫':'👤'}</div><div><div style={{fontWeight:500,fontSize:13,color:d.isDeceased?'#94a3b8':'#0f2040'}}>{d.fullName}</div><div style={{fontSize:11,color:'#94a3b8'}}>{DEP_LABELS[d.type]||d.type}</div></div></div><span style={{fontSize:11,fontWeight:600,padding:'2px 10px',borderRadius:99,background:d.isDeceased?'#f1f5f9':'#dcfce7',color:d.isDeceased?'#64748b':'#15803d',flexShrink:0}}>{d.isDeceased?'Deceased':'Living'}</span></div>)}</div>}<div style={{background:'#fef3c7',borderRadius:12,padding:'14px 18px',border:'1px solid #fde68a'}}><div style={{fontSize:13,color:'#92400e',marginBottom:10}}>⚠️ If flagged in error, a Super Admin can remove the deceased flag and reactivate the account.</div><button onClick={unflag} style={{padding:'8px 18px',borderRadius:8,background:'#92400e',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:600}}>Remove Deceased Flag</button></div></div>)
  return(<div style={{display:'flex',flexDirection:'column',gap:20}}><div style={{background:'#f8fafc',borderRadius:14,padding:'16px 20px',border:'1px solid #e2e8f0',display:'flex',gap:12,alignItems:'flex-start'}}><div style={{fontSize:20}}>⚫</div><div style={{fontSize:13,color:'#64748b',lineHeight:1.6}}>Use this section to record the passing of <strong>{member.fullName}</strong> or one of their dependents. Flagging a member as deceased will immediately deactivate their account.</div></div><form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:20}}><div style={{background:'#fff',borderRadius:14,padding:'22px 24px',border:'1px solid #e2e8f0'}}><div style={{fontWeight:600,fontSize:14,color:'#0f2040',marginBottom:16}}>Who passed away?</div><label style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:10,border:`1.5px solid ${selected?.type==='member'?'#1e3a6e':'#e2e8f0'}`,background:selected?.type==='member'?'#eef2ff':'#f8fafc',cursor:'pointer',marginBottom:10,transition:'all 0.15s'}}><input type="radio" name="deceased_person" checked={selected?.type==='member'&&selected?.id===null} onChange={()=>setSelected({id:null,type:'member',name:member.fullName})} style={{accentColor:'#1e3a6e',width:16,height:16,flexShrink:0}}/><div style={{width:36,height:36,borderRadius:'50%',background:'#eef2ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#1e3a6e',flexShrink:0}}>{member.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}</div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:14,color:'#0f2040'}}>{member.fullName}</div><div style={{fontSize:12,color:'#94a3b8'}}>Member · {member.memberNumber}</div></div><span style={{fontSize:11,background:'#dcfce7',color:'#15803d',padding:'2px 8px',borderRadius:99,fontWeight:600,flexShrink:0}}>Account holder</span></label>{loading?<div style={{height:60,background:'#f1f5f9',borderRadius:10,animation:'pulse 1.5s ease infinite'}}/>:dependents.length===0?<div style={{fontSize:13,color:'#94a3b8',padding:'12px 16px',background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0'}}>No dependents registered.</div>:dependents.map((d:any)=><label key={d.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:10,border:`1.5px solid ${selected?.id===d.id?'#1e3a6e':'#e2e8f0'}`,background:selected?.id===d.id?'#eef2ff':d.isDeceased?'#f8fafc':'#fff',cursor:d.isDeceased?'not-allowed':'pointer',marginBottom:8,opacity:d.isDeceased?0.55:1}}><input type="radio" name="deceased_person" disabled={d.isDeceased} checked={selected?.id===d.id} onChange={()=>setSelected({id:d.id,type:'dependent',name:d.fullName})} style={{accentColor:'#1e3a6e',width:16,height:16,flexShrink:0}}/><div style={{width:36,height:36,borderRadius:'50%',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#64748b',flexShrink:0}}>{d.fullName?.charAt(0).toUpperCase()}</div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,color:d.isDeceased?'#94a3b8':'#0f2040'}}>{d.fullName}</div><div style={{fontSize:12,color:'#94a3b8'}}>{DEP_LABELS[d.type]||d.type}{d.relationship&&` · ${d.relationship}`}</div></div>{d.isDeceased&&<span style={{fontSize:11,background:'#f1f5f9',color:'#64748b',padding:'2px 8px',borderRadius:99,fontWeight:600,flexShrink:0}}>⚫ Already flagged</span>}</label>)}</div>{selected&&(<div style={{background:'#fff',borderRadius:14,padding:'22px 24px',border:'1px solid #e2e8f0'}}><div style={{fontWeight:600,fontSize:14,color:'#0f2040',marginBottom:16}}>Death details — <span style={{color:'#1e3a6e'}}>{selected.name}</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:14}}><div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Date of death *</label><input type="date" value={decDate} onChange={e=>setDecDate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={iS2} onFocus={iF} onBlur={iB}/></div><div><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Death certificate number *</label><input value={certNumber} onChange={e=>setCertNumber(e.target.value)} placeholder="e.g. DC/2026/001234" style={iS2} onFocus={iF} onBlur={iB}/></div></div><div style={{marginBottom:14}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Additional notes (optional)</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Cause of death, circumstances..." style={{...iS2,resize:'vertical' as any}} onFocus={iF} onBlur={iB}/></div>{selected.type==='member'&&<div style={{background:'#fef3c7',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#92400e',lineHeight:1.6}}>⚠️ Flagging <strong>{selected.name}</strong> as deceased will immediately deactivate their account. A DEATH claim can be filed by their next of kin after this is saved.</div>}<button type="submit" disabled={saving} style={{background:saving?'#94a3b8':'#0f2040',color:'#fff',padding:'11px 26px',borderRadius:9,fontSize:14,fontWeight:700,border:'none',cursor:saving?'not-allowed':'pointer'}}>{saving?'Saving...':'⚫ Save — Flag as Deceased'}</button></div>)}</form><style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style></div>)
}
