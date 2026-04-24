'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GetForged error]', error)
  }, [error])

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      fontFamily: 'var(--font-mono)', padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b97314' }}>
        Something went wrong
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(24px,3vw,40px)', margin: 0 }}>
        We hit an unexpected error.
      </h2>
      <p style={{ color: '#6b6b6b', maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
        {error.digest ? `Error ID: ${error.digest}` : 'No details available.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '12px 28px', background: 'var(--ink, #2a2217)', color: 'var(--cream, #fbf6ec)',
          border: 'none', fontFamily: 'var(--font-mono)', fontSize: 14,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
