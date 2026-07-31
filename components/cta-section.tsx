import Link from 'next/link'
import NewsletterCapture from '@/components/NewsletterCapture'

/**
 * Closing seller CTA — the last section before the footer, per the marketplace
 * pattern. Dark band so it reads as a boundary rather than one more white
 * section, and the newsletter sits below the buttons so it competes with
 * nothing.
 */
export default function CTASection() {
  return (
    <div className="cta-section">
      <div style={{ maxWidth: 640, marginInline: 'auto' }}>
        <h2 className="gf-section-title" style={{ color: 'var(--gf-text-invert)', marginBottom: 12 }}>
          List your first app free
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 17, marginBottom: 28 }}>
          AI builders are creating a new asset class, and small businesses need exactly what
          you&apos;ve made. GetForged is where they meet.
        </p>

        <div className="cta-buttons">
          <Link href="/register" className="btn btn-primary btn-lg">Start selling free</Link>
          <Link href="/browse" className="btn btn-secondary btn-lg">Browse the marketplace</Link>
        </div>

        <div style={{ margin: '48px auto 0', maxWidth: 520, textAlign: 'left' }}>
          <NewsletterCapture
            source="homepage"
            variant="card"
            heading="Forge of the Week"
            subhead="One curated AI-built tool in your inbox every Tuesday. Built by real makers, no hype."
            ctaLabel="Get the first issue"
          />
        </div>
      </div>
    </div>
  )
}
