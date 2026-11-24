'use client'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/** Fades/slides content in once, the first time it scrolls into view. */
export function Reveal({
  children, delay = 0, variant = 'up', className = '', style,
}: {
  children: ReactNode
  delay?: number
  variant?: 'up' | 'left' | 'right' | 'zoom'
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect() }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${shown ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  )
}

/** Counts up to a number when it scrolls into view. */
export function Counter({
  to, prefix = '', suffix = '', duration = 1600,
}: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [val, setVal] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') { setVal(to); return }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (t: number) => {
        const p = Math.min((t - start) / duration, 1)
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])

  return <span ref={ref}>{prefix}{val}{suffix}</span>
}