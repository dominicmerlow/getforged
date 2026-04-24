'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { conciergeSearch } from './actions'
import type { ConciergeState } from './actions'

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 15,
  border: '1px solid var(--ink)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  outline: 'none',
  width: '100%',
}

export default function ConciergeForm() {
  const [state, formAction, isPending] = useActionState<ConciergeState, FormData>(
    conciergeSearch,
    null
  )

  const hasResults = state && 'results' in state
  const hasError = state && 'error' in state

  return (
    <div style={{ maxWidth: 680 }}>
      <form action={formAction}>
        <div style={{ marginBottom: 12 }}>
          <textarea
            name="query"
            rows={4}
            placeholder="Describe what you need — e.g. 'I need something to automate my client invoices and send reminders'"
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: 100,
            }}
            maxLength={400}
            required
            aria-label="Describe what you need"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-hero-primary"
          style={{ cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.7 : 1 }}
        >
          {isPending ? 'Searching...' : 'Find my match →'}
        </button>
      </form>

      {/* Error state */}
      {hasError && (
        <div style={{
          marginTop: 24,
          padding: '16px 20px',
          border: '1px solid var(--amber)',
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          color: 'var(--amber)',
        }}>
          {(state as { error: string }).error}
        </div>
      )}

      {/* Results */}
      {hasResults && (() => {
        const { results, query } = state as { results: { slug: string; title: string; reason: string }[]; query: string }
        return (
          <div style={{ marginTop: 32 }}>
            {results.length === 0 ? (
              <div style={{
                padding: '24px',
                border: '1px solid var(--ink)',
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
              }}>
                No close matches found for &ldquo;{query}&rdquo;.{' '}
                <Link href="/contact" style={{ color: 'var(--amber)' }}>
                  Tell us what you need and we&apos;ll build it →
                </Link>
              </div>
            ) : (
              <>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  opacity: 0.55,
                  marginBottom: 16,
                }}>
                  Best matches for &ldquo;{query}&rdquo;
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {results.map(r => (
                    <div
                      key={r.slug}
                      className="product-card"
                      style={{ padding: 24 }}
                    >
                      <h3 style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}>
                        {r.title}
                      </h3>
                      <p style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 15,
                        opacity: 0.75,
                        lineHeight: 1.5,
                        marginBottom: 16,
                      }}>
                        {r.reason}
                      </p>
                      <Link
                        href={`/products/${r.slug}`}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 14,
                          color: 'var(--amber)',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        View product →
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}
