import Link from 'next/link'
import type { ProductListItem } from '@/lib/products'

interface HeroProps {
  cards?: ProductListItem[]
  totalCount?: number
}

export default function Hero({ cards = [], totalCount = 0 }: HeroProps) {
  return (
    <div className="hero">
      {/* Left column */}
      <div className="hero-left">
        <div className="hero-eyebrow">
          <div className="hero-eyebrow-dot" />
          <span>The AI Builder Marketplace</span>
        </div>

        <h1 className="hero-title">
          Buy the AI tool you would<br />
          have <em>hired</em> a<br />
          developer to build.
        </h1>

        <p className="hero-sub">
          <strong>Pre-built apps, automations and internal tools</strong> —
          installed in hours, priced like software, owned like assets.
          From £49.
        </p>

        <div className="hero-ctas">
          <Link href="/browse" className="btn-hero-primary">
            Browse the Marketplace →
          </Link>
          <Link href="/concierge" className="btn-hero-secondary">
            Find My Tool with AI
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

      {/* Right column — real product cards from Supabase */}
      <div className="hero-right">
        <div className="hero-card-stack">
          {cards.length === 0 && (
            <div className="hcard">
              <div className="hcard-badge">✨ Now open</div>
              <div className="hcard-title">Founding Builders Wanted</div>
              <div className="hcard-desc">
                We&apos;re curating the first wave of AI-built tools. List your app free and earn the Founding Builder badge.
              </div>
              <div className="hcard-foot">
                <div>
                  <div className="hcard-price">Free</div>
                  <div className="hcard-price-label">to list</div>
                </div>
                <Link href="/submit" className="hcard-seller" style={{ textDecoration: 'none' }}>
                  <div className="hcard-seller-name">Apply →</div>
                </Link>
              </div>
            </div>
          )}

          {cards.slice(0, 3).map(card => (
            <Link
              key={card.slug}
              href={`/products/${card.slug}`}
              className="hcard"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div className="hcard-badge">{card.emoji} {card.category}</div>
              <div className="hcard-title">{card.title}</div>
              <div className="hcard-desc">{card.description}</div>
              <div className="hcard-foot">
                <div>
                  <div className="hcard-price">{card.priceMain}</div>
                  <div className="hcard-price-label">{card.type}</div>
                </div>
                <div className="hcard-seller">
                  <div className="hcard-seller-name">View →</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {totalCount > 0 && (
          <div style={{
            marginTop: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted, #6b6b6b)',
            textAlign: 'center',
          }}>
            {totalCount} live {totalCount === 1 ? 'listing' : 'listings'} · curated weekly
          </div>
        )}
      </div>
    </div>
  )
}
