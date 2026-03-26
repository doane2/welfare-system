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
  .legal-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(230,176,32,0.1); border: 1px solid rgba(230,176,32,0.25);
    padding: 5px 14px; border-radius: 99px; margin-bottom: 24px;
    font-size: 12px; color: #f5c842; font-weight: 500; letter-spacing: 0.05em;
  }
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

  .back-link { display: inline-flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.4); font-size: 13px; text-decoration: none; margin-bottom: 40px; transition: color 0.15s; }
  .back-link:hover { color: #f5c842; }

  @media (max-width: 600px) {
    .legal-wrap { padding: 32px 20px 72px; }
    .legal-table { font-size: 12px; }
    .legal-table th, .legal-table td { padding: 8px 10px; }
  }
`

export default function PrivacyPage() {
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

        <div className="legal-badge">🔒 Legal Document</div>
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-meta">
          Effective: <span>{EFFECTIVE}</span> &nbsp;·&nbsp; Last Updated: <span>{LAST_UPDATED}</span>
        </p>

        {/* TOC */}
        <div className="legal-toc">
          <div className="legal-toc-title">Table of Contents</div>
          <ol>
            {['Introduction','Data We Collect','How We Use Your Data','Data Sharing','Data Retention','Data Security','Your Rights','Children\'s Data','Changes to This Policy','Contact & Data Controller'].map((t,i) => (
              <li key={i}><a href={`#ps${i+1}`}>{i+1}. {t}</a></li>
            ))}
          </ol>
        </div>

        {/* Section 1 */}
        <div id="ps1" className="legal-section">
          <div className="legal-section-num">Section 1</div>
          <div className="legal-section-title">Introduction</div>
          <p className="legal-p">Crater SDA Welfare Society ("Society", "we", "us") is committed to protecting the privacy of our members and beneficiaries. This Privacy Policy explains how we collect, use, store and protect your personal data when you use our Platform.</p>
          <p className="legal-p">This policy is compliant with the <strong style={{color:'#f5c842'}}>Kenya Data Protection Act, 2019</strong> and its accompanying regulations.</p>
        </div>

        {/* Section 2 */}
        <div id="ps2" className="legal-section">
          <div className="legal-section-num">Section 2</div>
          <div className="legal-section-title">Data We Collect</div>
          <p className="legal-p">We collect the following categories of personal data:</p>
          {[
            { sub: 'Identity & Contact Data', items: ['Full name, national ID number, date of birth','Phone number (M-Pesa registered), email address','Residential address, church membership details'] },
            { sub: 'Financial Data', items: ['M-Pesa transaction records and confirmation codes','Contribution history, payment dates and amounts','Bank account details (where provided for disbursements)'] },
            { sub: 'Beneficiary Data', items: ['Names, relationships and contact details of registered beneficiaries and next-of-kin'] },
            { sub: 'Claims & Medical Data', items: ['Claim type, description and supporting documents','Hospital invoices, death certificates, school fee statements','Medical information provided voluntarily in support of a claim'] },
            { sub: 'Technical Data', items: ['IP address, browser type and device information','Login timestamps and session activity','Push notification subscription tokens'] },
            { sub: 'Communications Data', items: ['OTP delivery logs (phone and email)','In-platform notifications and announcements'] },
          ].map(g => (
            <div key={g.sub} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>{g.sub}</div>
              <ul className="legal-list">{g.items.map((item,i) => <li key={i}>{item}</li>)}</ul>
            </div>
          ))}
        </div>

        {/* Section 3 */}
        <div id="ps3" className="legal-section">
          <div className="legal-section-num">Section 3</div>
          <div className="legal-section-title">How We Use Your Data</div>
          <p className="legal-p">We use your personal data for the following purposes:</p>
          <table className="legal-table">
            <thead><tr><th>Purpose</th><th>Legal Basis</th></tr></thead>
            <tbody>
              {[
                ['Creating and managing your member account','Contractual necessity'],
                ['Processing contributions and payments via M-Pesa','Contractual necessity'],
                ['Evaluating and disbursing welfare claims','Contractual necessity'],
                ['Sending OTP codes for secure admin login','Legitimate interest (security)'],
                ['Sending contribution reminders and claim updates','Legitimate interest'],
                ['Sending push notifications','Consent'],
                ['Maintaining financial records for audit purposes','Legal obligation'],
                ['Detecting and preventing fraud','Legitimate interest'],
              ].map(([p,b]) => <tr key={p}><td>{p}</td><td>{b}</td></tr>)}
            </tbody>
          </table>
          <p className="legal-p" style={{marginTop:16}}>We do not use your data for marketing, advertising or any purpose unrelated to the Society's welfare mandate.</p>
        </div>

        {/* Section 4 */}
        <div id="ps4" className="legal-section">
          <div className="legal-section-num">Section 4</div>
          <div className="legal-section-title">Data Sharing</div>
          <p className="legal-p"><strong style={{color:'rgba(255,255,255,0.8)'}}>We do not sell your personal data to any third party.</strong></p>
          <p className="legal-p">We share data only with the following trusted service providers, strictly for operational purposes:</p>
          <table className="legal-table">
            <thead><tr><th>Service Provider</th><th>Purpose</th><th>Data Shared</th></tr></thead>
            <tbody>
              {[
                ['Safaricom (M-Pesa)','Payment processing','Phone number, transaction reference'],
                ['Cloudinary','Document storage','Claim supporting documents (images/PDFs)'],
                ['Email/SMS provider','OTP and notifications','Phone number, email address'],
              ].map(([p,pu,d]) => <tr key={p}><td style={{color:'#f5c842'}}>{p}</td><td>{pu}</td><td>{d}</td></tr>)}
            </tbody>
          </table>
          <p className="legal-p" style={{marginTop:16}}>All service providers are contractually bound to process your data only on our instructions and in accordance with applicable data protection law.</p>
          <p className="legal-p">We may disclose data to law enforcement or regulatory authorities where required by Kenyan law or a valid court order.</p>
        </div>

        {/* Section 5 */}
        <div id="ps5" className="legal-section">
          <div className="legal-section-num">Section 5</div>
          <div className="legal-section-title">Data Retention</div>
          <table className="legal-table">
            <thead><tr><th>Data Category</th><th>Retention Period</th></tr></thead>
            <tbody>
              {[
                ['Member account data','Duration of membership + 7 years'],
                ['Financial & contribution records','7 years (legal requirement)'],
                ['Claim records and documents','7 years from claim closure'],
                ['Technical/session logs','90 days'],
                ['Push notification tokens','Until withdrawn or membership ends'],
              ].map(([c,r]) => <tr key={c}><td>{c}</td><td>{r}</td></tr>)}
            </tbody>
          </table>
          <p className="legal-p" style={{marginTop:16}}>After the retention period, data is securely deleted or anonymised.</p>
        </div>

        {/* Section 6 */}
        <div id="ps6" className="legal-section">
          <div className="legal-section-num">Section 6</div>
          <div className="legal-section-title">Data Security</div>
          <ul className="legal-list">
            {[
              'All data is transmitted over encrypted HTTPS connections.',
              'Passwords are hashed using industry-standard algorithms and are never stored in plain text.',
              'Admin accounts are protected by two-factor authentication (2FA).',
              'Claim documents are stored on Cloudinary with access controls. Direct public URLs are not shared without authorisation.',
              'We conduct periodic reviews of our security practices.',
              'In the event of a data breach likely to result in risk to your rights and freedoms, we will notify you and the Office of the Data Protection Commissioner (ODPC) within 72 hours of becoming aware.',
            ].map((item,i) => <li key={i}>{item}</li>)}
          </ul>
        </div>

        {/* Section 7 */}
        <div id="ps7" className="legal-section">
          <div className="legal-section-num">Section 7</div>
          <div className="legal-section-title">Your Rights</div>
          <p className="legal-p">Under the Kenya Data Protection Act, 2019, you have the right to:</p>
          <ul className="legal-list">
            {[
              'Access — request a copy of personal data we hold about you',
              'Correction — request correction of inaccurate or incomplete data',
              'Deletion — request deletion of your data (subject to legal retention obligations)',
              'Objection — object to processing based on legitimate interest',
              'Withdrawal of Consent — withdraw consent for push notifications at any time via Platform or browser settings',
              'Data Portability — receive your data in a portable format where technically feasible',
              'Complaint — lodge a complaint with the Office of the Data Protection Commissioner (ODPC) at odpc.go.ke',
            ].map((item,i) => <li key={i}>{item}</li>)}
          </ul>
          <p className="legal-p" style={{marginTop:16}}>To exercise any of these rights, contact your Society administrator.</p>
        </div>

        {/* Section 8 */}
        <div id="ps8" className="legal-section">
          <div className="legal-section-num">Section 8</div>
          <div className="legal-section-title">Children's Data</div>
          <p className="legal-p">The Platform is not intended for use by persons under 18. We do not knowingly collect personal data from minors. Beneficiary data for dependants under 18 is collected solely for welfare claim purposes and handled with additional care.</p>
        </div>

        {/* Section 9 */}
        <div id="ps9" className="legal-section">
          <div className="legal-section-num">Section 9</div>
          <div className="legal-section-title">Changes to This Policy</div>
          <p className="legal-p">We may update this Privacy Policy from time to time. Material changes will be notified via the Platform. Continued use after notification constitutes acceptance.</p>
        </div>

        {/* Section 10 */}
        <div id="ps10" className="legal-section">
          <div className="legal-section-num">Section 10</div>
          <div className="legal-section-title">Contact & Data Controller</div>
          <p className="legal-p"><strong style={{color:'rgba(255,255,255,0.8)'}}>Data Controller:</strong> Crater SDA Welfare Society, Crater SDA Church, Nakuru, Kenya.</p>
          <p className="legal-p">For privacy concerns or to exercise your rights, contact your Society administrator or email: <a href="mailto:doanemusa561@gmail.com" style={{color:'#f5c842'}}>doanemusa561@gmail.com</a></p>
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
