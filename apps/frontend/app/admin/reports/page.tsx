'use client'
import { useEffect, useState, useCallback } from 'react'
import api        from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import toast      from 'react-hot-toast'

type Tab = 'annual' | 'members' | 'financial'

// ─── Year range: 2026 is the fixed earliest, auto-expands every January ───────
const START_YEAR   = 2026
const CY           = new Date().getFullYear()
const EFFECTIVE_CY = Math.max(CY, START_YEAR)
const YEARS        = Array.from({ length: EFFECTIVE_CY - START_YEAR + 1 }, (_, i) => START_YEAR + i)

const SC: Record<string, { label: string; color: string; bg: string }> = {
  GOOD:      { label: 'Good',      color: '#15803d', bg: '#dcfce7' },
  WARNING:   { label: 'Warning',   color: '#b45309', bg: '#fef3c7' },
  SUSPENDED: { label: 'Suspended', color: '#b91c1c', bg: '#fee2e2' },
}
const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString()}`

// ─── Official logo — raw JPEG base64 for jsPDF addImage() ────────────────────
// LOGO_DATA_URI is used for <img> tags only (Next.js needs the data: prefix).
const LOGO_BASE64 = `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`

const LOGO_DATA_URI = `data:image/jpeg;base64,${LOGO_BASE64}`

// ─── Shared PDF helpers ───────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color = '#1e3a6e', bg = '#eef2ff' }: any) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'Georgia,serif', fontSize: 20, fontWeight: 700, color, marginBottom: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8' }}>{sub}</div>}
    </div>
  )
}

async function getPDF() {
  const { jsPDF }  = await import('jspdf')
  const autoTable  = (await import('jspdf-autotable')).default
  const doc        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW      = doc.internal.pageSize.getWidth()
  const pageH      = doc.internal.pageSize.getHeight()
  return { doc, autoTable, pageW, pageH }
}

// Header: logo left, org name + title, period badge right
function addHeader(doc: any, pageW: number, title: string, subtitle: string, year: number) {
  const margin = 14
  // Navy background
  doc.setFillColor(10, 25, 52); doc.rect(0, 0, pageW, 52, 'F')
  // Gold left bar
  doc.setFillColor(230, 176, 32); doc.rect(0, 0, 4, 52, 'F')
  // Official logo
  doc.addImage(LOGO_BASE64, 'JPEG', 8, 5, 22, 22)
  // Org name
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('CRATER SDA WELFARE SOCIETY', 35, 16)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 200, 230)
  doc.text('Nakuru, Kenya  ·  Est. 2016  ·  Confidential', 35, 23)
  doc.setDrawColor(230, 176, 32); doc.setLineWidth(0.4); doc.line(35, 27, pageW - margin, 27)
  doc.setTextColor(245, 200, 66); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  doc.text(title.toUpperCase(), 35, 34)
  doc.setTextColor(160, 185, 215); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 35, 41)
  // Year badge
  doc.setFillColor(230, 176, 32); doc.roundedRect(pageW - 34, 8, 20, 12, 2, 2, 'F')
  doc.setTextColor(10, 25, 52); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  doc.text(String(year), pageW - 24, 16, { align: 'center' })
}

// Footer: CONFIDENTIAL watermark + gold line + text footer + logo right
function addFooter(doc: any, pageW: number, pageH: number) {
  const margin = 14
  const total  = (doc as any).internal.getNumberOfPages()
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg)
    // Diagonal CONFIDENTIAL watermark
    doc.setFontSize(42); doc.setFont('helvetica', 'bold'); doc.setTextColor(232, 235, 243)
    doc.text('CONFIDENTIAL', pageW / 2, pageH / 2, { align: 'center', angle: 45 })
    // Gold footer line
    doc.setDrawColor(230, 176, 32); doc.setLineWidth(0.4)
    doc.line(margin, pageH - 18, pageW - margin, pageH - 18)
    // Row 1 — left: disclaimer | right: page number
    doc.setFontSize(6.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(130, 145, 165)
    doc.text('CONFIDENTIAL — Computer-generated report. For queries contact the Welfare Administrator.', margin, pageH - 13)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${pg} / ${total}`, pageW - margin - 14, pageH - 13, { align: 'right' })
    // Row 2 — left: org name | right: logo
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 110)
    doc.text('Crater SDA Welfare Society  ·  Nakuru, Kenya  ·  Est. 2016', margin, pageH - 7)
    // Logo pinned to right of footer
    doc.addImage(LOGO_BASE64, 'JPEG', pageW - margin - 12, pageH - 19, 12, 12)
  }
}

// ─── Page component ───────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const { user }                            = useAuth()
  const [tab,           setTab]             = useState<Tab>('annual')
  const [year,          setYear]            = useState(EFFECTIVE_CY)
  const [annualData,    setAnnualData]      = useState<any>(null)
  const [membersData,   setMembersData]     = useState<any>(null)
  const [financialData, setFinancialData]   = useState<any>(null)
  const [loading,       setLoading]         = useState(false)
  const [exporting,     setExporting]       = useState(false)

  const role         = user?.role || ''
  const canAnnual    = ['SUPER_ADMIN', 'TREASURER', 'SECRETARY'].includes(role)
  const canMembers   = ['SUPER_ADMIN', 'SECRETARY'].includes(role)
  const canFinancial = ['SUPER_ADMIN', 'TREASURER'].includes(role)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      if (tab === 'annual'    && canAnnual)    { const { data } = await api.get(`/reports/annual?year=${year}`);    setAnnualData(data)    }
      else if (tab === 'members'   && canMembers)   { const { data } = await api.get(`/reports/members?year=${year}`);   setMembersData(data)   }
      else if (tab === 'financial' && canFinancial) { const { data } = await api.get(`/reports/financial?year=${year}`); setFinancialData(data) }
    } catch (e: any) {
      console.error('Report error:', e?.response?.data || e?.message)
      toast.error(`Failed to load ${tab} report`)
    } finally { setLoading(false) }
  }, [tab, year, user, canAnnual, canMembers, canFinancial])

  useEffect(() => { if (user) load() }, [load, user])

  // ── Annual PDF ──────────────────────────────────────────────────────────────
  const downloadAnnual = async () => {
    if (!annualData) return; setExporting(true)
    try {
      const { doc, autoTable, pageW, pageH } = await getPDF()
      const d = annualData; const margin = 14
      addHeader(doc, pageW, 'Annual Financial Report', `Fiscal Year ${year}  ·  Generated ${new Date().toLocaleDateString('en-KE')}`, year)
      let y = 54

      const kpis = [
        { label: 'Contributions Collected', value: fmt(d.contributions.total),    color: [21, 128, 61]   as [number, number, number] },
        { label: 'Expected',                value: fmt(d.contributions.expected), color: [30, 58, 110]   as [number, number, number] },
        { label: 'Arrears (Uncollected)',   value: fmt(d.contributions.arrears),  color: [180, 83, 9]    as [number, number, number] },
        { label: 'Claims Paid Out',         value: fmt(d.claims.approvedAmount),  color: [124, 58, 237]  as [number, number, number] },
        { label: 'Loans Disbursed',         value: fmt(d.loans.disbursed),        color: [3, 105, 161]   as [number, number, number] },
        { label: 'Net Balance',             value: fmt(d.financials.netBalance),  color: (d.financials.netBalance >= 0 ? [21, 128, 61] : [220, 38, 38]) as [number, number, number] },
      ]
      const kW = (pageW - margin * 2) / 3; const kH = 18
      kpis.forEach((k, i) => {
        const col = i % 3; const row = Math.floor(i / 3)
        const kx = margin + col * kW; const ky = y + row * (kH + 3)
        doc.setFillColor(248, 250, 252); doc.roundedRect(kx, ky, kW - 2, kH, 2, 2, 'F')
        doc.setDrawColor(210, 220, 235); doc.setLineWidth(0.2); doc.roundedRect(kx, ky, kW - 2, kH, 2, 2, 'S')
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 135, 155)
        doc.text(k.label.toUpperCase(), kx + (kW - 2) / 2, ky + 5.5, { align: 'center' })
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(k.color[0], k.color[1], k.color[2])
        doc.text(k.value, kx + (kW - 2) / 2, ky + 13, { align: 'center' })
      })
      y += kH * 2 + 14

      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 110)
      doc.text('MEMBERSHIP', margin, y)
      doc.setDrawColor(230, 176, 32); doc.setLineWidth(0.5); doc.line(margin, y + 1.5, margin + 28, y + 1.5)
      autoTable(doc, {
        startY: y + 4,
        head: [['Category', 'Count']],
        body: [['Total members', d.members.total], ['Active', d.members.active], ['Single', d.members.single], ['Family', d.members.family], ['Good standing', d.members.standing.good], ['Warning', d.members.standing.warning], ['Suspended', d.members.standing.suspended]],
        theme: 'grid', headStyles: { fillColor: [10, 25, 52], textColor: 255, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 }, bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85], cellPadding: 3 }, alternateRowStyles: { fillColor: [248, 250, 252] }, tableWidth: 60, margin: { left: margin, right: pageW - margin - 60 },
      })

      const ctY = ((doc as any).lastAutoTable?.finalY || y + 50) + 8
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 110)
      doc.text('CONTRIBUTIONS BY TYPE', margin, ctY)
      doc.setDrawColor(230, 176, 32); doc.setLineWidth(0.5); doc.line(margin, ctY + 1.5, margin + 50, ctY + 1.5)
      autoTable(doc, {
        startY: ctY + 4,
        head: [['Type', 'Amount (KES)']],
        body: [['Monthly', d.contributions.monthly.toLocaleString()], ['Emergency', d.contributions.emergency.toLocaleString()], ['Registration', d.contributions.registration.toLocaleString()], ['TOTAL', d.contributions.total.toLocaleString()]],
        theme: 'grid', headStyles: { fillColor: [10, 25, 52], textColor: 255, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 }, bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85], cellPadding: 3 }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }, margin: { left: margin, right: margin },
      })

      const clY = ((doc as any).lastAutoTable?.finalY || ctY + 50) + 8
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 110)
      doc.text('CLAIMS', margin, clY)
      doc.setDrawColor(230, 176, 32); doc.setLineWidth(0.5); doc.line(margin, clY + 1.5, margin + 18, clY + 1.5)
      autoTable(doc, {
        startY: clY + 4,
        head: [['Category', 'Claims', 'Amount Paid (KES)']],
        body: [...d.claims.byCategory.map((c: any) => [c.type, c.count, c.amount.toLocaleString()]), ['TOTAL', d.claims.total, d.claims.approvedAmount.toLocaleString()]],
        theme: 'grid', headStyles: { fillColor: [10, 25, 52], textColor: 255, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 }, bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85], cellPadding: 3 }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } }, margin: { left: margin, right: margin },
      })

      const lnY = ((doc as any).lastAutoTable?.finalY || clY + 50) + 8
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 110)
      doc.text('LOANS', margin, lnY)
      doc.setDrawColor(230, 176, 32); doc.setLineWidth(0.5); doc.line(margin, lnY + 1.5, margin + 16, lnY + 1.5)
      autoTable(doc, {
        startY: lnY + 4,
        head: [['Status', 'Count', 'Amount (KES)']],
        body: [['Approved', d.loans.approved, d.loans.disbursed.toLocaleString()], ['Pending', d.loans.pending, '—'], ['Rejected', d.loans.rejected, '—'], ['Paid', d.loans.paid, d.loans.repaid.toLocaleString()], ['Outstanding', '—', d.loans.outstanding.toLocaleString()]],
        theme: 'grid', headStyles: { fillColor: [10, 25, 52], textColor: 255, fontSize: 7.5, fontStyle: 'bold', cellPadding: 3 }, bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85], cellPadding: 3 }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } }, margin: { left: margin, right: margin },
      })

      // Financial position summary banner
      const nbY = ((doc as any).lastAutoTable?.finalY || lnY + 50) + 10
      doc.setFillColor(10, 25, 52); doc.roundedRect(margin, nbY, pageW - margin * 2, 26, 3, 3, 'F')
      doc.setFillColor(230, 176, 32); doc.rect(margin, nbY, 4, 26, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
      doc.text(`FISCAL YEAR ${year} — FINANCIAL POSITION`, margin + 8, nbY + 8)
      const finRows = [
        { l: 'Income (Contributions)',       v: fmt(d.financials.totalIncome)   },
        { l: 'Expenditure (Claims + Loans)', v: fmt(d.financials.totalExpenses) },
        { l: 'Net Balance',                  v: fmt(d.financials.netBalance)    },
      ]
      finRows.forEach((row, i) => {
        const isNet = i === 2; const positive = d.financials.netBalance >= 0
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 200, 230)
        doc.text(row.l, margin + 8, nbY + 14 + i * 4.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(isNet ? (positive ? 110 : 220) : 255, isNet ? (positive ? 231 : 38) : 255, isNet ? (positive ? 183 : 38) : 255)
        doc.text(row.v, pageW - margin - 4, nbY + 14 + i * 4.5, { align: 'right' })
      })

      addFooter(doc, pageW, pageH)
      doc.save(`CraterSDA_AnnualReport_${year}.pdf`)
      toast.success('Annual report downloaded!')
    } catch (e) { console.error(e); toast.error('PDF generation failed') }
    finally { setExporting(false) }
  }

  // ── Members PDF ─────────────────────────────────────────────────────────────
  const downloadMembers = async () => {
    if (!membersData) return; setExporting(true)
    try {
      const { doc, autoTable, pageW, pageH } = await getPDF()
      const d = membersData; const margin = 14
      addHeader(doc, pageW, 'Member Directory', `${d.total} registered members  ·  Year ${year}  ·  ${new Date().toLocaleDateString('en-KE')}`, year)
      let y = 54

      const sums = [
        { label: 'Total',     value: d.total,                                                        color: [30, 58, 110]   as [number, number, number] },
        { label: 'Good',      value: d.members.filter((m: any) => m.standing === 'GOOD').length,     color: [21, 128, 61]   as [number, number, number] },
        { label: 'Warning',   value: d.members.filter((m: any) => m.standing === 'WARNING').length,  color: [180, 83, 9]    as [number, number, number] },
        { label: 'Suspended', value: d.members.filter((m: any) => m.standing === 'SUSPENDED').length,color: [220, 38, 38]   as [number, number, number] },
        { label: 'Deceased',  value: d.members.filter((m: any) => m.isDeceased).length,              color: [100, 116, 139] as [number, number, number] },
      ]
      const sW = (pageW - margin * 2) / sums.length
      sums.forEach((s, i) => {
        const sx = margin + i * sW
        doc.setFillColor(248, 250, 252); doc.roundedRect(sx, y, sW - 2, 16, 2, 2, 'F')
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 135, 155)
        doc.text(s.label.toUpperCase(), sx + (sW - 2) / 2, y + 5.5, { align: 'center' })
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(s.color[0], s.color[1], s.color[2])
        doc.text(String(s.value), sx + (sW - 2) / 2, y + 13, { align: 'center' })
      })
      y += 22

      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 110)
      doc.text('COMPLETE MEMBER REGISTRY', margin, y)
      doc.setDrawColor(230, 176, 32); doc.setLineWidth(0.5); doc.line(margin, y + 1.5, margin + 52, y + 1.5)
      autoTable(doc, {
        startY: y + 5,
        head: [['#', 'Full Name', 'Member No.', 'Type', 'Phone', 'Group', 'Annual Rate', 'Paid', 'Arrears', 'Standing', 'Status']],
        body: d.members.map((m: any, i: number) => [
          i + 1, m.isDeceased ? `${m.fullName} ⚫` : m.fullName,
          m.memberNumber, m.memberType, m.phone || '—', m.group || '—',
          `KES ${m.annualRate.toLocaleString()}`, `KES ${m.annualPaid.toLocaleString()}`,
          m.arrearsBalance > 0 ? `KES ${m.arrearsBalance.toLocaleString()}` : '—',
          m.standing, m.isDeceased ? 'DECEASED' : m.isActive ? 'Active' : 'Inactive',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [10, 25, 52], textColor: 255, fontSize: 6.5, fontStyle: 'bold', cellPadding: 2.5 },
        bodyStyles: { fontSize: 6.5, textColor: [51, 65, 85], cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'center' }, 10: { halign: 'center' } },
        margin: { left: margin, right: margin },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 9) {
            const s = String(data.cell.raw)
            if (s === 'GOOD')      data.cell.styles.textColor = [21, 128, 61]
            if (s === 'WARNING')   data.cell.styles.textColor = [180, 83, 9]
            if (s === 'SUSPENDED') data.cell.styles.textColor = [220, 38, 38]
          }
          if (data.section === 'body' && data.column.index === 10 && data.cell.raw === 'DECEASED')
            data.cell.styles.textColor = [100, 116, 139]
        },
      })
      addFooter(doc, pageW, pageH)
      doc.save(`CraterSDA_MemberDirectory_${year}.pdf`)
      toast.success('Member directory downloaded!')
    } catch (e) { console.error(e); toast.error('PDF failed') }
    finally { setExporting(false) }
  }

  // ── Financial PDF ───────────────────────────────────────────────────────────
  const downloadFinancial = async () => {
    if (!financialData) return; setExporting(true)
    try {
      const { doc, autoTable, pageW, pageH } = await getPDF()
      const d = financialData; const margin = 14
      addHeader(doc, pageW, 'Financial Receipts Report', `${d.totalPayments} approved payments  ·  Year ${year}  ·  ${new Date().toLocaleDateString('en-KE')}`, year)
      let y = 54

      const sums = [
        { label: 'Total Payments', value: String(d.totalPayments), color: [30, 58, 110] as [number, number, number] },
        { label: 'Total Amount',   value: fmt(d.totalAmount),      color: [21, 128, 61] as [number, number, number] },
        ...d.byMethod.map((m: any) => ({ label: m.method, value: fmt(m.amount), color: [3, 105, 161] as [number, number, number] })),
      ]
      const sW = (pageW - margin * 2) / sums.length
      sums.forEach((s, i) => {
        const sx = margin + i * sW
        doc.setFillColor(248, 250, 252); doc.roundedRect(sx, y, sW - 2, 16, 2, 2, 'F')
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 135, 155)
        doc.text(s.label.toUpperCase(), sx + (sW - 2) / 2, y + 5.5, { align: 'center' })
        doc.setFontSize(s.value.length > 10 ? 8 : 10); doc.setFont('helvetica', 'bold'); doc.setTextColor(s.color[0], s.color[1], s.color[2])
        doc.text(s.value, sx + (sW - 2) / 2, y + 13, { align: 'center' })
      })
      y += 22

      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 110)
      doc.text('PAYMENT LEDGER', margin, y)
      doc.setDrawColor(230, 176, 32); doc.setLineWidth(0.5); doc.line(margin, y + 1.5, margin + 36, y + 1.5)
      autoTable(doc, {
        startY: y + 5,
        head: [['Receipt No.', 'Member', 'Member No.', 'Period', 'Method', 'M-Pesa Ref', 'Amount (KES)', 'Date']],
        body: d.payments.map((p: any) => [
          p.receiptNumber, p.member?.fullName || '—', p.member?.memberNumber || '—',
          p.period || '—', p.method, p.mpesaRef || '—',
          Number(p.amount).toLocaleString(),
          new Date(p.approvedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [10, 25, 52], textColor: 255, fontSize: 6.5, fontStyle: 'bold', cellPadding: 2.5 },
        bodyStyles: { fontSize: 6.5, textColor: [51, 65, 85], cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 6: { halign: 'right', fontStyle: 'bold' }, 0: { fontStyle: 'bold', textColor: [30, 58, 110] } },
        margin: { left: margin, right: margin },
      })
      addFooter(doc, pageW, pageH)
      doc.save(`CraterSDA_FinancialReport_${year}.pdf`)
      toast.success('Financial report downloaded!')
    } catch (e) { console.error(e); toast.error('PDF failed') }
    finally { setExporting(false) }
  }

  const tabs = [
    canAnnual    && { key: 'annual'    as Tab, label: '📊 Annual Report'      },
    canMembers   && { key: 'members'   as Tab, label: '👥 Member Directory'   },
    canFinancial && { key: 'financial' as Tab, label: '💳 Financial Receipts' },
  ].filter(Boolean) as { key: Tab; label: string }[]

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: '#0f2040', marginBottom: 4 }}>Reports & Analytics</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>Real-time data · {year} fiscal year · Downloadable PDF reports</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Year selector — auto-expanding from 2026 */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', fontWeight: 600, color: '#0f2040', outline: 'none' }}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => load()} style={{ padding: '9px 16px', borderRadius: 9, background: '#eef2ff', color: '#1e3a6e', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          {tab === 'annual'    && annualData    && <button onClick={downloadAnnual}    disabled={exporting} style={{ padding: '9px 20px', borderRadius: 9, background: '#0f2040', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{exporting ? '...' : '⬇ PDF'}</button>}
          {tab === 'members'   && membersData   && <button onClick={downloadMembers}   disabled={exporting} style={{ padding: '9px 20px', borderRadius: 9, background: '#0f2040', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{exporting ? '...' : '⬇ PDF'}</button>}
          {tab === 'financial' && financialData && <button onClick={downloadFinancial} disabled={exporting} style={{ padding: '9px 20px', borderRadius: 9, background: '#0f2040', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{exporting ? '...' : '⬇ PDF'}</button>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, background: '#f1f5f9', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 28 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', borderRadius: 9, fontSize: 13, fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
            background: tab === t.key ? '#fff' : 'transparent',
            color: tab === t.key ? '#0f2040' : '#94a3b8',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[120, 80, 200].map((h, i) => <div key={i} style={{ height: h, background: '#f1f5f9', borderRadius: 14, animation: 'pulse 1.5s ease infinite' }} />)}
        </div>
      )}

      {/* ── ANNUAL ── */}
      {!loading && tab === 'annual' && annualData && (() => {
        const d = annualData
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Contributions — {year}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                <KpiCard label="Total collected"     value={fmt(d.contributions.total)}   sub={`${d.contributions.collectionRate}% collection rate`} icon="💰" color="#15803d" bg="#dcfce7" />
                <KpiCard label="Monthly"             value={fmt(d.contributions.monthly)}  sub="Core welfare"                icon="📅" color="#1e3a6e" bg="#eef2ff" />
                <KpiCard label="Expected total"      value={fmt(d.contributions.expected)} sub="All members × annual rate"   icon="🎯" color="#0369a1" bg="#e0f2fe" />
                <KpiCard label="Uncollected arrears" value={fmt(d.contributions.arrears)}  sub="Outstanding from members"    icon="⚠️" color="#b45309" bg="#fef3c7" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Claims</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <KpiCard label="Total claims"    value={d.claims.total}              sub={`${d.claims.pending} pending`} icon="🏥" color="#7c3aed" bg="#f5f3ff" />
                  <KpiCard label="Approved"        value={d.claims.approved}            sub={fmt(d.claims.approvedAmount)} icon="✅" color="#15803d" bg="#dcfce7" />
                  <KpiCard label="Rejected"        value={d.claims.rejected}            sub="Not approved"                 icon="❌" color="#b91c1c" bg="#fee2e2" />
                  <KpiCard label="Amount paid out" value={fmt(d.claims.approvedAmount)} sub="Total disbursed"              icon="💸" color="#7c3aed" bg="#f5f3ff" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Loans</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <KpiCard label="Total loans" value={d.loans.total}            sub={`${d.loans.pending} pending`}   icon="🏦" color="#0369a1" bg="#e0f2fe" />
                  <KpiCard label="Disbursed"   value={fmt(d.loans.disbursed)}   sub={`${d.loans.approved} approved`} icon="💳" color="#15803d" bg="#dcfce7" />
                  <KpiCard label="Repaid"      value={fmt(d.loans.repaid)}      sub="Recovered"                      icon="↩️" color="#0369a1" bg="#e0f2fe" />
                  <KpiCard label="Outstanding" value={fmt(d.loans.outstanding)} sub="Still to repay"                 icon="⏳" color="#b45309" bg="#fef3c7" />
                </div>
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#0f2040,#1e3a6e)', borderRadius: 16, padding: '20px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Financial position — {year}</div>
                <div style={{ display: 'flex', gap: 36 }}>
                  {[
                    { l: 'Income',      v: fmt(d.financials.totalIncome),   c: '#6ee7b7' },
                    { l: 'Expenditure', v: fmt(d.financials.totalExpenses), c: '#fca5a5' },
                    { l: 'Net Balance', v: fmt(d.financials.netBalance),    c: d.financials.netBalance >= 0 ? '#6ee7b7' : '#fca5a5' },
                  ].map(r => (
                    <div key={r.l}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{r.l}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: r.c }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 44 }}>{d.financials.netBalance >= 0 ? '📈' : '📉'}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 16 }}>Claims spending by category</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {d.claims.byCategory.map((c: any) => (
                  <div key={c.type} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{c.type}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f2040', marginBottom: 2 }}>{c.count} claims</div>
                    <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>{fmt(c.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 16 }}>Monthly contributions — {year}</div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 90 }}>
                {d.contributions.monthlyBreakdown.map((m: any) => {
                  const maxV = Math.max(...d.contributions.monthlyBreakdown.map((x: any) => x.amount), 1)
                  const pct  = maxV > 0 ? (m.amount / maxV) * 100 : 0
                  return (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{m.amount > 0 ? `${Math.round(m.amount / 1000)}k` : ''}</div>
                      <div style={{ width: '100%', height: `${Math.max(4, pct)}%`, background: pct > 0 ? '#1e3a6e' : '#f1f5f9', borderRadius: '3px 3px 0 0', minHeight: 4 }} />
                      <div style={{ fontSize: 9, color: '#94a3b8' }}>{m.month}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0f2040', marginBottom: 16 }}>Welfare standing — {year}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  // Put the spread FIRST, then the specific label SECOND to overwrite it
{ ...SC.GOOD,      label: 'Good Standing', value: d.members.standing.good    },
{ ...SC.WARNING,   label: 'Warning',       value: d.members.standing.warning },
{ ...SC.SUSPENDED, label: 'Suspended',     value: d.members.standing.suspended },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px', border: `1px solid ${s.color}30` }}>
                    <div style={{ fontSize: 11, color: s.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: s.color, opacity: 0.7 }}>of {d.members.total} members</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── MEMBER DIRECTORY ── */}
      {!loading && tab === 'members' && membersData && (() => {
        const d = membersData
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 20 }}>
              <KpiCard label="Total"         value={d.total}                                                           sub={`${year} directory`} icon="👥" color="#1e3a6e" bg="#eef2ff" />
              <KpiCard label="Good standing" value={d.members.filter((m: any) => m.standing === 'GOOD').length}        icon="✅" color="#15803d" bg="#dcfce7" />
              <KpiCard label="Warning"       value={d.members.filter((m: any) => m.standing === 'WARNING').length}     icon="⚠️" color="#b45309" bg="#fef3c7" />
              <KpiCard label="Suspended"     value={d.members.filter((m: any) => m.standing === 'SUSPENDED').length}   icon="🚫" color="#b91c1c" bg="#fee2e2" />
              <KpiCard label="Deceased"      value={d.members.filter((m: any) => m.isDeceased).length}                 icon="⚫" color="#64748b" bg="#f1f5f9" />
            </div>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['#', 'Member', 'Member No.', 'Type', 'Phone', 'Group', 'Annual Rate', 'Paid', 'Arrears', 'Standing', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 13px', fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {d.members.map((m: any, i: number) => {
                    const sc = SC[m.standing] || SC.GOOD
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: m.isDeceased ? 0.6 : 1 }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <td style={{ padding: '11px 13px', color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: '11px 13px' }}>
                          <div style={{ fontWeight: 600, color: m.isDeceased ? '#94a3b8' : '#0f2040' }}>{m.isDeceased && '⚫ '}{m.fullName}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.email}</div>
                        </td>
                        <td style={{ padding: '11px 13px', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{m.memberNumber}</td>
                        <td style={{ padding: '11px 13px' }}><span style={{ fontSize: 10, background: '#eef2ff', color: '#1e3a6e', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>{m.memberType}</span></td>
                        <td style={{ padding: '11px 13px', fontSize: 12, color: '#64748b' }}>{m.phone}</td>
                        <td style={{ padding: '11px 13px', fontSize: 12, color: '#64748b' }}>{m.group}</td>
                        <td style={{ padding: '11px 13px', fontSize: 12, fontWeight: 600, color: '#0f2040' }}>KES {m.annualRate.toLocaleString()}</td>
                        <td style={{ padding: '11px 13px', fontSize: 12, color: '#15803d', fontWeight: 600 }}>KES {m.annualPaid.toLocaleString()}</td>
                        <td style={{ padding: '11px 13px', fontSize: 12, color: m.arrearsBalance > 0 ? '#b45309' : '#94a3b8', fontWeight: m.arrearsBalance > 0 ? 600 : 400 }}>
                          {m.arrearsBalance > 0 ? `KES ${m.arrearsBalance.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ padding: '11px 13px' }}><span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span></td>
                        <td style={{ padding: '11px 13px', fontSize: 11, fontWeight: 600, color: m.isDeceased ? '#64748b' : m.isActive ? '#15803d' : '#94a3b8' }}>
                          {m.isDeceased ? '⚫ Deceased' : m.isActive ? 'Active' : 'Inactive'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* ── FINANCIAL RECEIPTS ── */}
      {!loading && tab === 'financial' && financialData && (() => {
        const d = financialData
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 20 }}>
              <KpiCard label="Total payments" value={String(d.totalPayments)} sub={`${year} fiscal year`} icon="📋" color="#1e3a6e" bg="#eef2ff" />
              <KpiCard label="Total amount"   value={fmt(d.totalAmount)}      sub="Approved payments"     icon="💰" color="#15803d" bg="#dcfce7" />
              {d.byMethod.map((m: any) => (
                <KpiCard key={m.method} label={m.method} value={fmt(m.amount)} sub={`${m.count} payments`}
                  icon={m.method === 'MPESA' ? '📱' : m.method === 'BANK' ? '🏦' : '💵'} color="#0369a1" bg="#e0f2fe" />
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: 15, color: '#0f2040' }}>
                Payment ledger — {d.totalPayments} records
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Receipt No.', 'Member', 'Member No.', 'Period', 'Method', 'M-Pesa Ref', 'Amount', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 13px', fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {d.payments.slice(0, 50).map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td style={{ padding: '11px 13px', fontFamily: 'monospace', fontSize: 11, color: '#1e3a6e', fontWeight: 600 }}>{p.receiptNumber}</td>
                      <td style={{ padding: '11px 13px', fontWeight: 600, color: '#0f2040' }}>{p.member?.fullName}</td>
                      <td style={{ padding: '11px 13px', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{p.member?.memberNumber}</td>
                      <td style={{ padding: '11px 13px', fontSize: 12, color: '#64748b' }}>{p.period}</td>
                      <td style={{ padding: '11px 13px' }}><span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>{p.method}</span></td>
                      <td style={{ padding: '11px 13px', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{p.mpesaRef}</td>
                      <td style={{ padding: '11px 13px', fontWeight: 700, color: '#0f2040' }}>KES {Number(p.amount).toLocaleString()}</td>
                      <td style={{ padding: '11px 13px', fontSize: 12, color: '#94a3b8' }}>{new Date(p.approvedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {d.payments.length > 50 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                  Showing 50 of {d.payments.length} · Download PDF for full list
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  )
}
