'use client'
import type { CSSProperties, ReactNode } from 'react'

export const inputStyle: CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: '#0f2040' }
export const labelStyle: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }
export const primaryBtn: CSSProperties = { background: '#1e3a6e', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
export const ghostBtn: CSSProperties = { background: '#fff', color: '#1e3a6e', border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
export const dangerBtn: CSSProperties = { background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }

export function Badge({ bg, fg, children }: { bg: string; fg: string; children: ReactNode }) {
  return <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: bg, color: fg, whiteSpace: 'nowrap' }}>{children}</span>
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,32,64,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#0f2040', fontFamily: 'Georgia,serif' }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>x</button>
        </div>
        {children}
      </div>
    </div>
  )
}
