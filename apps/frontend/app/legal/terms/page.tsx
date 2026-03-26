'use client'
import Link from 'next/link'
import Image from 'next/image'

const LAST_UPDATED = '25 March 2026'
const EFFECTIVE    = '1 January 2026'

const sections = [
  {
    id: '1', title: 'Introduction',
    content: `These Terms of Service ("Terms") govern your access to and use of the Crater SDA Welfare Society digital platform ("Platform"), operated by Crater SDA Welfare Society ("Society", "we", "us", or "our"), a member-owned welfare society registered and operating in Nakuru, Kenya.\n\nBy activating your member account, logging in, or using any part of the Platform, you agree to be bound by these Terms. If you do not agree, you must not use the Platform.`,
  },
  {
    id: '2', title: 'Eligibility & Membership',
    items: [
      'The Platform is exclusively available to active members of Crater Seventh Day Adventist Church Nakuru, registered beneficiaries of enrolled members, and authorised administrative staff (Super Admin, Treasurer, Secretary).',
      'Member accounts are created solely by authorised administrators. Self-registration is not permitted.',
      'You must be at least 18 years of age to hold a principal member account.',
      "Membership is subject to the Society's constitution and by-laws, which take precedence over these Terms in all matters of governance.",
    ],
  },
  {
    id: '3', title: 'Account Responsibilities',
    items: [
      'You are responsible for maintaining the confidentiality of your login credentials.',
      'You must not share your password or allow any other person to access your account.',
      'You must notify the Society administrator immediately if you suspect unauthorised access to your account.',
      'All actions performed under your account — including payment initiations, claim submissions and profile updates — are deemed to have been performed by you.',
      'Admin accounts are protected by two-factor authentication (2FA). You must not attempt to bypass or disable this security measure.',
    ],
  },
  {
    id: '4', title: 'Contributions & Payments',
    items: [
      'Members are obligated to pay contributions as stipulated in the Society\'s schedule of fees: Registration Fee KES 500 (once-off upon joining), Family Membership KES 6,000 per year (minimum 3 months upfront), Single Membership KES 2,400 per year (minimum 3 months upfront).',
      'Payments are processed via M-Pesa (STK Push or Paybill). The Society does not accept cash payments through the Platform.',
      'It is your responsibility to ensure sufficient M-Pesa balance before initiating a payment. The Society is not liable for failed transactions due to insufficient funds or network errors.',
      "Payment records displayed on the Platform are sourced from M-Pesa transaction confirmations. In the event of a discrepancy, the Society's treasurer records shall be the authoritative reference.",
      "Contributions are non-refundable except where expressly provided for in the Society's constitution.",
      "Members in arrears for more than three (3) consecutive months may have their welfare benefits suspended until arrears are cleared, as determined by the Society's committee.",
    ],
  },
  {
    id: '5', title: 'Claims & Benefits',
    items: [
      'The following welfare benefits are available to eligible members: Death Benefits (for principal members and registered next-of-kin), Medical Claims (financial assistance for hospitalisation and treatment, subject to committee approval), and Educational Support (bursaries and grants for members\' children, subject to availability and committee approval).',
      'All claims must be submitted through the Platform and supported by valid documentation (e.g. death certificate, hospital invoices, school fee statements).',
      'Supporting documents uploaded to the Platform are stored securely via Cloudinary. You warrant that all documents submitted are genuine and unaltered.',
      'Submitting false, fraudulent or misleading claims is a serious breach of these Terms and may result in immediate membership termination, forfeiture of all benefits, and referral to relevant authorities.',
      "Claims are subject to review and approval by the Society's committee. The Society reserves the right to request additional documentation or reject claims that do not meet eligibility criteria.",
      "Approved claim disbursements will be made to the bank account or M-Pesa number registered on the member's profile. It is the member's responsibility to keep payment details current and accurate.",
      'The Society targets claim processing within five (5) working days of receiving complete documentation, but this is a target and not a guarantee.',
    ],
  },
  {
    id: '6', title: 'Beneficiary Registration',
    items: [
      'Members may register beneficiaries (next-of-kin and dependants) on the Platform.',
      "It is the member's sole responsibility to keep beneficiary records accurate and up to date.",
      'The Society shall not be liable for misdirected benefits resulting from outdated or incorrect beneficiary information.',
    ],
  },
  {
    id: '7', title: 'Acceptable Use',
    content: 'You agree not to:',
    items: [
      'Use the Platform for any unlawful purpose or in violation of Kenyan law.',
      "Attempt to gain unauthorised access to other members' accounts or data.",
      'Upload malicious files, viruses or any content intended to harm the Platform or its users.',
      'Scrape, copy or reproduce Platform data without written authorisation from the Society.',
      'Impersonate another member, beneficiary or administrator.',
      'Interfere with or disrupt the integrity or performance of the Platform.',
    ],
  },
  {
    id: '8', title: 'Platform Availability',
    items: [
      'The Society endeavours to maintain Platform availability but does not guarantee uninterrupted access.',
      'Scheduled maintenance, updates or unforeseen technical issues may cause temporary unavailability.',
      'The Society shall not be liable for any loss arising from Platform downtime.',
    ],
  },
  {
    id: '9', title: 'Intellectual Property',
    items: [
      'All content on the Platform — including design, text, logos and software — is owned by or licensed to the Society.',
      'You may not reproduce, distribute or create derivative works from Platform content without written permission.',
    ],
  },
  {
    id: '10', title: 'Termination',
    items: [
      'The Society may suspend or terminate your account for: breach of these Terms, non-payment of contributions for more than six (6) months, fraudulent activity, or voluntary resignation from the Society.',
      'Upon termination, your access to the Platform will be revoked immediately.',
      'Termination does not affect any rights or obligations that arose prior to termination.',
    ],
  },
  {
    id: '11', title: 'Limitation of Liability',
    items: [
      "To the maximum extent permitted by Kenyan law, the Society shall not be liable for any indirect, incidental or consequential loss arising from your use of the Platform.",
      "The Society's total liability in any matter shall not exceed the total contributions paid by you in the twelve (12) months preceding the event giving rise to the claim.",
    ],
  },
  {
    id: '12', title: 'Governing Law & Disputes',
    items: [
      'These Terms are governed by the laws of the Republic of Kenya.',
      "Any dispute arising from these Terms shall first be referred to the Society's committee for resolution.",
      'If unresolved, disputes shall be submitted to mediation before the Nairobi Centre for International Arbitration (NCIA) or a mutually agreed mediator.',
      'Courts of competent jurisdiction in Nakuru County shall have final jurisdiction.',
    ],
  },
  {
    id: '13', title: 'Changes to These Terms',
    content: "The Society reserves the right to update these Terms at any time. Members will be notified of material changes via the Platform and/or M-Pesa-linked phone number. Continued use of the Platform after notification constitutes acceptance.",
  },
  {
    id: '14', title: 'Contact',
    content: 'For questions regarding these Terms, contact your Society administrator or write to: Crater SDA Welfare Society, Crater SDA Church, Nakuru, Kenya. Email: doanemusa561@gmail.com',
  },
]

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
  .legal-title {
    font-family: Georgia, serif; font-size: clamp(28px, 5vw, 42px);
    font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 12px;
  }
  .legal-meta { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 48px; }
  .legal-meta span { color: #f5c842; }

  .legal-toc {
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    border-radius: 14px; padding: 24px 28px; margin-bottom: 48px;
  }
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
  .legal-list li {
    font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.8;
    padding-left: 20px; position: relative;
  }
  .legal-list li::before {
    content: ''; position: absolute; left: 0; top: 10px;
    width: 5px; height: 5px; border-radius: 50%; background: #e6b020;
  }

  .back-link {
    display: inline-flex; align-items: center; gap: 8px;
    color: rgba(255,255,255,0.4); font-size: 13px; text-decoration: none;
    margin-bottom: 40px; transition: color 0.15s;
  }
  .back-link:hover { color: #f5c842; }

  @media (max-width: 600px) {
    .legal-wrap { padding: 32px 20px 72px; }
  }
`

export default function TermsPage() {
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

        <div className="legal-badge">📄 Legal Document</div>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">
          Effective: <span>{EFFECTIVE}</span> &nbsp;·&nbsp; Last Updated: <span>{LAST_UPDATED}</span>
        </p>

        {/* TOC */}
        <div className="legal-toc">
          <div className="legal-toc-title">Table of Contents</div>
          <ol>
            {sections.map(s => (
              <li key={s.id}><a href={`#s${s.id}`}>{s.id}. {s.title}</a></li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        {sections.map(s => (
          <div key={s.id} id={`s${s.id}`} className="legal-section">
            <div className="legal-section-num">Section {s.id}</div>
            <div className="legal-section-title">{s.title}</div>
            {s.content && <p className="legal-p">{s.content}</p>}
            {s.items && (
              <ul className="legal-list">
                {s.items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} Crater SDA Welfare Society · Nakuru, Kenya
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
          <Link href="/legal/terms"    style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/legal/privacy"  style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/legal/cookies"  style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Cookie Policy</Link>
        </div>
      </div>
    </div>
  )
}
