'use client'

import Link from 'next/link'
import { useCompare, COMPARE_MAX } from '@/components/CompareProvider'
import { track } from '@/lib/analytics'

/**
 * Floating bottom bar showing currently-selected compare items.
 * - Hidden when zero items selected (no visual noise on first visit)
 * - Hidden until hydration completes (avoids SSR/CSR mismatch)
 * - Auto-routes to /compare?slugs=… when "Compare" clicked
 */
export default function CompareBar() {
  const { items, hydrated, remove, clear } = useCompare()

  if (!hydrated || items.length === 0) return null

  const slugsParam = items.map(i => i.slug).join(',')
  const canCompare = items.length >= 2

  return (
    <div
      role="region"
      aria-label="Compare products"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: 'var(--ink, #2a2217)',
        color: 'var(--paper, #fafaf5)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        maxWidth: 'min(96vw, 920px)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--soft-amber, #b97314)',
      }}>
        Compare {items.length}/{COMPARE_MAX}
      </div>

      <ul style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        {items.map(item => (
          <li key={item.slug}>
            <button
              type="button"
              onClick={() => remove(item.slug)}
              title={`Remove ${item.title}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                background: 'rgba(255,255,255,0.08)',
                color: 'inherit',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {item.title}
              <span aria-hidden="true" style={{ opacity: 0.6 }}>×</span>
            </button>
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        <button
          type="button"
          onClick={clear}
          style={{
            padding: '8px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            background: 'transparent',
            color: 'inherit',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
        {canCompare ? (
          <Link
            href={`/compare?slugs=${slugsParam}`}
            onClick={() => track('compare_open', { count: items.length, slugs: slugsParam })}
            style={{
              padding: '8px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              background: 'var(--soft-amber, #b97314)',
              color: 'var(--paper, #fafaf5)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Compare {items.length} →
          </Link>
        ) : (
          <span style={{
            padding: '8px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.55)',
          }}>
            Add 1 more to compare
          </span>
        )}
      </div>
    </div>
  )
}
