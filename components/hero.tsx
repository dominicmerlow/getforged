import Link from 'next/link'

export default function Hero() {
  return (
    <div className="hero">
      {/* Left column */}
      <div className="hero-left">
        <div className="hero-eyebrow">
          <div className="hero-eyebrow-dot" />
          <span>The AI Builder Marketplace</span>
        </div>

        <h1 className="hero-title">
          Buy the AI tool you would have <em>hired</em> a developer to build.
        </h1>

        <p className="hero-sub">
          Pre-built apps, automations and internal tools — installed in hours, priced like software, owned like assets.
        </p>

        <div className="hero-ctas">
          <Link href="/browse" className="btn-hero-primary">
            Browse the Marketplace
          </Link>
          <Link href="/submit" className="btn-hero-secondary">
            Sell Your Creation
          </Link>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">Under 1 day</div>
            <div className="hero-stat-label">Avg. install time</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">Stripe</div>
            <div className="hero-stat-label">Powered by Stripe</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-num">Supabase</div>
            <div className="hero-stat-label">Backed by Supabase</div>
          </div>
        </div>
      </div>

      {/* Right column — floating product cards */}
      <div className="hero-right">
        <div className="hero-card-stack">

          <div className="hcard">
            <div className="hcard-badge">⚡ AI Automation</div>
            <div className="hcard-title">InvoiceBot Pro</div>
            <div className="hcard-desc">
              Auto-generates, sends and follows up invoices from a simple Notion database.
            </div>
            <div className="hcard-foot">
              <div>
                <div className="hcard-price">£149</div>
                <div className="hcard-price-label">Licensed</div>
              </div>
              <div className="hcard-seller">
                <div className="hcard-avatar">JK</div>
                <div className="hcard-seller-name">@jakek.dev</div>
              </div>
            </div>
          </div>

          <div className="hcard">
            <div className="hcard-badge">🌐 Web App</div>
            <div className="hcard-title">ClientPortal.ai</div>
            <div className="hcard-desc">
              White-label client dashboard with project updates, files and messaging.
            </div>
            <div className="hcard-foot">
              <div>
                <div className="hcard-price">£399</div>
                <div className="hcard-price-label">Exclusive</div>
              </div>
              <div className="hcard-seller">
                <div className="hcard-avatar">SR</div>
                <div className="hcard-seller-name">@sara_builds</div>
              </div>
            </div>
          </div>

          <div className="hcard">
            <div className="hcard-badge">📊 CRM Tool</div>
            <div className="hcard-title">LeadTrackr</div>
            <div className="hcard-desc">
              Lightweight CRM built for service businesses. Airtable-powered, zero code.
            </div>
            <div className="hcard-foot">
              <div>
                <div className="hcard-price">£89</div>
                <div className="hcard-price-label">/month</div>
              </div>
              <div className="hcard-seller">
                <div className="hcard-avatar">ML</div>
                <div className="hcard-seller-name">@mattlowe</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
