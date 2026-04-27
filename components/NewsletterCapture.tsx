'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

interface Props {
  source: 'homepage' | 'blog' | 'concierge_zero_result' | 'product_page' | 'about'
  variant?: 'inline' | 'card'
  heading?: string
  subhead?: string
  ctaLabel?: string
}

export default function NewsletterCapture({
  source,
  variant = 'inline',
  heading = 'Forge of the Week',
  subhead = "One curated AI-built tool, in your inbox every Tuesday. No noise, no hype.",
  ctaLabel = 'Subscribe',
}: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setMessage(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Subscription failed. Please try again.')
        return
      }
      setStatus('success')
      setMessage("You're in. First Forge lands Tuesday.")
      track('newsletter_signup', { source })
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('Network error — please try again.')
    }
  }

  // ── Card variant: bordered block with heading + subhead ──────
  if (variant === 'card') {
    return (
      <div style={{
        padding: 28,
        border: '2px solid var(--warm-ink, #2a2217)',
        display: 'grid',
        gap: 16,
        maxWidth: 540,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--soft-amber, #b97314)',
        }}>
          {heading}
        </div>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.5, margin: 0 }}>
          {subhead}
        </p>
        <SubscribeForm
          email={email}
          setEmail={setEmail}
          status={status}
          message={message}
          ctaLabel={ctaLabel}
          onSubmit={onSubmit}
        />
      </div>
    )
  }

  // ── Inline variant: just the form, for tight CTA sections ────
  return (
    <SubscribeForm
      email={email}
      setEmail={setEmail}
      status={status}
      message={message}
      ctaLabel={ctaLabel}
      onSubmit={onSubmit}
    />
  )
}

function SubscribeForm({
  email,
  setEmail,
  status,
  message,
  ctaLabel,
  onSubmit,
}: {
  email: string
  setEmail: (s: string) => void
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string | null
  ctaLabel: string
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="email"
          required
          name="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          aria-label="Your email"
          disabled={status === 'loading' || status === 'success'}
          style={{
            flex: '1 1 240px',
            padding: '12px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            border: '1px solid var(--ink, #2a2217)',
            background: 'var(--paper, #fafaf5)',
            color: 'var(--ink, #2a2217)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="btn-amber"
          disabled={status === 'loading' || status === 'success'}
          style={{
            padding: '12px 22px',
            fontSize: 14,
            cursor: status === 'loading' ? 'wait' : status === 'success' ? 'default' : 'pointer',
            border: 'none',
            opacity: status === 'loading' || status === 'success' ? 0.7 : 1,
          }}
        >
          {status === 'loading' ? 'Subscribing…' : status === 'success' ? '✓ Subscribed' : ctaLabel}
        </button>
      </div>
      {message && (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          margin: 0,
          color: status === 'success' ? '#3fa85a' : '#c87d1a',
        }}>
          {message}
        </p>
      )}
    </form>
  )
}
