'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  signInWithEmail, signInWithPassword, signInWithGitHub, signInWithGoogle,
  type AuthState,
} from '@/app/actions/auth'

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

const oauthButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '13px 20px', width: '100%', cursor: 'pointer',
  border: '1px solid var(--ink)', background: 'transparent',
  fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: '0.05em',
  color: 'var(--ink)',
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.25 21.3 7.31 24 12 24z"/>
      <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.75l4-3.11z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.63l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"/>
    </svg>
  )
}

export default function LoginForm() {
  const [magicState, magicAction, magicPending] = useActionState(signInWithEmail, initial)
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, initial)
  const [mode, setMode] = useState<'password' | 'magic'>('password')

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420, width: '100%' }}>
      <form action={signInWithGitHub}>
        <button type="submit" style={oauthButtonStyle}>
          <GitHubIcon />
          Continue with GitHub
        </button>
      </form>
      <form action={signInWithGoogle}>
        <button type="submit" style={oauthButtonStyle}>
          <GoogleIcon />
          Continue with Google
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <hr style={{ flex: 1, border: '1px solid rgba(42,39,32,0.15)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b' }}>or use email</span>
        <hr style={{ flex: 1, border: '1px solid rgba(42,39,32,0.15)' }} />
      </div>

      {mode === 'password' ? (
        <form action={pwAction} style={{ display: 'grid', gap: 16 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span className="section-tag">Email</span>
            <input type="email" name="email" required placeholder="you@company.com" autoComplete="email" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 8 }}>
            <span className="section-tag">Password</span>
            <input type="password" name="password" required placeholder="••••••••" autoComplete="current-password" style={inputStyle} />
          </label>

          <button type="submit" disabled={pwPending} className="btn-hero-primary" style={{ padding: '14px 28px', opacity: pwPending ? 0.6 : 1 }}>
            {pwPending ? 'Signing in…' : 'Sign in'}
          </button>

          {pwState?.error && (
            <p style={{ color: 'var(--rust, #c04a1b)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{pwState.error}</p>
          )}

          <button
            type="button"
            onClick={() => setMode('magic')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', textDecoration: 'underline', justifySelf: 'start', padding: 0 }}
          >
            Use a magic link instead
          </button>
        </form>
      ) : (
        <form action={magicAction} style={{ display: 'grid', gap: 16 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span className="section-tag">Email</span>
            <input type="email" name="email" required placeholder="you@company.com" autoComplete="email" style={inputStyle} />
          </label>

          <button type="submit" disabled={magicPending} className="btn-hero-primary" style={{ padding: '14px 28px', opacity: magicPending ? 0.6 : 1 }}>
            {magicPending ? 'Sending…' : 'Send magic link'}
          </button>

          {magicState?.error && (
            <p style={{ color: 'var(--rust, #c04a1b)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{magicState.error}</p>
          )}
          {magicState?.message && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{magicState.message}</p>
          )}

          <button
            type="button"
            onClick={() => setMode('password')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', textDecoration: 'underline', justifySelf: 'start', padding: 0 }}
          >
            Use a password instead
          </button>
        </form>
      )}

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', margin: 0, textAlign: 'center' }}>
        New to GetForged?{' '}
        <Link href="/register" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Create an account →
        </Link>
      </p>
    </div>
  )
}
