'use client'
import Link from 'next/link'
import Image from 'next/image'

const LAST_UPDATED = '25 March 2026'
const EFFECTIVE    = '1 January 2026'

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #0f2040; --navy-deep: #091529; --navy-mid: #1e3a6e;
    --gold: #e6b020; --gold-lt: #f5c842;
    --border: rgba(255,255,255,0.08);
  }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', sans-serif; background: var(--navy-deep); color: #fff; }

  .legal-wrap { max-width: 860px; margin: 0 auto; padding: 48px 24px 96px; }
  .legal-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(230,176,32,0.1); border: 1px solid rgba(230,176,32,0.25); padding: 5px 14px; border-radius: 99px; margin-bottom: 24px; font-size: 12px; color: #f5c842; font-weight: 500; letter-spacing: 0.05em; }
  .legal-title { font-family: Georgia, serif; font-size: clamp(28px, 5vw, 42px); font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 12px; }
  .legal-meta { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 48px; }
  .legal-meta span { color: #f5c842; }

  .legal-toc { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 14px; padding: 24px 28px; margin-bottom: 48px; }
  .legal-toc-title { font-size: 11px; font-weight: 600; color: #f5c842; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 14px; }
  .legal-toc ol { padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
  .legal-toc a { font-size: 13px; color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.15s; }
  .legal-toc a:hover { color: #f5c842; }

  .legal-section { margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid var(--border); }
  .legal-section:last-child { border-bottom: none; }
  .legal-section-num { font-size: 11px; color: #f5c842; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
  .legal-section-title { font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 16px; }
  .legal-p { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.85; margin-bottom: 12px; }
  .legal-list { display: flex; flex-direction: column; gap: 10px; padding-left: 0; list-style: none; }
  .legal-list li { font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.8; padding-left: 20px; position: relative; }
  .legal-list li::before { content: ''; position: absolute; left: 0; top: 10px; width: 5px; height: 5px; border-radius: 50%; background: #e6b020; }

  .legal-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  .legal-table th { background: rgba(30,58,110,0.6); color: #f5c842; padding: 10px 14px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.07em; text-transform: uppercase; }
  .legal-table td { padding: 11px 14px; color: rgba(255,255,255,0.55); border-bottom: 1px solid rgba(255,255,255,0.06); vertical-align: top; line-height: 1.6; }
  .legal-table tr:last-child td { border-bottom: none; }
  .legal-table tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
  .cookie-name { font-family: monospace; font-size: 12px; color: #f5c842; background: rgba(230,176,32,0.1); padding: 2px 7px; border-radius: 4px; }

  .back-link { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.4); font-size: 13px; text-decoration: none; margin-bottom: 40px; transition: color 0.15s; }
  .back-link:hover { color: #f5c842; }

  .browser-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
  .browser-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .browser-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
  .browser-path { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.5; }

  @media (max-width: 600px) {
    .legal-wrap { padding: 32px 20px 72px; }
    .browser-grid { grid-template-columns: 1fr; }
    .legal-table { font-size: 12px; }
    .legal-table th, .legal-table td { padding: 8px 10px; }
  }
`

export default function CookiesPage() {
  return (
    <div style={{ background: '#091529', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* NAV */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <Image src="/apple-touch-icon.png" alt="Logo" width={36} height={36} style={{ borderRadius: 8 }} />
            <div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>Crater SDA Welfare</div>
              <div style={{ fontSize: 10, color: '#f5c842', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nakuru, Kenya</div>
            </div>
          </Link>
          <Link href="/login" style={{ background: '#e6b020', color: '#0f2040', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Member Login
          </Link>
        </div>
      </header>

      <div className="legal-wrap">
        <Link href="/" className="back-link">← Back to home</Link>

        <div className="legal-badge">🍪 Legal Document</div>
        <h1 className="legal-title">Cookie Policy</h1>
        <p className="legal-meta">
          Effective: <span>{EFFECTIVE}</span> &nbsp;·&nbsp; Last Updated: <span>{LAST_UPDATED}</span>
        </p>

        {/* TOC */}
        <div className="legal-toc">
          <div className="legal-toc-title">Table of Contents</div>
          <ol>
            {['What Are Cookies?','Cookies We Use','Local & Session Storage','Third-Party Cookies','Managing Cookies','Changes to This Policy','Contact'].map((t,i) => (
              <li key={i}><a href={`#cs${i+1}`}>{i+1}. {t}</a></li>
            ))}
          </ol>
        </div>

        {/* Section 1 */}
        <div id="cs1" className="legal-section">
          <div className="legal-section-num">Section 1</div>
          <div className="legal-section-title">What Are Cookies?</div>
          <p className="legal-p">Cookies are small text files stored on your device when you visit a website or web application. They help the Platform remember your preferences and keep you securely logged in.</p>
        </div>

        {/* Section 2 */}
        <div id="cs2" className="legal-section">
          <div className="legal-section-num">Section 2</div>
          <div className="legal-section-title">Cookies We Use</div>
          <p className="legal-p">The Platform uses only the cookies strictly necessary for its operation. We do <strong style={{color:'rgba(255,255,255,0.8)'}}>not</strong> use advertising, tracking or analytics cookies.</p>
          <table className="legal-table">
            <thead>
              <tr><th>Cookie Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="cookie-name">auth_token</span></td>
                <td>Essential</td>
                <td>Keeps you securely logged in to your member account</td>
                <td>Session / 7 days</td>
              </tr>
              <tr>
                <td><span className="cookie-name">csrf_token</span></td>
                <td>Essential</td>
                <td>Protects against cross-site request forgery attacks</td>
                <td>Session</td>
              </tr>
              <tr>
                <td><span className="cookie-name">push-banner-dismissed</span></td>
                <td>Functional</td>
                <td>Remembers if you dismissed the push notification banner</td>
                <td>Session (sessionStorage)</td>
              </tr>
              <tr>
                <td><span className="cookie-name">next-auth.*</span></td>
                <td>Essential</td>
                <td>Next.js authentication session management</td>
                <td>Session</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3 */}
        <div id="cs3" className="legal-section">
          <div className="legal-section-num">Section 3</div>
          <div className="legal-section-title">Local & Session Storage</div>
          <p className="legal-p">In addition to cookies, the Platform uses browser <strong style={{color:'rgba(255,255,255,0.8)'}}>sessionStorage</strong> to remember temporary UI preferences (such as whether you dismissed the notification banner). This data is cleared automatically when you close your browser tab and is never transmitted to our servers.</p>
        </div>

        {/* Section 4 */}
        <div id="cs4" className="legal-section">
          <div className="legal-section-num">Section 4</div>
          <div className="legal-section-title">Third-Party Cookies</div>
          <p className="legal-p"><strong style={{color:'rgba(255,255,255,0.8)'}}>We do not load any third-party advertising or analytics scripts.</strong> However, the following third-party services may set their own cookies or tokens when you interact with them:</p>
          <table className="legal-table">
            <thead><tr><th>Service</th><th>Why</th><th>Their Policy</th></tr></thead>
            <tbody>
              <tr>
                <td style={{color:'#f5c842'}}>Cloudinary</td>
                <td>Document viewer (claim attachments)</td>
                <td><a href="https://cloudinary.com/privacy" target="_blank" rel="noopener noreferrer" style={{color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>cloudinary.com/privacy</a></td>
              </tr>
              <tr>
                <td style={{color:'#f5c842'}}>Safaricom M-Pesa</td>
                <td>STK Push payment flow</td>
                <td>Safaricom Privacy Policy</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 5 */}
        <div id="cs5" className="legal-section">
          <div className="legal-section-num">Section 5</div>
          <div className="legal-section-title">Managing Cookies</div>
          <p className="legal-p"><strong style={{color:'rgba(255,255,255,0.8)'}}>Essential cookies</strong> cannot be disabled as they are required for the Platform to function securely. Disabling them will prevent you from logging in.</p>
          <p className="legal-p">You can manage cookies through your browser settings:</p>
          <div className="browser-grid">
            {[
              { name: 'Chrome',  path: 'Settings → Privacy and Security → Cookies' },
              { name: 'Firefox', path: 'Settings → Privacy & Security → Cookies and Site Data' },
              { name: 'Safari',  path: 'Preferences → Privacy → Manage Website Data' },
              { name: 'Edge',    path: 'Settings → Cookies and Site Permissions' },
            ].map(b => (
              <div key={b.name} className="browser-card">
                <div className="browser-name">{b.name}</div>
                <div className="browser-path">{b.path}</div>
              </div>
            ))}
          </div>
          <p className="legal-p" style={{marginTop:16}}>Push notifications can be disabled at any time through your browser's notification settings or via the Platform's notification preferences.</p>
        </div>

        {/* Section 6 */}
        <div id="cs6" className="legal-section">
          <div className="legal-section-num">Section 6</div>
          <div className="legal-section-title">Changes to This Policy</div>
          <p className="legal-p">We may update this Cookie Policy as the Platform evolves. Changes will be noted with an updated "Last Updated" date at the top of this page.</p>
        </div>

        {/* Section 7 */}
        <div id="cs7" className="legal-section">
          <div className="legal-section-num">Section 7</div>
          <div className="legal-section-title">Contact</div>
          <p className="legal-p">For questions about cookies or your data, contact your Society administrator or write to: <strong style={{color:'rgba(255,255,255,0.7)'}}>Crater SDA Welfare Society, Crater SDA Church, Nakuru, Kenya.</strong></p>
          <p className="legal-p">Email: <a href="mailto:doanemusa561@gmail.com" style={{color:'#f5c842'}}>doanemusa561@gmail.com</a></p>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} Crater SDA Welfare Society · Nakuru, Kenya</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
          <Link href="/legal/terms"   style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/legal/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/legal/cookies" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Cookie Policy</Link>
        </div>
      </div>
    </div>
  )
}
