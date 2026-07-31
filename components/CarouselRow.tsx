'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselRowProps {
  children: React.ReactNode
}

/**
 * Horizontal scroll-snap track with arrow controls.
 *
 * The track is a real overflow container, so it works with no JavaScript at all
 * — touch, trackpad and keyboard scrolling are native. The arrows are a
 * progressive enhancement for mouse users and are hidden below 900px, where
 * swiping is the natural gesture.
 *
 * Arrows disable at each end rather than wrapping around; a silently looping
 * carousel makes it impossible to tell how much content there is.
 */
export default function CarouselRow({ children }: CarouselRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 1)
    // 1px of slack absorbs sub-pixel rounding at fractional zoom levels
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    // Content or viewport can change after mount (images loading, resize)
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [sync])

  function scrollBy(direction: 1 | -1) {
    const el = trackRef.current
    if (!el) return
    // Page by roughly a viewport, leaving one card visible for continuity
    el.scrollBy({ left: direction * (el.clientWidth * 0.85), behavior: 'smooth' })
  }

  return (
    <div className="gf-carousel">
      <div className="gf-carousel-nav" style={{ position: 'absolute', top: -46, right: 0 }}>
        <button
          type="button"
          className="gf-carousel-btn"
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="gf-carousel-btn"
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          aria-label="Scroll right"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="gf-carousel-track no-scrollbar" ref={trackRef}>
        {children}
      </div>
    </div>
  )
}
