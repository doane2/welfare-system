'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import api   from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import toast from 'react-hot-toast'

const TYPE_CONFIG: Record<string,{label:string;icon:string;bg:string;color:string}> = {
  MEDICAL:   {label:'Medical',   icon:'🏥', bg:'#fee2e2', color:'#b91c1c'},
  DEATH:     {label:'Death',     icon:'🕊️', bg:'#f1f5f9', color:'#475569'},
  EDUCATION: {label:'Education', icon:'🎓', bg:'#e0f2fe', color:'#0369a1'},
}
const STATUS_CONFIG: Record<string,{bg:string;color:string;label:string}> = {
  PENDING:  {bg:'#fef3c7',color:'#b45309', label:'Pending'},
  APPROVED: {bg:'#dcfce7',color:'#15803d', label:'Approved'},
  REJECTED: {bg:'#fee2e2',color:'#b91c1c', label:'Rejected'},
}

const fmt = (n:number) => `KES ${Number(n||0).toLocaleString()}`

// ─── Official logo — raw JPEG base64 for jsPDF addImage() ────────────────────
const LOGO_BASE64 = `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`
const LOGO_DATA_URI = `data:image/jpeg;base64,${LOGO_BASE64}`

export default function AdminClaimsPage() {
  const { user }                         = useAuth()
  const searchParams                     = useSearchParams()
  const [claims,      setClaims]         = useState<any[]>([])
  const [stats,       setStats]          = useState<any>(null)
  const [loading,     setLoading]        = useState(true)
  const [total,       setTotal]          = useState(0)
  const [page,        setPage]           = useState(1)
  const [filter,      setFilter]         = useState(searchParams.get('status') || 'ALL')
  const [typeFilter,  setTypeFilter]     = useState('ALL')
  const [searchInput, setSearchInput]    = useState('')
  const [search,      setSearch]         = useState('')
  const debounceTimer                    = useRef<ReturnType<typeof setTimeout>|null>(null)
  const [selected,    setSelected]       = useState<any|null>(null)
  const [acting,      setActing]         = useState<string|null>(null)
  const [rejectReason,setRejectReason]   = useState('')
  const [showReject,  setShowReject]     = useState<string|null>(null)
  const [exporting,   setExporting]      = useState(false)
  const LIMIT = 15

  const canAct = ['SUPER_ADMIN','TREASURER'].includes(user?.role||'')

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => { setSearch(value); setPage(1) }, 400)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: LIMIT }
      if (filter !== 'ALL')     params.status = filter
      if (typeFilter !== 'ALL') params.type   = typeFilter
      if (search)               params.search = search
      const { data } = await api.get('/claims', { params })
      setClaims(data.claims || [])
      setTotal(data.total || 0)
      if (data.stats) setStats(data.stats)
    } catch { toast.error('Failed to load claims') }
    finally  { setLoading(false) }
  }, [page, filter, typeFilter, search])

  useEffect(() => { load() }, [load])

  const approve = async (id: string) => {
    setActing(id)
    try {
      await api.patch(`/claims/${id}/approve`)
      toast.success('Claim approved! Member notified.')
      setSelected(null); load()
    } catch (e:any) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setActing(null) }
  }

  const reject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return }
    setActing(id)
    try {
      await api.patch(`/claims/${id}/reject`, { reason: rejectReason })
      toast.success('Claim rejected. Member notified.')
      setShowReject(null); setRejectReason(''); setSelected(null); load()
    } catch (e:any) { toast.error(e.response?.data?.message || 'Failed') }
    finally { setActing(null) }
  }

  // ─── PDF Export ─────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true)
    try {
      // Fetch all matching claims (up to 1000)
      const params: any = { page: 1, limit: 1000 }
      if (filter !== 'ALL')     params.status = filter
      if (typeFilter !== 'ALL') params.type   = typeFilter
      if (search)               params.search = search
      const { data } = await api.get('/claims', { params })
      const allClaims: any[] = data.claims || []

      const { jsPDF } = await import('jspdf')
      const autoTable   = (await import('jspdf-autotable')).default
      const doc         = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW       = doc.internal.pageSize.getWidth()
      const pageH       = doc.internal.pageSize.getHeight()
      const margin      = 14
      const now         = new Date()

      // Filter description for subtitle
      const filterParts: string[] = []
      if (filter !== 'ALL')     filterParts.push(`Status: ${filter}`)
      if (typeFilter !== 'ALL') filterParts.push(`Type: ${typeFilter}`)
      if (search)               filterParts.push(`Search: "${search}"`)
      const filterDesc = filterParts.length > 0 ? filterParts.join('  ·  ') : 'All claims'

      // ── HEADER ───────────────────────────────────────────────────────────
      doc.setFillColor(10, 25, 52)
      doc.rect(0, 0, pageW, 52, 'F')
      doc.setFillColor(230, 176, 32)
      doc.rect(0, 0, 4, 52, 'F')
      doc.addImage(LOGO_BASE64, 'JPEG', 8, 5, 22, 22)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('CRATER SDA WELFARE SOCIETY', 35, 16)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(180, 200, 230)
      doc.text('Nakuru, Kenya  ·  Est. 2016  ·  Welfare Claims Report', 35, 23)
      doc.setDrawColor(230, 176, 32)
      doc.setLineWidth(0.4)
      doc.line(35, 27, pageW - margin, 27)
      doc.setTextColor(245, 200, 66)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('OFFICIAL CLAIMS REPORT', 35, 34)
      doc.setTextColor(160, 185, 215)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Generated: ${now.toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}  ·  Filters: ${filterDesc}`,
        35, 41
      )
      // Total-records badge
      doc.setFillColor(230, 176, 32)
      doc.roundedRect(pageW - 72, 8, 58, 16, 3, 3, 'F')
      doc.setTextColor(10, 25, 52)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL CLAIMS', pageW - 43, 16, { align: 'center' })
      doc.setFontSize(9)
      doc.text(String(allClaims.length), pageW - 43, 22, { align: 'center' })

      // ── SUMMARY STATS STRIP ──────────────────────────────────────────────
      let y = 58
      if (stats) {
        const kpis = [
          { label: 'Total',         value: String(stats.total),              rgb: [30,58,110]  as [number,number,number], bg: [238,242,255] as [number,number,number] },
          { label: 'Pending',       value: String(stats.pending),            rgb: [180,83,9]   as [number,number,number], bg: [255,247,237] as [number,number,number] },
          { label: 'Approved',      value: String(stats.approved),           rgb: [21,128,61]  as [number,number,number], bg: [240,253,244] as [number,number,number] },
          { label: 'Rejected',      value: String(stats.rejected),           rgb: [185,28,28]  as [number,number,number], bg: [254,242,242] as [number,number,number] },
          { label: 'Total Paid Out',value: fmt(stats.approvedAmount),        rgb: [124,58,237] as [number,number,number], bg: [245,243,255] as [number,number,number] },
        ]
        const kpiW = (pageW - margin * 2) / kpis.length
        doc.setFillColor(248, 250, 252)
        doc.roundedRect(margin, y, pageW - margin * 2, 22, 3, 3, 'F')
        doc.setDrawColor(210, 220, 235)
        doc.setLineWidth(0.25)
        doc.roundedRect(margin, y, pageW - margin * 2, 22, 3, 3, 'S')
        kpis.forEach((k, i) => {
          const kx = margin + i * kpiW
          doc.setFontSize(6.5); doc.setFont('helvetica','normal'); doc.setTextColor(120,135,155)
          doc.text(k.label.toUpperCase(), kx + kpiW / 2, y + 8, { align: 'center' })
          doc.setFontSize(k.value.length > 10 ? 8 : 10); doc.setFont('helvetica','bold')
          doc.setTextColor(k.rgb[0], k.rgb[1], k.rgb[2])
          doc.text(k.value, kx + kpiW / 2, y + 17, { align: 'center' })
          if (i < kpis.length - 1) {
            doc.setDrawColor(210,220,235); doc.setLineWidth(0.2)
            doc.line(kx + kpiW, y + 4, kx + kpiW, y + 18)
          }
        })
        y += 28
      }

      // ── By-type strip ────────────────────────────────────────────────────
      if (stats?.byType) {
        const types = stats.byType.filter((t:any) => t.type !== 'DISABILITY')
        const tW = (pageW - margin * 2) / Math.max(types.length, 1)
        types.forEach((t:any, i:number) => {
          const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.MEDICAL
          const hex = (h:string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)] as [number,number,number]
          const [br,bg,bb] = hex(cfg.bg)
          const [tr,tg,tb] = hex(cfg.color)
          const tx = margin + i * tW
          doc.setFillColor(br,bg,bb)
          doc.roundedRect(tx, y, tW - 2, 14, 2, 2, 'F')
          doc.setFontSize(6.5); doc.setFont('helvetica','bold'); doc.setTextColor(tr,tg,tb)
          doc.text(`${t.type}  ${t.count} claims${t.amount > 0 ? '  ' + fmt(t.amount) : ''}`, tx + (tW-2)/2, y + 9, { align: 'center' })
        })
        y += 20
      }

      // ── Section heading ──────────────────────────────────────────────────
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(30,58,110)
      doc.text('CLAIMS LEDGER', margin, y)
      doc.setDrawColor(230,176,32); doc.setLineWidth(0.5)
      doc.line(margin, y + 1.5, margin + 34, y + 1.5)

      // ── Claims table ─────────────────────────────────────────────────────
      autoTable(doc, {
        startY: y + 6,
        head: [['#','Member','Member No.','Type','Title','Amount (KES)','Docs','Status','Date','Reviewed By']],
        body: allClaims.length > 0
          ? allClaims.map((c:any, i:number) => [
              i + 1,
              c.user?.fullName || '—',
              c.user?.memberNumber || '—',
              c.type || '—',
              c.title || '—',
              c.amount ? Number(c.amount).toLocaleString() : '—',
              c.documents?.length > 0 ? String(c.documents.length) : '—',
              (c.status || '—'),
              new Date(c.createdAt).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }),
              c.reviewedBy?.fullName || '—',
            ])
          : [['—','No claims match the selected filters','','','','','','','','']],
        theme: 'grid',
        headStyles: { fillColor:[10,25,52], textColor:[255,255,255], fontSize:7.5, fontStyle:'bold', halign:'left', cellPadding:3.5 },
        bodyStyles: { fontSize:7, textColor:[51,65,85], cellPadding:3 },
        alternateRowStyles: { fillColor:[248,250,252] },
        columnStyles: {
          0: { halign:'center', fontStyle:'bold', cellWidth:8 },
          1: { fontStyle:'bold' },
          5: { halign:'right', fontStyle:'bold' },
          6: { halign:'center' },
          7: { halign:'center' },
        },
        margin: { left: margin, right: margin },
        didParseCell: (d:any) => {
          if (d.section === 'body' && d.column.index === 7) {
            const s = String(d.cell.raw)
            if (s === 'APPROVED') d.cell.styles.textColor = [21,128,61]
            if (s === 'PENDING')  d.cell.styles.textColor = [180,83,9]
            if (s === 'REJECTED') d.cell.styles.textColor = [185,28,28]
          }
          if (d.section === 'body' && d.column.index === 3) {
            const t = String(d.cell.raw)
            if (t === 'MEDICAL')   d.cell.styles.textColor = [185,28,28]
            if (t === 'EDUCATION') d.cell.styles.textColor = [3,105,161]
            if (t === 'DEATH')     d.cell.styles.textColor = [71,85,105]
          }
        },
      })

      // ── Per-page: CONFIDENTIAL watermark + footer with logo ──────────────
      const numPages = (doc as any).internal.getNumberOfPages()
      for (let pg = 1; pg <= numPages; pg++) {
        doc.setPage(pg)
        doc.setFontSize(52); doc.setFont('helvetica','bold'); doc.setTextColor(232,235,243)
        doc.text('CONFIDENTIAL', pageW / 2, pageH / 2, { align:'center', angle:45 })
        doc.setDrawColor(230,176,32); doc.setLineWidth(0.5)
        doc.line(margin, pageH - 18, pageW - margin, pageH - 18)
        doc.setFontSize(6.5); doc.setFont('helvetica','italic'); doc.setTextColor(120,135,155)
        doc.text('CONFIDENTIAL — This report is computer-generated for internal use only.', margin, pageH - 13)
        doc.setFont('helvetica','normal')
        doc.text(`Page ${pg} / ${numPages}`, pageW - margin - 14, pageH - 13, { align:'right' })
        doc.setFont('helvetica','bold'); doc.setTextColor(30,58,110)
        doc.text('Crater SDA Welfare Society  ·  Nakuru, Kenya  ·  Est. 2016', margin, pageH - 7)
        doc.addImage(LOGO_BASE64, 'JPEG', pageW - margin - 12, pageH - 19, 12, 12)
      }

      const dateStr = now.toISOString().split('T')[0]
      doc.save(`CraterSDA_ClaimsReport_${dateStr}.pdf`)
      toast.success('Claims report downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF. Please try again.')
    } finally { setExporting(false) }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const iS: React.CSSProperties = { padding:'9px 13px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#fff' }
  const iF = (e:React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = '#1e3a6e'
  const iB = (e:React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor = '#e2e8f0'

  return (
    <div style={{ padding:'32px 36px' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'Georgia,serif', fontSize:26, fontWeight:700, color:'#0f2040', marginBottom:4 }}>Claims</h1>
          <p style={{ fontSize:14, color:'#64748b' }}>Review and manage member welfare claims</p>
        </div>
        <button
          onClick={exportPDF}
          disabled={exporting}
          style={{
            background: exporting ? '#94a3b8' : '#0f2040',
            color:'#fff', padding:'10px 22px', borderRadius:9,
            fontSize:13, fontWeight:600, border:'none',
            cursor: exporting ? 'not-allowed' : 'pointer',
            display:'flex', alignItems:'center', gap:8,
          }}
        >
          {exporting
            ? <><span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Generating PDF...</>
            : <>📄 Export PDF</>
          }
        </button>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
          {[
            {label:'Total',          value:stats.total,               icon:'📋', color:'#1e3a6e', bg:'#eef2ff'},
            {label:'Pending',        value:stats.pending,             icon:'⏳', color:'#b45309', bg:'#fef3c7'},
            {label:'Approved',       value:stats.approved,            icon:'✓',  color:'#15803d', bg:'#dcfce7'},
            {label:'Rejected',       value:stats.rejected,            icon:'✕',  color:'#b91c1c', bg:'#fee2e2'},
            {label:'Total paid out', value:fmt(stats.approvedAmount), icon:'💸', color:'#7c3aed', bg:'#f5f3ff'},
          ].map(s=>(
            <div key={s.label} style={{
              background:s.bg, borderRadius:9, padding:'10px 16px',
              border:`1px solid ${s.color}30`,
            }}>
              <div style={{ fontSize:12, color:s.color, fontWeight:600, marginBottom:2 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Spending by category ─────────────────────────────────────────── */}
      {stats?.byType && (
        <div style={{ background:'#fff', borderRadius:14, padding:'16px 20px', border:'1px solid #e2e8f0', marginBottom:22 }}>
          <div style={{ fontWeight:600, fontSize:14, color:'#0f2040', marginBottom:12 }}>Spending by category</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {stats.byType
              .filter((t:any) => t.type !== 'DISABILITY')
              .map((t:any) => {
                const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.MEDICAL
                return (
                  <div key={t.type} style={{ background:cfg.bg, borderRadius:9, padding:'10px 16px', border:`1px solid ${cfg.color}30` }}>
                    <div style={{ fontSize:12, color:cfg.color, fontWeight:600, marginBottom:2 }}>{cfg.icon} {t.type}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:cfg.color }}>{t.count} claims</div>
                    {t.amount > 0 && <div style={{ fontSize:12, color:cfg.color, opacity:0.8 }}>{fmt(t.amount)}</div>}
                  </div>
                )
              })}</div>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
        <input value={searchInput} onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search claims..."
          style={{ ...iS, width:220 }} onFocus={iF} onBlur={iB}/>
        <div style={{ display:'flex', gap:2, background:'#f1f5f9', padding:4, borderRadius:10 }}>
          {['ALL','PENDING','APPROVED','REJECTED'].map(f=>(
            <button key={f} onClick={()=>{setFilter(f);setPage(1)}} style={{
              padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:500,
              border:'none', cursor:'pointer',
              background: filter===f?'#fff':'transparent',
              color:       filter===f?'#0f2040':'#94a3b8',
              boxShadow:   filter===f?'0 1px 3px rgba(0,0,0,0.08)':'none',
            }}>{f==='ALL'?'All':f.charAt(0)+f.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:2, background:'#f1f5f9', padding:4, borderRadius:10 }}>
          {['ALL','MEDICAL','DEATH','EDUCATION'].map(t=>(
            <button key={t} onClick={()=>{setTypeFilter(t);setPage(1)}} style={{
              padding:'7px 12px', borderRadius:7, fontSize:12, fontWeight:500,
              border:'none', cursor:'pointer',
              background: typeFilter===t?'#fff':'transparent',
              color:       typeFilter===t?'#0f2040':'#94a3b8',
              boxShadow:   typeFilter===t?'0 1px 3px rgba(0,0,0,0.08)':'none',
            }}>
              {t==='ALL'?'All types':(TYPE_CONFIG[t]?.icon+' '+t.charAt(0)+t.slice(1).toLowerCase())}
            </button>
          ))}
        </div>
        <span style={{ marginLeft:'auto', fontSize:13, color:'#94a3b8' }}>{total} claims</span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
              {['Member','Type','Title','Amount','Docs','Status','Date','Action'].map(h=>(
                <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:10, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(6).fill(0).map((_,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  {Array(8).fill(0).map((_,j)=>(
                    <td key={j} style={{ padding:'13px 14px' }}>
                      <div style={{ height:13, background:'#f1f5f9', borderRadius:4, animation:'pulse 1.5s ease infinite' }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : claims.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🏥</div>
                <div style={{ fontWeight:600, color:'#64748b' }}>No claims found</div>
              </td></tr>
            ) : claims.map(c => {
              const tc = TYPE_CONFIG[c.type]    || TYPE_CONFIG.MEDICAL
              const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING
              return (
                <tr key={c.id} style={{ borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#f8fafc'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
                  onClick={() => setSelected(c)}>
                  <td style={{ padding:'13px 14px' }}>
                    <div style={{ fontWeight:600, color:'#0f2040' }}>{c.user?.fullName}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{c.user?.memberNumber}</div>
                  </td>
                  <td style={{ padding:'13px 14px' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:tc.bg, color:tc.color }}>
                      {tc.icon} {tc.label}
                    </span>
                  </td>
                  <td style={{ padding:'13px 14px', maxWidth:160 }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:13, color:'#374151' }}>{c.title}</div>
                  </td>
                  <td style={{ padding:'13px 14px', fontWeight:600, color:'#0f2040', whiteSpace:'nowrap' }}>
                    {c.amount ? fmt(c.amount) : '—'}
                  </td>
                  <td style={{ padding:'13px 14px', fontSize:12, color:'#64748b' }}>
                    {c.documents?.length > 0 ? `📎 ${c.documents.length}` : '—'}
                  </td>
                  <td style={{ padding:'13px 14px' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:sc.bg, color:sc.color }}>
                      {sc.label}
                    </span>
                  </td>
                  <td style={{ padding:'13px 14px', fontSize:12, color:'#94a3b8', whiteSpace:'nowrap' }}>
                    {new Date(c.createdAt).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}
                  </td>
                  <td style={{ padding:'13px 14px' }} onClick={e=>e.stopPropagation()}>
                    {c.status==='PENDING' && canAct ? (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={()=>approve(c.id)} disabled={acting===c.id}
                          style={{ padding:'6px 12px', borderRadius:6, fontSize:12, fontWeight:600, background:acting===c.id?'#94a3b8':'#16a34a', color:'#fff', border:'none', cursor:acting===c.id?'not-allowed':'pointer' }}>
                          {acting===c.id?'...':'✓'}
                        </button>
                        <button onClick={()=>{setShowReject(c.id);setRejectReason('')}} disabled={acting===c.id}
                          style={{ padding:'6px 10px', borderRadius:6, fontSize:12, fontWeight:600, background:'transparent', color:'#dc2626', border:'1.5px solid #fecaca', cursor:'pointer' }}>
                          ✕
                        </button>
                      </div>
                    ) : <span style={{ fontSize:12, color:'#94a3b8' }}>—</span>}
                  </td>
                </tr>
              )
            })}</tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderTop:'1px solid #e2e8f0' }}>
            <span style={{ fontSize:13, color:'#94a3b8' }}>Page {page} of {totalPages} · {total} claims</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:13, cursor:'pointer', opacity:page===1?.5:1 }}>← Prev</button>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:13, cursor:'pointer', opacity:page===totalPages?.5:1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Rejection modal ───────────────────────────────────────────────── */}
      {showReject && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}
          onClick={()=>setShowReject(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, color:'#0f2040', marginBottom:6 }}>Reject claim</div>
            <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>
              Please provide a reason — this will be shared with the member via SMS and email.
            </div>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)}
              rows={4} placeholder="e.g. Insufficient documentation. Please resubmit with a valid hospital receipt..."
              style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', marginBottom:16 }}
              onFocus={e=>e.target.style.borderColor='#1e3a6e'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}
              autoFocus/>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>reject(showReject)} disabled={acting===showReject||!rejectReason.trim()}
                style={{ background:(!rejectReason.trim()||acting===showReject)?'#94a3b8':'#dc2626', color:'#fff', padding:'10px 22px', borderRadius:9, fontSize:13, fontWeight:600, border:'none', cursor:(!rejectReason.trim()||acting===showReject)?'not-allowed':'pointer' }}>
                {acting===showReject?'Rejecting...':'Confirm rejection'}
              </button>
              <button onClick={()=>setShowReject(null)}
                style={{ background:'#f1f5f9', color:'#475569', padding:'10px 18px', borderRadius:9, fontSize:13, border:'none', cursor:'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Claim detail modal ────────────────────────────────────────────── */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:16 }}
          onClick={()=>setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:600, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'22px 26px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700, fontSize:16, color:'#0f2040' }}>Claim details</div>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#94a3b8' }}>✕</button>
            </div>
            <div style={{ padding:'22px 26px' }}>
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                {(()=>{
                  const tc = TYPE_CONFIG[selected.type] || TYPE_CONFIG.MEDICAL
                  const sc = STATUS_CONFIG[selected.status] || STATUS_CONFIG.PENDING
                  return <>
                    <span style={{ fontSize:12, fontWeight:600, padding:'3px 12px', borderRadius:99, background:tc.bg, color:tc.color }}>{tc.icon} {tc.label}</span>
                    <span style={{ fontSize:12, fontWeight:600, padding:'3px 12px', borderRadius:99, background:sc.bg, color:sc.color }}>{sc.label}</span>
                  </>
                })()}
              </div>
              <div style={{ fontWeight:700, fontSize:17, color:'#0f2040', marginBottom:8 }}>{selected.title}</div>
              {selected.amount && <div style={{ fontSize:14, fontWeight:600, color:'#1e3a6e', marginBottom:12 }}>Amount requested: {fmt(selected.amount)}</div>}
              <div style={{ fontSize:14, color:'#374151', lineHeight:1.8, marginBottom:16, whiteSpace:'pre-wrap' }}>{selected.description}</div>
              <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 16px', marginBottom:16, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Member</div>
                <div style={{ fontWeight:600, fontSize:14, color:'#0f2040' }}>{selected.user?.fullName}</div>
                <div style={{ fontSize:12, color:'#64748b' }}>{selected.user?.memberNumber} · {selected.user?.email}</div>
              </div>
              {selected.status==='REJECTED' && selected.rejectionReason && (
                <div style={{ background:'#fef2f2', borderRadius:9, padding:'12px 16px', border:'1px solid #fecaca', marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#b91c1c', marginBottom:4 }}>Rejection reason</div>
                  <div style={{ fontSize:13, color:'#b91c1c' }}>{selected.rejectionReason}</div>
                </div>
              )}
              {selected.documents?.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8 }}>Supporting documents ({selected.documents.length})</div>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    {selected.documents.map((d:any) => {
                      const isImg = d.mimeType?.startsWith('image/')
                      return (
                        <a key={d.id} href={d.url} target="_blank" rel="noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#f8fafc', borderRadius:9, border:'1px solid #e2e8f0', textDecoration:'none', fontSize:13, color:'#1e3a6e' }}>
                          {isImg
                            ? <img src={d.url} alt={d.filename} style={{ width:36, height:36, borderRadius:5, objectFit:'cover' }}/>
                            : <span style={{ fontSize:20 }}>📄</span>
                          }
                          <span>{d.filename}</span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
              <div style={{ fontSize:12, color:'#94a3b8', marginBottom:20 }}>
                Submitted {new Date(selected.createdAt).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})}
                {selected.reviewedBy && ` · Reviewed by ${selected.reviewedBy.fullName}`}
              </div>
              {selected.status==='PENDING' && canAct && (
                <div style={{ display:'flex', gap:10, paddingTop:4, borderTop:'1px solid #f1f5f9' }}>
                  <button onClick={()=>approve(selected.id)} disabled={acting===selected.id}
                    style={{ background:acting===selected.id?'#94a3b8':'#16a34a', color:'#fff', padding:'11px 24px', borderRadius:9, fontSize:14, fontWeight:600, border:'none', cursor:acting===selected.id?'not-allowed':'pointer' }}>
                    {acting===selected.id?'Approving...':'✓ Approve claim'}
                  </button>
                  <button onClick={()=>{setShowReject(selected.id);setRejectReason('');setSelected(null)}}
                    style={{ background:'transparent', color:'#dc2626', padding:'11px 20px', borderRadius:9, fontSize:14, fontWeight:600, border:'1.5px solid #fecaca', cursor:'pointer' }}>
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
