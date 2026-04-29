import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Forge offline — back shortly',
  description: 'GetForged is undergoing scheduled maintenance.',
  robots: { index: false, follow: false },
}

// Static — no DB / no settings reads. Safe to serve even when Supabase is
// the very thing we're patching.
export const dynamic = 'force-static'

export default function MaintenancePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 24px',
        background: 'var(--cream, #f4ede0)',
        color: 'var(--warm-ink, #2a2217)',
      }}
    >
      <div style={{ maxWidth: 640, textAlign: 'center', display: 'grid', gap: 24 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--soft-amber, #b97314)',
          }}
        >
          Status · Maintenance
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-bebas)',
            fontSize: 'clamp(64px, 12vw, 144px)',
            lineHeight: 0.9,
            letterSpacing: '0.01em',
            margin: 0,
          }}
        >
          Forge offline
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(18px, 2.4vw, 24px)',
            lineHeight: 1.5,
            margin: 0,
            color: 'rgba(42,34,23,0.78)',
          }}
        >
          We&rsquo;re polishing the anvil. Back shortly.
        </p>

        <div
          style={{
            marginTop: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.08em',
            color: 'rgba(42,34,23,0.55)',
          }}
        >
          Need us urgently?{' '}
          <a
            href="mailto:hello@getforged.io"
            style={{
              color: 'var(--warm-ink, #2a2217)',
              textDecoration: 'underline',
            }}
          >
            hello@getforged.io
          </a>
        </div>
      </div>
    </main>
  )
}
