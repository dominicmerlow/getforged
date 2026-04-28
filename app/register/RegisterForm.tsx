'use client'

import { useActionState, useEffect } from 'react'
import { signUpWithNameAndEmail, type AuthState } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'

const initial: AuthState = null

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 16,
  border: '1px solid var(--ink)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  outline: 'none',
}

export default function RegisterForm() {
  const [state, action, pending] = useActionState(signUpWithNameAndEmail, initial)

  // Fire analytics once when the magic-link send succeeds (not on form mount)
  useEffect(() => {
    if (state?.message) {
      track('signup_started', { method: 'magic_link' })
    }
  }, [state])

  function handleGitHub() {
    track('signup_started', { method: 'github_oauth' })
    const supabase = createClient()
    supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })
  }

  return (
    <div style={{ display: 'grid', gap: 16, width: '100%' }}>
      {/* GitHub OAuth — fastest path for the builder ICP */}
      <button
        type="button"
        onClick={handleGitHub}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '13px 20px', width: '100%', cursor: 'pointer',
          border: '1px solid var(--ink)', background: 'transparent',
          fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: '0.05em',
          color: 'var(--ink)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        Continue with GitHub
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <hr style={{ flex: 1, border: '1px solid rgba(42,39,32,0.15)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b' }}>or sign up with email</span>
        <hr style={{ flex: 1, border: '1px solid rgba(42,39,32,0.15)' }} />
      </div>

      <form action={action} style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="section-tag">Your name</span>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Dominic Merlow"
            autoComplete="name"
            style={inputStyle}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b6b6b' }}>
            This shows up as your seller name. You can change it later in your dashboard.
          </span>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span className="section-tag">Email</span>
          <input
            type="email"
            name="email"
            required
            placeholder="you@yourbusiness.com"
            autoComplete="email"
            style={inputStyle}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="btn-hero-primary"
          style={{
            padding: '14px 28px',
            opacity: pending ? 0.6 : 1,
            cursor: pending ? 'wait' : 'pointer',
          }}
        >
          {pending ? 'Sending confirmation…' : 'Create my account →'}
        </button>

        {state?.error && (
          <p style={{ color: 'var(--rust, #c04a1b)', fontFamily: 'var(--font-mono)', fontSize: 14, margin: 0 }}>
            {state.error}
          </p>
        )}
        {state?.message && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            padding: '12px 14px',
            background: 'rgba(63,168,90,0.1)',
            border: '1px solid #3fa85a',
            color: '#2a7a3f',
            margin: 0,
            lineHeight: 1.5,
          }}>
            {state.message.replace(/&apos;/g, "'")}
          </p>
        )}

        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: '#6b6b6b',
          margin: 0,
        }}>
          By creating an account you agree to our{' '}
          <a href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy Policy</a>.
        </p>
      </form>
    </div>
  )
}
