'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import ConciergeForm from '@/app/concierge/ConciergeForm'

/**
 * The concierge lives in a modal rather than on its own page.
 *
 * It is a top-of-funnel tool: a visitor part-way through browsing shouldn't
 * have to abandon the page they're on to describe what they need. Opening it
 * over the current page keeps the browsing context alive underneath.
 *
 * /concierge still exists as a real page so the flow stays linkable, shareable
 * and crawlable. This modal is the in-app entry point, not a replacement.
 *
 * Any element anywhere can open it by dispatching the OPEN_EVENT on window,
 * which avoids threading state through the server-rendered header.
 */
export const OPEN_EVENT = 'gf:open-concierge'

export function openConcierge() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export default function ConciergeModal() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onOpen = () => {
      restoreFocusRef.current = document.activeElement as HTMLElement | null
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) {
      // Send focus back where it came from, or the trigger vanishes from under
      // keyboard users when the dialog unmounts.
      restoreFocusRef.current?.focus?.()
      return
    }

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
        return
      }
      if (e.key !== 'Tab') return

      // Minimal focus trap: the dialog covers the viewport, so tabbing out of
      // it lands on controls the user can't see.
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    // Focus the panel itself rather than the textarea: on mobile, focusing an
    // input immediately throws up the keyboard and hides the example prompts.
    requestAnimationFrame(() => panelRef.current?.focus())

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      body.style.overflow = previousOverflow
    }
  }, [open, close])

  if (!open) return null

  return (
    <div
      className="gf-modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={panelRef}
        className="gf-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gf-concierge-title"
        tabIndex={-1}
      >
        <div className="gf-modal-head">
          <div>
            <div className="section-tag" style={{ marginBottom: 4 }}>
              AI Concierge
            </div>
            <h2 id="gf-concierge-title" className="gf-modal-title">
              Find your perfect tool
            </h2>
          </div>
          <button
            type="button"
            className="gf-modal-close"
            onClick={close}
            aria-label="Close concierge"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="gf-modal-body">
          <p className="gf-modal-lede">
            Describe what your business needs in plain English. Our AI will scan
            the catalogue and pick the 3 best matches, no browsing required.
          </p>
          <ConciergeForm />
        </div>
      </div>
    </div>
  )
}

/**
 * Header/nav entry point. Renders as a button so it doesn't navigate, but
 * inherits the surrounding link styling so the nav row stays visually even.
 */
export function ConciergeTrigger({
  className,
  children = 'Concierge',
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <button type="button" className={className} onClick={openConcierge}>
      {children}
    </button>
  )
}
