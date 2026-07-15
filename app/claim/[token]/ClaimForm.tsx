'use client'

import { useActionState } from 'react'
import { claimProduct, type ClaimState } from './actions'

export default function ClaimForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(
    claimProduct.bind(null, token),
    null
  )

  const ok = state && 'ok' in state && state.ok
  const error = state && 'error' in state ? state.error : null

  if (ok) {
    return (
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.5, margin: 0 }}>
        Check your inbox — we sent you a sign-in link. Click it to claim this listing.
      </p>
    )
  }

  return (
    <form action={action} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Your email
        </span>
        <input
          type="email"
          name="email"
          required
          placeholder="you@yourapp.com"
          autoComplete="email"
          style={{
            padding: '12px 14px',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 14,
            border: '1px solid var(--warm-border, rgba(42,34,23,0.18))',
            background: 'var(--cream-2, #f4ece0)',
            color: 'var(--warm-ink, #2a2217)',
            borderRadius: 2,
            outline: 'none',
            width: '100%',
          }}
        />
      </label>

      {error && (
        <p style={{ color: '#c04a1b', fontFamily: 'var(--font-mono)', fontSize: 13, margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-amber"
        style={{
          padding: '14px 28px',
          fontSize: 15,
          cursor: pending ? 'wait' : 'pointer',
          border: 'none',
          opacity: pending ? 0.7 : 1,
          justifySelf: 'start',
        }}
      >
        {pending ? 'Sending…' : 'Claim my listing — free'}
      </button>
    </form>
  )
}
