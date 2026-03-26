'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../lib/auth'

const ADMIN_ROLES = ['SUPER_ADMIN', 'TREASURER', 'SECRETARY']

const NAV_ITEMS = [
  { href:'/admin',               icon:'▦',  label:'Overview',          roles:['SUPER_ADMIN','TREASURER','SECRETARY'], exact:true },
  { href:'/admin/members',       icon:'👥', label:'Members',           roles:['SUPER_ADMIN','TREASURER','SECRETARY']              },
  { href:'/admin/payments',      icon:'💳', label:'Payment Approvals', roles:['SUPER_ADMIN'],                        badge:true  },
  { href:'/admin/contributions', icon:'📋', label:'Contributions',     roles:['SUPER_ADMIN','TREASURER']                        },
  { href:'/admin/loans',         icon:'🏦', label:'Loans',             roles:['SUPER_ADMIN','TREASURER']                        },
  { href:'/admin/claims',        icon:'🏥', label:'Claims',            roles:['SUPER_ADMIN','TREASURER']                        },
  { href:'/admin/groups',        icon:'🏘️', label:'Groups',            roles:['SUPER_ADMIN','SECRETARY']                        },
  { href:'/admin/announcements', icon:'📢', label:'Announcements',     roles:['SUPER_ADMIN','SECRETARY']                        },
  { href:'/admin/reports',       icon:'📊', label:'Reports',           roles:['SUPER_ADMIN','SECRETARY']                        },
  { href:'/admin/notifications', icon:'🔔', label:'Notifications',     roles:['SUPER_ADMIN','TREASURER','SECRETARY']             },
  { href: '/admin/audit-logs', icon: '📋', label: 'Audit Logs', roles: ['SUPER_ADMIN', 'TREASURER', 'SECRETARY'] },
]

const ROLE_CONFIG: Record<string,{label:string;color:string;bg:string}> = {
  SUPER_ADMIN: { label:'Super Admin', color:'#f5c842', bg:'rgba(230,176,32,0.15)'  },
  TREASURER:   { label:'Treasurer',   color:'#6ee7b7', bg:'rgba(16,185,129,0.15)' },
  SECRETARY:   { label:'Secretary',   color:'#a5b4fc', bg:'rgba(99,102,241,0.15)' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return }
    if (!loading && user && !ADMIN_ROLES.includes(user.role)) router.push('/dashboard')
  }, [user, loading])

  if (loading || !user) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ width:36, height:36, border:'3px solid #e2e8f0', borderTopColor:'#1e3a6e', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(user.role))
  const rc         = ROLE_CONFIG[user.role] || ROLE_CONFIG.SUPER_ADMIN
  const initials   = user.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f1f5f9' }}>

      <aside style={{ width:248, background:'#0f2040', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:50 }}>

        {/* Logo + role badge */}
        <div style={{ padding:'22px 20px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:38, height:38, borderRadius:9, background:'rgba(230,176,32,0.15)', border:'1.5px solid rgba(230,176,32,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#f5c842' }}>CS</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.1 }}>Crater SDA</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Welfare Society</div>
            </div>
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:99, background:rc.bg, border:`1px solid ${rc.color}40` }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:rc.color }}/>
            <span style={{ fontSize:11, fontWeight:600, color:rc.color, letterSpacing:'0.06em' }}>{rc.label}</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto' }}>
          <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.2)', letterSpacing:'0.12em', textTransform:'uppercase', padding:'6px 8px 8px' }}>Navigation</div>
          {visibleNav.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9,
                textDecoration:'none', transition:'all 0.15s',
                background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderLeft: active ? `3px solid ${rc.color}` : '3px solid transparent',
                color:      active ? '#fff' : '#64748b',
                fontSize:13, fontWeight: active ? 500 : 400,
              }}>
                <span style={{ fontSize:14, flexShrink:0 }}>{item.icon}</span>
                <span style={{ flex:1 }}>{item.label}</span>
                {item.badge && <div style={{ width:8, height:8, borderRadius:'50%', background:'#e6b020' }}/>}
              </Link>
            )
          })}
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', margin:'8px 0 4px' }}/>
          <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, textDecoration:'none', color:'#475569', fontSize:13 }}>
            <span>↗</span><span>Member View</span>
          </Link>
        </nav>

        {/* User footer */}
        <div style={{ padding:'14px 10px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', marginBottom:4 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1e3a6e,#2d5299)', border:`2px solid ${rc.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:rc.color, flexShrink:0 }}>{initials}</div>
            <div style={{ overflow:'hidden', flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#e2e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.fullName}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={signOut} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:8, background:'none', border:'none', cursor:'pointer', color:'#475569', fontSize:13 }}>
            <span>⬡</span> Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex:1, marginLeft:248, minHeight:'100vh' }}>{children}</main>
    </div>
  )
}
