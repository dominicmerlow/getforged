'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fbf6ec', color: '#2a2217', fontFamily: 'sans-serif' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 24, padding: 40, textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 32, margin: 0 }}>GetForged — Something broke</h1>
          <p style={{ color: '#666', margin: 0 }}>{error.digest ?? 'Unknown error'}</p>
          <button
            onClick={reset}
            style={{
              padding: '12px 28px', background: '#2a2217', color: '#fbf6ec',
              border: 'none', fontSize: 14, cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
