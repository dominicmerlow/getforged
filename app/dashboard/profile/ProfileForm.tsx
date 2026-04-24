'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { updateProfile, type ProfileState } from './actions'

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

interface ProfileFormProps {
  display_name: string
  bio: string | null
  avatar_url: string | null
}

export default function ProfileForm({ display_name, bio, avatar_url }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, null)

  const ok = state && 'ok' in state && state.ok
  const error = state && 'error' in state ? state.error : null

  if (ok) {
    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#2a6e3f' }}>
          Profile updated.
        </p>
        <Link
          href="/dashboard"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--amber)', textDecoration: 'underline' }}
        >
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <form action={action} style={{ display: 'grid', gap: 20, maxWidth: 560 }}>
      <label style={{ display: 'grid', gap: 8 }}>
        <span className="section-tag">Display name <span style={{ color: '#b97314' }}>*</span></span>
        <input
          type="text"
          name="display_name"
          required
          defaultValue={display_name}
          placeholder="Your builder name"
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'grid', gap: 8 }}>
        <span className="section-tag">Bio (optional)</span>
        <textarea
          name="bio"
          rows={4}
          defaultValue={bio ?? ''}
          placeholder="Tell buyers who you are and what you build…"
          style={{ ...inputStyle, fontFamily: 'var(--font-serif)', fontSize: 16, resize: 'vertical' }}
        />
      </label>

      <label style={{ display: 'grid', gap: 8 }}>
        <span className="section-tag">Avatar URL (optional)</span>
        <input
          type="url"
          name="avatar_url"
          defaultValue={avatar_url ?? ''}
          placeholder="https://example.com/avatar.jpg"
          style={inputStyle}
        />
      </label>

      {error && (
        <p style={{ color: '#c04a1b', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={pending}
          className="btn-hero-primary"
          style={{ padding: '14px 28px', opacity: pending ? 0.6 : 1, cursor: pending ? 'wait' : 'pointer' }}
        >
          {pending ? 'Saving…' : 'Save profile →'}
        </button>
        <Link
          href="/dashboard"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)', textDecoration: 'underline' }}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
