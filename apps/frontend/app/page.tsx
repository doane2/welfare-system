'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const NAV_LINKS = [
  { label: 'About',        href: '#about'    },
  { label: 'Services',     href: '#services' },
  { label: 'How it works', href: '#how'      },
  { label: 'Contact',      href: 'mailto:doanemusa561@gmail.com' },
]

const SERVICES = [
  { icon: '🏥', title: 'Medical Claims',    desc: 'Financial support for medical bills, hospitalisation and treatment costs.'             },
  { icon: '🕊️', title: 'Death Benefits',    desc: 'Compassionate support for bereaved families during their most difficult time.'         },
  { icon: '🎓', title: 'Education Support', desc: "Helping members' children access quality education through bursaries and grants."       },
]

const STEPS = [
  { num: '01', title: 'Register',   desc: 'Your admin creates your account and sends you an activation link.'  },
  { num: '02', title: 'Activate',   desc: 'Set your password — you will be taken straight to your dashboard.' },
  { num: '03', title: 'Contribute', desc: 'Pay monthly contributions via M-Pesa STK Push or Paybill.'         },
  { num: '04', title: 'Benefit',    desc: 'Access loans, claims and welfare benefits when you need them.'      },
]

const STATS = [
  { value: '500+',    label: 'Active Members' },
  { value: 'KES 2M+', label: 'Disbursed'      },
  { value: '98%',     label: 'Claim Approval' },
  { value: '2016',    label: 'Est. Nakuru'    },
]

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:      #0f2040;
    --navy-deep: #091529;
    --navy-mid:  #1e3a6e;
    --gold:      #e6b020;
    --gold-lt:   #f5c842;
    --white:     #ffffff;
    --slate:     #475569;
    --slate-lt:  #64748b;
    --bg-soft:   #f8fafc;
    --border:    #e2e8f0;
  }

  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }

  .nav-links { display: flex; gap: 32px; }
  .nav-link {
    color: rgba(255,255,255,0.75); font-size: 14px; font-weight: 500;
    text-decoration: none; transition: color 0.15s;
    background: none; border: none; cursor: pointer;
  }
  .nav-link:hover { color: var(--gold-lt); }

  .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
  .hamburger span { display: block; width: 24px; height: 2px; background: #fff; border-radius: 2px; transition: all 0.25s; }
  .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .hamburger.open span:nth-child(2) { opacity: 0; }
  .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

  .mobile-menu {
    display: none; position: fixed; top: 68px; left: 0; right: 0;
    background: rgba(9,21,41,0.98); backdrop-filter: blur(16px);
    padding: 24px 24px 32px; flex-direction: column; gap: 0;
    border-bottom: 1px solid rgba(255,255,255,0.08); z-index: 99;
  }
  .mobile-menu.open { display: flex; }
  .mobile-menu a, .mobile-menu button {
    color: rgba(255,255,255,0.8); font-size: 16px; font-weight: 500;
    text-decoration: none; padding: 14px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: none; border-left: none; border-right: none; border-top: none;
    cursor: pointer; text-align: left; font-family: 'DM Sans', sans-serif;
  }
  .mobile-menu a:last-child { border-bottom: none; }
  .mobile-login {
    margin-top: 20px; background: var(--gold) !important;
    color: var(--navy) !important; padding: 13px 0 !important;
    border-radius: 10px; text-align: center !important;
    font-weight: 700; border: none !important;
  }

  .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; width: 100%; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
  .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
  .about-values { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
  .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; position: relative; }
  .steps-line { position: absolute; top: 36px; left: 12.5%; right: 12.5%; height: 2px; background: linear-gradient(90deg, var(--navy-mid), var(--gold)); z-index: 0; }

  /* ── FOOTER ── */
  .footer-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 48px; align-items: start; }
  .footer-nav-link { color: rgba(255,255,255,0.4); font-size: 13px; text-decoration: none; transition: color 0.15s; display: inline-block; }
  .footer-nav-link:hover { color: #f5c842; }
  .footer-legal-link { color: rgba(255,255,255,0.25); font-size: 12px; text-decoration: none; transition: color 0.15s; }
  .footer-legal-link:hover { color: rgba(255,255,255,0.5); }

  .notif-toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--navy-mid); color: #fff; padding: 14px 22px;
    border-radius: 12px; font-size: 14px; font-weight: 500;
    border: 1px solid rgba(230,176,32,0.3); box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    display: flex; align-items: center; gap: 10px; z-index: 9999; white-space: nowrap;
    animation: slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(12px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .push-banner {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    background: var(--navy-deep); border-top: 1px solid rgba(230,176,32,0.25);
    padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; box-shadow: 0 -4px 24px rgba(0,0,0,0.4);
  }
  .push-banner p { font-size: 14px; color: rgba(255,255,255,0.8); flex: 1; min-width: 200px; }
  .push-banner-actions { display: flex; gap: 10px; }
  .push-btn-allow { background: var(--gold); color: var(--navy); padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .push-btn-dismiss { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; font-family: 'DM Sans', sans-serif; }

  @media (max-width: 900px) {
    .hero-grid { grid-template-columns: 1fr; gap: 40px; }
    .about-grid { grid-template-columns: 1fr; gap: 40px; }
    .services-grid { grid-template-columns: 1fr 1fr; }
    .steps-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
    .steps-line { display: none; }
    .footer-grid { grid-template-columns: 1fr 1fr; gap: 36px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 24px; }
  }

  @media (max-width: 600px) {
    .nav-links { display: none; }
    .nav-login-desktop { display: none !important; }
    .hamburger { display: flex; }
    .hero-section { padding: 100px 20px 60px !important; }
    .hero-h1 { font-size: clamp(28px, 8vw, 42px) !important; }
    .hero-card { padding: 22px 18px !important; }
    .stats-section { padding: 40px 20px !important; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .about-section { padding: 60px 20px !important; }
    .about-values { grid-template-columns: 1fr !important; }
    .services-section { padding: 60px 20px !important; }
    .services-grid { grid-template-columns: 1fr; }
    .how-section { padding: 60px 20px !important; }
    .steps-grid { grid-template-columns: 1fr; gap: 20px; }
    .cta-section { padding: 60px 20px !important; }
    .footer-section { padding: 48px 20px 0 !important; }
    .footer-grid { grid-template-columns: 1fr; gap: 32px; }
    .push-banner { padding: 14px 16px; }
  }

  .install-btn { display: none; background: rgba(230,176,32,0.12); color: var(--gold-lt); border: 1px solid rgba(230,176,32,0.3); padding: 7px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; margin-left: 12px; }
  .install-btn.visible { display: inline-flex; align-items: center; gap: 6px; }
`

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function subscribeToPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
    if (!VAPID_PUBLIC_KEY) { console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set'); return false }
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
    await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
    return true
  } catch (err) { console.error('[Push] Subscription failed:', err); return false }
}

async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export default function LandingPage() {
  const [scrolled,       setScrolled]       = useState(false)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [showPushBanner, setShowPushBanner] = useState(false)
  const [toast,          setToast]          = useState<string | null>(null)
  const [installPrompt,  setInstallPrompt]  = useState<Event | null>(null)
  const [showInstall,    setShowInstall]    = useState(false)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const dismissed = sessionStorage.getItem('push-banner-dismissed')
      if (!dismissed) setTimeout(() => setShowPushBanner(true), 3500)
    }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 600) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleAllowPush = async () => {
    setShowPushBanner(false)
    const perm = await requestPushPermission()
    if (perm === 'granted') {
      const ok = await subscribeToPush()
      setToast(ok ? "🔔 Notifications enabled! You'll hear about updates & reminders." : '🔔 Notifications enabled!')
    } else {
      setToast('Notifications blocked. You can enable them in browser settings.')
    }
  }

  const handleDismissPush = () => { setShowPushBanner(false); sessionStorage.setItem('push-banner-dismissed', '1') }

  const handleInstall = async () => {
    if (!installPrompt) return
    // @ts-expect-error non-standard API
    const result = await installPrompt.prompt()
    if (result?.outcome === 'accepted') { setShowInstall(false); setToast('✅ App installed! Find it on your home screen.') }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* ── NAVBAR ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(15,32,64,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.3s ease', padding: '0 40px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Image src="/apple-touch-icon.png" alt="Crater SDA Welfare Society Logo" width={42} height={42} style={{ borderRadius: 10, objectFit: 'contain' }} />
            <div>
              <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 16, color: '#fff', lineHeight: 1.1 }}>Crater SDA</div>
              <div style={{ fontSize: 11, color: '#f5c842', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Welfare Society</div>
            </div>
          </div>
          <nav className="nav-links">
            {NAV_LINKS.map(l => <a key={l.href} href={l.href} className="nav-link">{l.label}</a>)}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {showInstall && <button className="install-btn visible" onClick={handleInstall}>⬇️ Install App</button>}
            <Link href="/login" className="nav-login-desktop" style={{ background: '#e6b020', color: '#0f2040', padding: '9px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginLeft: showInstall ? 8 : 0 }}>
              Member Login
            </Link>
          </div>
          <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
            <span/><span/><span/>
          </button>
        </div>
      </header>

      {/* ── MOBILE MENU ── */}
      <nav className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {NAV_LINKS.map(l => <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>)}
        <Link href="/login" className="mobile-login" onClick={() => setMenuOpen(false)}>Member Login →</Link>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section" style={{ background: 'linear-gradient(160deg,#091529 0%,#1e3a6e 55%,#162d57 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 40px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 520, height: 520, borderRadius: '50%', background: 'rgba(230,176,32,0.06)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div className="hero-grid">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(230,176,32,0.12)', border: '1px solid rgba(230,176,32,0.3)', padding: '6px 16px', borderRadius: 99, marginBottom: 28 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f5c842' }}/>
                <span style={{ fontSize: 13, color: '#f5c842', fontWeight: 500 }}>Nakuru, Kenya · Est. 2016</span>
              </div>
              <h1 className="hero-h1" style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(36px,5vw,60px)', fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 22 }}>
                Together We Rise,<br /><span style={{ color: '#f5c842' }}>Together We Thrive</span>
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: 36, maxWidth: 480 }}>
                Crater SDA Welfare Society unites members through mutual financial support —
                death benefits, educational support, medical assistance for families in Crater Seventh Day Adventist Church.
              </p>
              <a href="#about" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 500, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
                Learn More ↓
              </a>
            </div>
            <div className="hero-card" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 36 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Member Overview</div>
              {[
                { label: 'Registration Fee',    value: 'KES 500',             sub: 'Paid upon joining'                   },
                { label: 'Family Contribution', value: 'KES 6,000',           sub: 'Payable annually (3-months upfront)' },
                { label: 'Single Contribution', value: 'KES 2,400',           sub: 'Payable annually (3-months upfront)' },
                { label: 'Death Benefit',       value: 'Available',           sub: 'For Principal Members/Next-of-kin'   },
                { label: 'Medical Assistance',  value: 'Under Consideration', sub: 'For eligible members'                },
                { label: 'Educational Support', value: 'Under Consideration', sub: 'For eligible members'                },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#f5c842', fontFamily: 'Georgia,serif' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-section" style={{ background: '#0f2040', padding: '56px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="stats-grid">
            {STATS.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 40, fontWeight: 700, color: '#f5c842' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="about-section" style={{ padding: '96px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="about-grid">
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e6b020', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>About Us</div>
              <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 36, fontWeight: 700, color: '#0f2040', lineHeight: 1.2, marginBottom: 20 }}>A Community Built on Trust and Solidarity</h2>
              <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 16 }}>
                Founded in 2016, Crater SDA Welfare Society has served families across Crater Seventh Day Adventist Church with the belief that collective strength lifts every individual. We are member-owned, member-governed and driven by the values of our faith community.
              </p>
              <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8 }}>
                Our digital platform brings transparency, speed and accountability to every contribution, claim and benefit — putting members in control of their welfare journey.
              </p>
            </div>
            <div className="about-values">
              {[
                { icon: '🤝', title: 'Solidarity',   desc: "We carry each other's burdens as a community." },
                { icon: '🔒', title: 'Transparency', desc: 'Every shilling tracked and accounted for.'     },
                { icon: '⚡', title: 'Fast Response', desc: 'Claims processed within 5 working days.'      },
                { icon: '📱', title: 'Digital First', desc: 'Pay, track and manage from your phone.'       },
              ].map(v => (
                <div key={v.title} style={{ background: '#f8fafc', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{v.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 6 }}>{v.title}</div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="services-section" style={{ padding: '96px 40px', background: '#f8fafc' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e6b020', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>What We Offer</div>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 36, fontWeight: 700, color: '#0f2040' }}>Our Welfare Services</h2>
          </div>
          <div className="services-grid">
            {SERVICES.map(s => (
              <div key={s.title}
                style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', border: '1px solid #e2e8f0', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#1e3a6e'; el.style.boxShadow='0 8px 32px rgba(30,58,110,0.1)'; el.style.transform='translateY(-3px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#e2e8f0'; el.style.boxShadow='none'; el.style.transform='none' }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#0f2040', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="how-section" style={{ padding: '96px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e6b020', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Getting Started</div>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 36, fontWeight: 700, color: '#0f2040' }}>How It Works</h2>
          </div>
          <div className="steps-grid">
            <div className="steps-line"/>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: i === 3 ? '#e6b020' : '#1e3a6e', color: i === 3 ? '#0f2040' : '#fff', fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', border: '3px solid #fff', boxShadow: '0 4px 16px rgba(30,58,110,0.2)' }}>{s.num}</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section" style={{ background: 'linear-gradient(135deg,#091529,#1e3a6e)', padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 34, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Already a Member?</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.7 }}>
            Log into your dashboard to check contributions, make payments, submit claims and view your welfare standing.
          </p>
          <Link href="/login" style={{ background: '#e6b020', color: '#0f2040', padding: '15px 48px', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
            Member Login →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="footer-section" style={{ background: '#0f2040', padding: '64px 40px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* ── MAIN FOOTER COLUMNS ── */}
          <div className="footer-grid">

            {/* Column 1 — Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <Image src="/apple-touch-icon.png" alt="Crater SDA Welfare Society Logo" width={40} height={40} style={{ borderRadius: 9, objectFit: 'contain' }} />
                <div>
                  <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>Crater SDA Welfare</div>
                  <div style={{ fontSize: 11, color: '#f5c842' }}>Nakuru, Kenya</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, maxWidth: 300 }}>
                Dedicated to lightening the burden of our members through collective care.
              </p>
              <p style={{ fontSize: 13, color: '#f5c842', lineHeight: 1.8, maxWidth: 300, marginTop: 8, fontStyle: 'italic' }}>
                &ldquo;Bear ye one another&rsquo;s burdens, and so fulfil the law of Christ.&rdquo; Galatians 6:2 (KJV)
              </p>
            </div>

            {/* Column 2 — Quick Links */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f5c842', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>Quick Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="#about"    className="footer-nav-link">About</a>
                <a href="#services" className="footer-nav-link">Services</a>
                <a href="#how"      className="footer-nav-link">How it works</a>
                <a href="mailto:doanemusa561@gmail.com" className="footer-nav-link">Contact Us</a>
              </div>
            </div>

            {/* Column 3 — Legal & Policies */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f5c842', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>Legal & Policies</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Link href="/legal/terms"   className="footer-nav-link">Terms of Service</Link>
                <Link href="/legal/privacy" className="footer-nav-link">Privacy Policy</Link>
                <Link href="/legal/cookies" className="footer-nav-link">Cookie Policy</Link>
              </div>
            </div>
          </div>

          {/* ── DIVIDER ── */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '40px 0 0' }} />

          {/* ── BOTTOM BAR ── */}
          <div style={{ padding: '20px 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
              © {new Date().getFullYear()} Crater SDA Welfare Society · Nakuru, Kenya
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Link href="/legal/terms"   className="footer-legal-link">Terms</Link>
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 12 }}>·</span>
              <Link href="/legal/privacy" className="footer-legal-link">Privacy</Link>
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 12 }}>·</span>
              <Link href="/legal/cookies" className="footer-legal-link">Cookies</Link>
            </div>
          </div>

        </div>
      </footer>

      {/* ── PUSH NOTIFICATION BANNER ── */}
      {showPushBanner && (
        <div className="push-banner" role="dialog" aria-label="Enable notifications">
          <p>🔔 <strong style={{ color: '#fff' }}>Stay informed</strong> — get notified about contribution reminders, claim updates and society announcements.</p>
          <div className="push-banner-actions">
            <button className="push-btn-allow"   onClick={handleAllowPush}>Allow</button>
            <button className="push-btn-dismiss" onClick={handleDismissPush}>Not now</button>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && <div className="notif-toast" role="status">{toast}</div>}
    </div>
  )
}
