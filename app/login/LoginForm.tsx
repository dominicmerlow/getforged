'use client'

import { useActionState } from 'react'
import { signInWithEmail, type AuthState } from '@/app/actions/auth'

const initial: AuthState = null

export default function LoginForm() {
  const [state, action, pending] = useActionState(signInWithEmail, initial)

  return (
    <form action={action} style={{ display: 'grid', gap: 16, maxWidth: 420, width: '100%' }}>
      <label style={{ display: 'grid', gap: 8 }}>
        <span className="section-tag">Email</span>
        <input
          type="email"
          name="email"
          required
          placeholder="you@company.com"
          autoComplete="email"
          style={{
            padding: '14px 16px',
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            border: '1px solid var(--ink)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-hero-primary"
        style={{ padding: '14px 28px', opacity: pending ? 0.6 : 1 }}
      >
        {pending ? 'Sending…' : 'Send magic link'}
      </button>

      {state?.error && (
        <p style={{ color: 'var(--rust, #c04a1b)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          {state.error}
        </p>
      )}
      {state?.message && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          {state.message}
        </p>
      )}
    </form>
  )
}
