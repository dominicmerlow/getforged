'use client'

import { useActionState, useState, useRef } from 'react'
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

// Real, buyer-shaped example queries — clicking one should reduce friction to zero
const EXAMPLE_PROMPTS: { label: string; query: string }[] = [
  {
    label: 'Automate client invoices',
    query: 'I need a tool that automatically generates invoices from my client work and chases late payments.',
  },
  {
    label: 'AI chatbot for my Shopify store',
    query: 'I want an AI chatbot trained on my product catalogue that answers customer questions and recommends products.',
  },
  {
    label: 'Reply to Google reviews faster',
    query: 'I get too many Google and Trustpilot reviews to keep up with — I need something that drafts replies for me to approve.',
  },
  {
    label: 'Lightweight CRM for my team of 5',
    query: 'I run a small service business and need a simple CRM to track leads and follow-ups — Salesforce is overkill.',
  },
  {
    label: 'Embeddable booking system',
    query: 'I need a booking system I can embed on my website that syncs with Google Calendar and sends SMS reminders.',
  },
  {
    label: 'White-label client portal',
    query: 'I need a branded client portal where my clients can see project updates, share files, and message me.',
  },
]

export default function ConciergeForm() {
  const [state, formAction, isPending] = useActionState<ConciergeState, FormData>(
    conciergeSearch,
    null
  )
  const [query, setQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const hasResults = state && 'results' in state
  const hasError = state && 'error' in state

  function applyExample(text: string) {
    setQuery(text)
    // Focus the textarea so the user sees the example land in context
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(text.length, text.length)
    })
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Example prompts — kill the blank-page paralysis */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--soft-amber, #b97314)',
          marginBottom: 12,
        }}>
          Try one of these
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXAMPLE_PROMPTS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyExample(p.query)}
              className="filter-chip"
              style={{ cursor: 'pointer' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form action={formAction}>
        <div style={{ marginBottom: 12 }}>
          <textarea
            ref={textareaRef}
            name="query"
            rows={4}
            value={query}
            onChange={e => setQuery(e.target.value)}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="btn-hero-primary"
            style={{
              cursor: isPending ? 'wait' : 'pointer',
              opacity: isPending || !query.trim() ? 0.55 : 1,
            }}
          >
            {isPending ? 'Searching the catalogue…' : 'Find my match →'}
          </button>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.08em',
            color: '#6b6b6b',
          }}>
            Powered by Claude · Free, no signup
          </span>
        </div>
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
        const { results, query: resolvedQuery } = state as { results: { slug: string; title: string; reason: string }[]; query: string }
        return (
          <div style={{ marginTop: 32 }}>
            {results.length === 0 ? (
              <div style={{
                padding: 28,
                border: '2px solid var(--warm-ink, #2a2217)',
                display: 'grid',
                gap: 12,
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--soft-amber, #b97314)',
                }}>
                  No close match yet
                </div>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.5, margin: 0 }}>
                  We don&apos;t have an exact match for &ldquo;{resolvedQuery}&rdquo; in the
                  marketplace today. The catalogue grows weekly — leave your need
                  with us and we&apos;ll DM a builder to make it.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                  <Link href={`/contact?need=${encodeURIComponent(resolvedQuery)}`} className="btn-hero-primary">
                    Tell us what you need →
                  </Link>
                  <Link href="/browse" className="btn-hero-secondary">
                    Browse the full catalogue
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  opacity: 0.55,
                  marginBottom: 16,
                }}>
                  Best matches for &ldquo;{resolvedQuery}&rdquo;
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {results.map(r => (
                    <Link
                      key={r.slug}
                      href={`/products/${r.slug}`}
                      className="product-card"
                      style={{ padding: 24, display: 'block', textDecoration: 'none', color: 'inherit' }}
                    >
                      <h3 style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 22,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}>
                        {r.title}
                      </h3>
                      <p style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 16,
                        opacity: 0.75,
                        lineHeight: 1.5,
                        marginBottom: 16,
                      }}>
                        {r.reason}
                      </p>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 13,
                        color: 'var(--amber)',
                        fontWeight: 600,
                      }}>
                        View product →
                      </span>
                    </Link>
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
