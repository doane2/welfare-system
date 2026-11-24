'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Send, CheckCircle2 } from 'lucide-react'
import { submitContact } from '../../lib/api'

const TOPICS = [
  { value: 'MEMBERSHIP',    label: 'Joining the society' },
  { value: 'CONTRIBUTIONS', label: 'Contributions and payments' },
  { value: 'CLAIMS',        label: 'Claims and benefits' },
  { value: 'LOANS',         label: 'Loans' },
  { value: 'SUPPORT',       label: 'Help with my account' },
  { value: 'OTHER',         label: 'Something else' },
]

const EMPTY = { fullName: '', phone: '', email: '', inquiryType: 'MEMBERSHIP', message: '', website: '' }

export default function ContactForm() {
  const [form, setForm]       = useState({ ...EMPTY })
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  const set = (k: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const phone = form.phone.replace(/[\s()-]/g, '')
    if (form.fullName.trim().length < 2) { toast.error('Enter your full name'); return }
    if (!/^\+?\d{9,15}$/.test(phone)) { toast.error('Enter a valid phone number, e.g. 0712 345 678'); return }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error('Enter a valid email or leave it blank'); return }
    if (form.message.trim().length < 10) { toast.error('Write a short message (at least 10 characters)'); return }

    setSending(true)
    try {
      await submitContact({ ...form, phone })
      setSent(true)
      setForm({ ...EMPTY })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="cf-card cf-success" role="status">
        <CheckCircle2 size={44} color="#16a34a" />
        <h3>Message sent</h3>
        <p>Thank you. An administrator will contact you on the phone number you gave us.</p>
        <button className="cf-submit" onClick={() => setSent(false)} type="button">Send another message</button>
      </div>
    )
  }

  return (
    <form className="cf-card" onSubmit={submit} noValidate>
      <h3 className="cf-title">Send us a message</h3>
      <p className="cf-sub">Fill in your details and we will get back to you.</p>

      <div className="cf-row">
        <div className="cf-field">
          <label className="cf-label" htmlFor="cf-name">Full name</label>
          <input id="cf-name" className="cf-input" value={form.fullName} onChange={set('fullName')} placeholder="e.g. Jane Wanjiru" autoComplete="name" maxLength={100} />
        </div>
        <div className="cf-field">
          <label className="cf-label" htmlFor="cf-phone">Phone number</label>
          <input id="cf-phone" className="cf-input" value={form.phone} onChange={set('phone')} placeholder="0712 345 678" autoComplete="tel" inputMode="tel" />
        </div>
      </div>

      <div className="cf-row">
        <div className="cf-field">
          <label className="cf-label" htmlFor="cf-email">Email <span>(optional)</span></label>
          <input id="cf-email" type="email" className="cf-input" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" maxLength={150} />
        </div>
        <div className="cf-field">
          <label className="cf-label" htmlFor="cf-topic">What is this about?</label>
          <select id="cf-topic" className="cf-input" value={form.inquiryType} onChange={set('inquiryType')}>
            {TOPICS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="cf-field">
        <label className="cf-label" htmlFor="cf-msg">Your message</label>
        <textarea id="cf-msg" className="cf-input" rows={5} value={form.message} onChange={set('message')} placeholder="How can we help?" maxLength={2000} />
        <div className="cf-count">{form.message.length}/2000</div>
      </div>

      {/* Honeypot: hidden from people, bots fill it in */}
      <div className="cf-hp" aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
      </div>

      <button className="cf-submit" type="submit" disabled={sending}>
        {sending ? 'Sending...' : <>Send message <Send size={16} /></>}
      </button>
    </form>
  )
}