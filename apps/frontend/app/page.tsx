'use client'
import './landing.css'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import {
  HeartPulse, Bird, GraduationCap, Handshake, ShieldCheck, Zap, Smartphone,
  UserPlus, KeyRound, CreditCard, Gift, Bell, CheckCircle2, ChevronDown, ArrowRight,
  Download, Wallet, Landmark, Users, ArrowUp, MapPin, Mail, Plus, Lock, FileText,
} from 'lucide-react'
import { Reveal, Counter } from '../components/landing/motion'
import Gallery from '../components/landing/Gallery'
import ContactForm from '../components/landing/ContactForm'

// Photos live in apps/frontend/public/images (see README.txt in that folder).
// A missing photo simply shows the navy gradient behind it.
const IMG = {
  hero:    '/images/hero.jpg',
  about:   '/images/about.jpg',
  how:     '/images/how.jpg',
  contact: '/images/contact.jpg',
  cta:     '/images/cta.jpg',
}
const bg = (src: string) => ({ backgroundImage: `url(${src})` })

const NAV_LINKS = [
  { label: 'About',        id: 'about'    },
  { label: 'Services',     id: 'services' },
  { label: 'How it works', id: 'how'      },
  { label: 'Gallery',      id: 'gallery'  },
  { label: 'FAQ',          id: 'faq'      },
  { label: 'Contact',      id: 'contact'  },
]

const TRUST = [
  { Icon: Lock,        text: 'Secure sign in'          },
  { Icon: Smartphone,  text: 'M-Pesa payments'         },
  { Icon: FileText,    text: 'PDF statements anytime'  },
  { Icon: ShieldCheck, text: 'Transparent records'     },
]

const STATS = [
  { to: 500, suffix: '+',   label: 'Active members' },
  { to: 2,   prefix: 'KES ', suffix: 'M+', label: 'Disbursed' },
  { to: 98,  suffix: '%',   label: 'Claim approval' },
  { text: '2016',           label: 'Established in Nakuru' },
]

const ABOUT_VALUES = [
  { Icon: Handshake,   title: 'Solidarity',    desc: "We carry each other's burdens as a community." },
  { Icon: ShieldCheck, title: 'Transparency',  desc: 'Every shilling tracked and accounted for.'     },
  { Icon: Zap,         title: 'Fast response', desc: 'Claims processed within 5 working days.'       },
  { Icon: Smartphone,  title: 'Digital first', desc: 'Pay, track and manage from your phone.'        },
]

const SERVICES = [
  { Icon: HeartPulse,    title: 'Medical claims',            desc: 'Financial support towards medical bills, hospitalisation and treatment costs.', tag: 'Under consideration' },
  { Icon: Bird,          title: 'Death benefits',            desc: 'Compassionate support for bereaved families during their most difficult time.' },
  { Icon: GraduationCap, title: 'Education support',         desc: "Helping members' children access quality education through bursaries and grants.", tag: 'Under consideration' },
  { Icon: Wallet,        title: 'Contributions and M-Pesa',  desc: 'Pay through M-Pesa STK Push or Paybill, follow every payment and download PDF statements.' },
  { Icon: Landmark,      title: 'Welfare loans',             desc: 'Eligible members can apply for a welfare loan and follow their repayment schedule online.' },
  { Icon: Users,         title: 'Beneficiaries and family',  desc: 'Register your dependents and next of kin so support reaches the right people.' },
]

const STEPS = [
  { num: '01', Icon: UserPlus,   title: 'Register',   desc: 'Your admin creates your account and sends you an activation link.' },
  { num: '02', Icon: KeyRound,   title: 'Activate',   desc: 'Set your password and go straight to your dashboard.' },
  { num: '03', Icon: CreditCard, title: 'Contribute', desc: 'Pay monthly contributions via M-Pesa STK Push or Paybill.' },
  { num: '04', Icon: Gift,       title: 'Benefit',    desc: 'Access loans, claims and welfare benefits when you need them.' },
]

const FAQ = [
  { q: 'How do I join the society?', a: 'Use the contact form below and an administrator will guide you through registration. Once your account is created you will receive an activation link to set your password.' },
  { q: 'How much are the contributions?', a: 'Registration is KES 500, paid once when you join. The annual contribution is KES 2,400 for a single member and KES 6,000 for a family, with 3 months paid upfront. Full annual contributions are due by 31 March each year.' },
  { q: 'How do I pay?', a: 'Pay from your dashboard with M-Pesa STK Push, or use our Paybill. Your payment is confirmed by an administrator and then shows in your contribution history.' },
  { q: 'How long do claims take?', a: 'We aim to process claims within 5 working days. Submit your claim and supporting documents from your dashboard and track its status there.' },
  { q: 'How do I add or change a beneficiary?', a: 'Send a request from the Beneficiaries page in your dashboard. The welfare secretary reviews it within 2 working days and you are notified of the outcome.' },
  { q: 'I cannot sign in. What should I do?', a: 'Check that you are using the email address your administrator registered. If you still cannot get in, send us a message below and we will help you get access back.' },
]

// Sample updates. When members are actively using the system, flip USE_LIVE_ANNOUNCEMENTS to true.
// It needs a PUBLIC endpoint (GET /api/announcements/public) that returns { announcements: [...] }
// with only active announcements, because /api/announcements/active currently requires sign in.
const USE_LIVE_ANNOUNCEMENTS = false
type UpdateItem = { tag: string; title: string; text: string }
const SAMPLE_UPDATES: UpdateItem[] = [
  { tag: 'Reminder', title: 'Annual contributions are due by 31 March', text: 'Members are reminded to complete their annual contribution before the deadline. You can pay securely with M-Pesa from your dashboard.' },
  { tag: 'Notice',   title: 'Welfare meeting notice',                    text: 'Members will be invited to the next welfare meeting. The date and venue will be shared here and by SMS once confirmed.' },
  { tag: 'Tip',      title: 'Keep your beneficiaries up to date',        text: 'Review your dependents and next of kin in your dashboard so that support reaches the right people when it is needed.' },
]

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0))) as Uint8Array<ArrayBuffer>
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

function SectionHead({ title, sub, light }: { title: string; sub?: string; light?: boolean }) {
  return (
    <div className={`sec-head ${light ? 'light' : ''}`}>
      <h2 className="sec-title">{title}</h2>
      {sub && <p className="sec-sub">{sub}</p>}
    </div>
  )
}

export default function LandingPage() {
  const [scrolled,       setScrolled]       = useState(false)
  const [progress,       setProgress]       = useState(0)
  const [showTop,        setShowTop]        = useState(false)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [activeId,       setActiveId]       = useState('')
  const [openFaq,        setOpenFaq]        = useState<number | null>(0)
  const [updates,        setUpdates]        = useState<UpdateItem[]>(SAMPLE_UPDATES)
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
    const onScroll = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(y > 40)
      setShowTop(y > 700)
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight the nav link of the section currently on screen
  useEffect(() => {
    const els = NAV_LINKS.map(l => document.getElementById(l.id)).filter(Boolean) as HTMLElement[]
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id) })
    }, { rootMargin: '-40% 0px -55% 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 720) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!USE_LIVE_ANNOUNCEMENTS) return
    fetch('/api/announcements/public')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.announcements) && d.announcements.length) {
          setUpdates(d.announcements.slice(0, 3).map((a: any) => ({
            tag: a.priority ? 'Pinned' : 'Update', title: a.title, text: a.content,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const handleAllowPush = async () => {
    setShowPushBanner(false)
    const perm = await requestPushPermission()
    if (perm === 'granted') {
      const ok = await subscribeToPush()
      setToast(ok ? "Notifications enabled! You'll hear about updates & reminders." : 'Notifications enabled!')
    } else {
      setToast('Notifications blocked. You can enable them in browser settings.')
    }
  }
  const handleDismissPush = () => { setShowPushBanner(false); sessionStorage.setItem('push-banner-dismissed', '1') }

  const handleInstall = async () => {
    if (!installPrompt) return
    // @ts-expect-error non-standard API
    const result = await installPrompt.prompt()
    if (result?.outcome === 'accepted') { setShowInstall(false); setToast('App installed! Find it on your home screen.') }
  }

  return (
    <div className="landing">
      <div className="scroll-progress" style={{ width: `${progress}%` }} />

      {/* NAVBAR */}
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-inner">
          <a href="#top" className="brand">
            <Image src="/apple-touch-icon.png" alt="Crater SDA Welfare Society logo" width={42} height={42} style={{ borderRadius: 10, objectFit: 'contain' }} />
            <div>
              <div className="brand-name">Crater SDA</div>
              <div className="brand-sub">Welfare Society</div>
            </div>
          </a>
          <nav className="nav-links">
            {NAV_LINKS.map(l => (
              <a key={l.id} href={`#${l.id}`} className={`nav-link ${activeId === l.id ? 'active' : ''}`}>{l.label}</a>
            ))}
          </nav>
          <div className="nav-actions">
            {showInstall && (
              <button className="install-btn" onClick={handleInstall}><Download size={14} /> Install app</button>
            )}
            <Link href="/login" className="btn-login nav-login-desktop">Member login</Link>
            <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <nav className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {NAV_LINKS.map(l => <a key={l.id} href={`#${l.id}`} onClick={() => setMenuOpen(false)}>{l.label}</a>)}
        <Link href="/login" className="mobile-login" onClick={() => setMenuOpen(false)}>Member login</Link>
      </nav>

      {/* HERO */}
      <section id="top" className="hero-section">
        <div className="hero-bg" style={bg(IMG.hero)} />
        <div className="hero-overlay" />
        <div className="hero-inner">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-badge"><i /> Nakuru, Kenya &middot; Est. 2016</div>
              <h1 className="hero-h1">Together we rise,<br /><span>together we thrive</span></h1>
              <p className="hero-p">
                Crater SDA Welfare Society unites members through mutual financial support &mdash;
                death benefits, educational support and medical assistance for families in Crater Seventh Day Adventist Church.
              </p>
              <div className="hero-actions">
                <Link href="/login" className="btn-gold-lg">Member login <ArrowRight size={18} /></Link>
                <a href="#about" className="btn-ghost-lg">Learn more <ChevronDown size={16} /></a>
              </div>
            </div>
            <div className="hero-card">
              <div className="hero-card-title">Member overview</div>
              {[
                { label: 'Registration fee',    value: 'KES 500',             sub: 'Paid upon joining'                   },
                { label: 'Family contribution', value: 'KES 6,000',           sub: 'Payable annually (3-months upfront)' },
                { label: 'Single contribution', value: 'KES 2,400',           sub: 'Payable annually (3-months upfront)' },
                { label: 'Death benefit',       value: 'Available',           sub: 'For principal members / next of kin' },
                { label: 'Medical assistance',  value: 'Under consideration', sub: 'For eligible members'                },
                { label: 'Educational support', value: 'Under consideration', sub: 'For eligible members'                },
              ].map(item => (
                <div key={item.label} className="hero-row">
                  <div>
                    <div className="hero-row-label">{item.label}</div>
                    <div className="hero-row-sub">{item.sub}</div>
                  </div>
                  <div className="hero-row-value">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <a href="#about" className="hero-scroll" aria-label="Scroll down"><ChevronDown size={26} /></a>
      </section>

      {/* TRUST STRIP */}
      <div className="trust-strip">
        <div className="trust-inner">
          {TRUST.map(({ Icon, text }) => (
            <div key={text} className="trust-item"><Icon size={18} color="#e6b020" /> {text}</div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section className="stats-section">
        <div className="stats-grid">
          {STATS.map(s => (
            <div key={s.label} className="stat">
              <div className="stat-value">
                {'text' in s && s.text ? s.text : <Counter to={s.to as number} prefix={(s as any).prefix} suffix={(s as any).suffix} />}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="about-grid">
            <Reveal variant="left" className="about-copy">
              <h2 className="about-title">A community built on trust and solidarity</h2>
              <p>
                Founded in 2016, Crater SDA Welfare Society has served families across Crater Seventh Day Adventist Church with the belief that collective strength lifts every individual. We are member-owned, member-governed and driven by the values of our faith community.
              </p>
              <p>
                Our digital platform brings transparency, speed and accountability to every contribution, claim and benefit &mdash; putting members in control of their welfare journey.
              </p>
              <div className="mv-grid">
                <div className="mv-card">
                  <h4>Our mission</h4>
                  <p>To lighten the burden of our members through collective care, open record keeping and timely support.</p>
                </div>
                <div className="mv-card">
                  <h4>Our vision</h4>
                  <p>A church family where no member faces hardship or loss alone.</p>
                </div>
              </div>
            </Reveal>
            <Reveal variant="right" className="about-visual">
              <div className="about-photo" style={bg(IMG.about)} role="img" aria-label="Members of Crater SDA Welfare Society together" />
              <div className="about-badge"><strong>2016</strong><span>Serving families in Nakuru</span></div>
            </Reveal>
          </div>

          <div className="values-grid">
            {ABOUT_VALUES.map(({ Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="value-card">
                  <div className="value-icon"><Icon size={20} color="#e6b020" strokeWidth={1.75} /></div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="section services-section">
        <div className="container">
          <SectionHead title="Our welfare services" sub="Support for the moments that matter, and the tools to manage your membership." />
          <div className="services-grid">
            {SERVICES.map(({ Icon, title, desc, tag }, i) => (
              <Reveal key={title} delay={(i % 3) * 90}>
                <div className="service-card">
                  {tag && <span className="service-tag">{tag}</span>}
                  <div className="service-icon"><Icon size={22} color="#1e3a6e" strokeWidth={1.75} /></div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section how-section">
        <div className="bg-img" style={bg(IMG.how)} />
        <div className="bg-overlay how-overlay" />
        <div className="container">
          <SectionHead light title="How it works" sub="From registration to benefits in four steps." />
          <div className="steps-grid">
            <div className="steps-line" />
            {STEPS.map(({ num, Icon, title, desc }, i) => (
              <Reveal key={num} delay={i * 110}>
                <div className="step">
                  <div className={`step-dot ${i === 3 ? 'gold' : ''}`}>
                    <Icon size={24} color={i === 3 ? '#0f2040' : '#fff'} strokeWidth={1.75} />
                  </div>
                  <div className="step-n">Step {Number(num)}</div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="section gallery-section">
        <div className="container">
          <SectionHead title="Life in our community" sub="Tap any photo to see it larger." />
          <Gallery />
        </div>
      </section>

      {/* UPDATES (sample content for now) */}
      <section id="updates" className="section updates-section">
        <div className="container">
          <SectionHead title="Latest updates" sub="Notices and reminders from the welfare office." />
          <div className="updates-grid">
            {updates.map((u, i) => (
              <Reveal key={u.title} delay={i * 90}>
                <article className="update-card">
                  <span className="update-tag">{u.tag}</span>
                  <h3>{u.title}</h3>
                  <p>{u.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section" style={{ background: '#fff' }}>
        <div className="container">
          <SectionHead title="Questions members ask" sub="Quick answers about joining, paying and claiming." />
          <div className="faq-list">
            {FAQ.map((f, i) => {
              const open = openFaq === i
              return (
                <div key={f.q} className={`faq-item ${open ? 'open' : ''}`}>
                  <button className="faq-q" onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}>
                    {f.q}
                    <Plus size={20} className="faq-plus" />
                  </button>
                  <div className="faq-a"><div><p>{f.a}</p></div></div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section contact-section">
        <div className="bg-img" style={bg(IMG.contact)} />
        <div className="bg-overlay contact-overlay" />
        <div className="container">
          <div className="contact-grid">
            <Reveal variant="left" className="contact-info">
              <h2>Get in touch</h2>
              <p>Want to join, or need help with your account? Send us a message and an administrator will reach out.</p>
              <a className="info-row" href="mailto:support@sdacrater.org">
                <span className="info-icon"><Mail size={20} color="#f5c842" /></span>
                <span><div className="info-label">Email</div><div className="info-value">support@sdacrater.org</div></span>
              </a>
              <div className="info-row">
                <span className="info-icon"><MapPin size={20} color="#f5c842" /></span>
                <span><div className="info-label">Location</div><div className="info-value">Crater SDA Church, Nakuru, Kenya</div></span>
              </div>
            </Reveal>
            <Reveal variant="right"><ContactForm /></Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="bg-img" style={bg(IMG.cta)} />
        <div className="bg-overlay cta-overlay" />
        <div className="cta-inner">
          <h2>Already a member?</h2>
          <p>Log into your dashboard to check contributions, make payments, submit claims and view your welfare standing.</p>
          <Link href="/login" className="btn-gold-lg">Member login <ArrowRight size={18} /></Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-section">
        <div className="footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <Image src="/apple-touch-icon.png" alt="Crater SDA Welfare Society logo" width={40} height={40} style={{ borderRadius: 9, objectFit: 'contain' }} />
              <div>
                <div style={{ fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>Crater SDA Welfare</div>
                <div style={{ fontSize: 11, color: '#f5c842' }}>Nakuru, Kenya</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, maxWidth: 300 }}>
              Dedicated to lightening the burden of our members through collective care.
            </p>
            <p style={{ fontSize: 13, color: '#f5c842', lineHeight: 1.8, maxWidth: 300, marginTop: 8, fontStyle: 'italic' }}>
              &ldquo;Bear ye one another&rsquo;s burdens, and so fulfil the law of Christ.&rdquo; Galatians 6:2 (KJV)
            </p>
          </div>
          <div>
            <div className="footer-head">Quick links</div>
            <div className="footer-col">
              <a href="#about" className="footer-nav-link">About</a>
              <a href="#services" className="footer-nav-link">Services</a>
              <a href="#how" className="footer-nav-link">How it works</a>
              <a href="#gallery" className="footer-nav-link">Gallery</a>
            </div>
          </div>
          <div>
            <div className="footer-head">Support</div>
            <div className="footer-col">
              <a href="#faq" className="footer-nav-link">FAQ</a>
              <a href="#contact" className="footer-nav-link">Contact us</a>
              <Link href="/login" className="footer-nav-link">Member login</Link>
            </div>
          </div>
          <div>
            <div className="footer-head">Legal and policies</div>
            <div className="footer-col">
              <Link href="/legal/terms" className="footer-nav-link">Terms of service</Link>
              <Link href="/legal/privacy" className="footer-nav-link">Privacy policy</Link>
              <Link href="/legal/cookies" className="footer-nav-link">Cookie policy</Link>
            </div>
          </div>
        </div>
        <div className="footer-line" />
        <div className="footer-bottom">
          <p className="footer-copy">&copy; {new Date().getFullYear()} Crater SDA Welfare Society &middot; Nakuru, Kenya</p>
          <p className="powered">
            Powered by{' '}
            <a href="https://doanebrightpathdigital.com" target="_blank" rel="noopener noreferrer">Doane Brightpath Digital</a>
          </p>
        </div>
      </footer>

      {showTop && (
        <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
          <ArrowUp size={20} />
        </button>
      )}

      {showPushBanner && (
        <div className="push-banner" role="dialog" aria-label="Enable notifications">
          <p style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={16} color="#f5c842" style={{ flexShrink: 0 }} />
            <span><strong style={{ color: '#fff' }}>Stay informed</strong> &mdash; get notified about contribution reminders, claim updates and society announcements.</span>
          </p>
          <div className="push-banner-actions">
            <button className="push-btn-allow" onClick={handleAllowPush}>Allow</button>
            <button className="push-btn-dismiss" onClick={handleDismissPush}>Not now</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="notif-toast" role="status">
          <CheckCircle2 size={16} color="#f5c842" />
          {toast}
        </div>
      )}
    </div>
  )
}