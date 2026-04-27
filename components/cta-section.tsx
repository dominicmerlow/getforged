import Link from 'next/link'
import NewsletterCapture from '@/components/NewsletterCapture'

export default function CTASection() {
  return (
    <div className="cta-section">
      <div className="section-tag" style={{ justifyContent: 'center' }}>Get Started</div>

      <h2 className="section-title" style={{ maxWidth: '700px', margin: '0 auto' }}>
        The Window<br />Is <span>Open.</span>
      </h2>

      <p className="section-body" style={{ textAlign: 'center', margin: '0 auto 44px' }}>
        AI builders are creating a new asset class. Small businesses need exactly
        what you&apos;ve made. GetForged is where they meet.
      </p>

      <div className="cta-buttons">
        <Link href="/register" className="btn-hero-primary" style={{ padding: '16px 40px', fontSize: '14px' }}>
          List Your First App Free
        </Link>
        <Link href="/browse" className="btn-hero-secondary" style={{ padding: '16px 40px', fontSize: '14px' }}>
          Browse Products
        </Link>
      </div>

      {/* Newsletter capture — primary growth loop pre-launch */}
      <div style={{
        margin: '64px auto 0',
        maxWidth: 540,
        textAlign: 'left',
      }}>
        <NewsletterCapture
          source="homepage"
          variant="card"
          heading="Forge of the Week"
          subhead="One curated AI-built tool, in your inbox every Tuesday. Built by real makers. No noise, no hype."
          ctaLabel="Get the first issue"
        />
      </div>
    </div>
  )
}
