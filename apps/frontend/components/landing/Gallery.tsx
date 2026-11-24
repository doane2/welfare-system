'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { Reveal } from './motion'

// Put your photos in apps/frontend/public/images/ using these file names.
export const GALLERY = [
  { src: '/images/gallery-1.jpg', title: 'Worship and fellowship',  text: 'Welfare grows out of a church family that prays, serves and celebrates together.', shape: 'wide' },
  { src: '/images/gallery-2.jpg', title: 'Standing with families',  text: 'When a member is bereaved, the society stands beside the family.',                  shape: 'tall' },
  { src: '/images/gallery-3.jpg', title: 'Education support',       text: 'Helping our children stay in school.',                                               shape: ''     },
  { src: '/images/gallery-4.jpg', title: 'Care in hard times',      text: 'Practical support for members facing illness and loss.',                            shape: ''     },
  { src: '/images/gallery-5.jpg', title: 'Members meeting',         text: 'Decisions are made openly, together.',                                               shape: ''     },
  { src: '/images/gallery-6.jpg', title: 'Pay from your phone',     text: 'Contribute through M-Pesa and keep your own records.',                               shape: ''     },
]

export default function Gallery() {
  const [open, setOpen]     = useState<number | null>(null)
  const [zoom, setZoom]     = useState(1)
  const [origin, setOrigin] = useState('50% 50%')
  const touchX = useRef<number | null>(null)

  const close = useCallback(() => { setOpen(null); setZoom(1) }, [])
  const go = useCallback((dir: number) => {
    setOpen(i => (i === null ? i : (i + dir + GALLERY.length) % GALLERY.length))
    setZoom(1); setOrigin('50% 50%')
  }, [])

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(3, z + 0.5))
      if (e.key === '-') setZoom(z => Math.max(1, z - 0.5))
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, close, go])

  const toggleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(0)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(0)}%`)
    setZoom(z => (z > 1 ? 1 : 2))
  }

  const item = open === null ? null : GALLERY[open]

  return (
    <>
      <div className="gallery-grid">
        {GALLERY.map((g, i) => (
          <Reveal key={g.src} variant="zoom" delay={i * 70} className={`g-cell ${g.shape}`}>
            <button className={`g-item`} onClick={() => setOpen(i)} aria-label={`Open photo: ${g.title}`}>
              <span className="g-img" style={{ backgroundImage: `url(${g.src})` }} />
              <span className="g-cap">{g.title}</span>
            </button>
          </Reveal>
        ))}
      </div>

      {item && (
        <div
          className="lb" role="dialog" aria-modal="true" aria-label={item.title}
          onClick={close}
          onTouchStart={e => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (touchX.current === null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
          }}
        >
          <button className="lb-btn lb-close" onClick={close} aria-label="Close"><X size={22} /></button>
          <button className="lb-btn lb-prev" onClick={e => { e.stopPropagation(); go(-1) }} aria-label="Previous photo"><ChevronLeft size={26} /></button>
          <button className="lb-btn lb-next" onClick={e => { e.stopPropagation(); go(1) }} aria-label="Next photo"><ChevronRight size={26} /></button>

          <div className="lb-stage" key={open} onClick={e => e.stopPropagation()}>
            <div
              className="lb-img"
              onClick={toggleZoom}
              style={{ backgroundImage: `url(${item.src})`, transform: `scale(${zoom})`, transformOrigin: origin, cursor: zoom > 1 ? 'zoom-out' : 'zoom-in' }}
            />
          </div>

          <div className="lb-bar" onClick={e => e.stopPropagation()}>
            <div className="lb-text">
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </div>
            <div className="lb-zoom">
              <button className="lb-btn-sm" onClick={() => setZoom(z => Math.max(1, z - 0.5))} aria-label="Zoom out"><ZoomOut size={18} /></button>
              <button className="lb-btn-sm" onClick={() => setZoom(z => Math.min(3, z + 0.5))} aria-label="Zoom in"><ZoomIn size={18} /></button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}