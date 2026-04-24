'use client'

import { useActionState, useEffect, useState } from 'react'
import { sendSellerMessage, type ContactState } from '@/app/contact/actions'

// Inline popup (not a portal) so it Just Works in any server component
// context. Backdrop is rendered with `position: fixed` so z-index beats
// the nav and spec sheet.

export default function ContactSellerButton({
  productId,
  productTitle,
  label = 'Message seller',
}: {
  productId: string
  productTitle: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<ContactState, FormData>(
    sendSellerMessage.bind(null, productId),
    null
  )

  const ok = state && 'ok' in state && state.ok
  const error = state && 'error' in state ? state.error : null

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-hero-secondary"
        style={{ cursor: 'pointer', border: '1px solid var(--warm-ink, #2a2217)' }}
      >
        {label}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(42,34,23,0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Contact seller about ${productTitle}`}
            style={{
              background: 'var(--cream, #fbf6ec)',
              border: '1px solid var(--warm-border, rgba(42,34,23,0.15))',
              borderRadius: 4,
              boxShadow: '0 20px 60px rgba(42,34,23,0.25)',
              maxWidth: 520,
              width: '100%',
              padding: 36,
              display: 'grid',
              gap: 18,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--soft-amber, #b97314)',
                  }}
                >
                  Contact seller
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 26,
                    fontWeight: 600,
                    color: 'var(--warm-ink, #2a2217)',
                    margin: '6px 0 0',
                    lineHeight: 1.1,
                    letterSpacing: '-0.015em',
                  }}
                >
                  About <em style={{ color: 'var(--soft-amber)' }}>{productTitle}</em>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--warm-ink-dim, #5d513f)',
                  fontSize: 24,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>

            {ok ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 18,
                    lineHeight: 1.5,
                    color: 'var(--warm-ink, #2a2217)',
                    margin: 0,
                  }}
                >
                  Sent. The seller will reply directly to your email.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-hero-primary"
                  style={{ padding: '12px 24px', cursor: 'pointer', border: 'none', justifySelf: 'start' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form action={action} style={{ display: 'grid', gap: 14 }}>
                {/* Honeypot */}
                <div style={{ position: 'absolute', left: -9999, top: -9999 }} aria-hidden="true">
                  <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
                </div>

                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
                      Your name
                    </span>
                    <input
                      type="text"
                      name="sender_name"
                      required
                      placeholder="Jane Smith"
                      autoComplete="name"
                      style={fieldStyle}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
                      Email
                    </span>
                    <input
                      type="email"
                      name="sender_email"
                      required
                      placeholder="you@company.com"
                      autoComplete="email"
                      style={fieldStyle}
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }}>
                    Message
                  </span>
                  <textarea
                    name="body"
                    required
                    minLength={10}
                    rows={5}
                    placeholder="Hi — I'm interested in this for my agency. A few questions about deployment and customisation…"
                    style={{
                      ...fieldStyle,
                      fontFamily: 'var(--font-serif), Georgia, serif',
                      fontSize: 15,
                      lineHeight: 1.5,
                      resize: 'vertical',
                    }}
                  />
                </label>

                {error && (
                  <p style={{ color: '#c04a1b', fontFamily: 'var(--font-mono)', fontSize: 13, margin: 0 }}>
                    {error}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-hero-primary"
                    style={{
                      padding: '12px 24px',
                      cursor: pending ? 'wait' : 'pointer',
                      border: 'none',
                      opacity: pending ? 0.6 : 1,
                    }}
                  >
                    {pending ? 'Sending…' : 'Send message'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="btn-ghost"
                    style={{ padding: '12px 24px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>

                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--warm-muted, #8a7d69)',
                    margin: 0,
                    letterSpacing: '0.04em',
                  }}
                >
                  The seller replies directly to your email — we don&apos;t sit in the middle.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const fieldStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 14,
  border: '1px solid var(--warm-border, rgba(42,34,23,0.18))',
  background: 'var(--cream-2, #f4ece0)',
  color: 'var(--warm-ink, #2a2217)',
  borderRadius: 2,
  outline: 'none',
  width: '100%',
}
