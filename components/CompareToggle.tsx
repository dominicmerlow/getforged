'use client'

import { useCompare, COMPARE_MAX } from '@/components/CompareProvider'

interface Props {
  slug: string
  title: string
  priceMain: string
  category: string
  /** Stop click propagation when used inside a clickable card */
  stopPropagation?: boolean
}

/**
 * Inline "Compare" checkbox suitable for placing inside or beside a product
 * card. Uses the global compare context, so the floating CompareBar updates
 * automatically.
 *
 * The label is hidden visually at small sizes — keep this for screen readers.
 */
export default function CompareToggle({ slug, title, priceMain, category, stopPropagation }: Props) {
  const { has, toggle, items, hydrated } = useCompare()
  const isChecked = has(slug)
  const atCap = items.length >= COMPARE_MAX && !isChecked

  // Pre-hydration: render a stable, disabled placeholder to avoid SSR flicker
  if (!hydrated) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          gap: 6,
          padding: '6px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--muted, #6b6b6b)',
          border: '1px solid rgba(42,39,32,0.2)',
          background: 'transparent',
          opacity: 0.4,
        }}
      >
        ⊕ Compare
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={e => {
        if (stopPropagation) {
          e.preventDefault()
          e.stopPropagation()
        }
        if (atCap) return
        toggle({ slug, title, priceMain, category })
      }}
      disabled={atCap}
      title={atCap ? `Compare cap reached (${COMPARE_MAX})` : isChecked ? 'Remove from compare' : 'Add to compare'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.04em',
        color: isChecked ? 'var(--paper, #fafaf5)' : 'var(--ink, #2a2217)',
        background: isChecked ? 'var(--ink, #2a2217)' : 'transparent',
        border: '1px solid var(--ink, #2a2217)',
        cursor: atCap ? 'not-allowed' : 'pointer',
        opacity: atCap ? 0.4 : 1,
        textTransform: 'uppercase',
      }}
    >
      <span aria-hidden="true">{isChecked ? '✓' : '+'}</span>
      <span>{isChecked ? 'In compare' : 'Compare'}</span>
    </button>
  )
}
