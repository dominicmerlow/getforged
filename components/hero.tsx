import Link from 'next/link'
import type { ProductListItem } from '@/lib/products'
import { getContentBatch } from '@/lib/content'

interface HeroProps {
  cards?: ProductListItem[]
  totalCount?: number
}

/**
 * Server component — reads editable copy from site_content via getContentBatch,
 * with hardcoded defaults in lib/content-defaults.ts as fallback. Admins can
 * change every string here from /admin/content without a redeploy.
 *
 * Rich-text fields (h1, sub) accept HTML; we use dangerouslySetInnerHTML
 * because the source is admin-authored, not user-generated. Add sanitisation
 * here if untrusted writers ever get content_key edit permissions.
 */
export default async function Hero({ cards = [], totalCount = 0 }: HeroProps) {
  const copy = await getContentBatch([
    'homepage.hero.eyebrow',
    'homepage.hero.h1',
    'homepage.hero.sub',
    'homepage.hero.cta_primary_label',
    'homepage.hero.cta_secondary_label',
  ])

  return (
    <div className="hero">
      {/* Left column */}
      <div className="hero-left">
        <div className="hero-eyebrow">
          <div className="hero-eyebrow-dot" />
          <span>{copy['homepage.hero.eyebrow']}</span>
        </div>

        <h1
          className="hero-title"
          dangerouslySetInnerHTML={{ __html: copy['homepage.hero.h1'] }}
        />

        <p
          className="hero-sub"
          dangerouslySetInnerHTML={{ __html: copy['homepage.hero.sub'] }}
        />

        <div className="hero-ctas">
          <Link href="/browse" className="btn-hero-primary">
            {copy['homepage.hero.cta_primary_label']}
          </Link>
          <Link href="/concierge" className="btn-hero-secondary">
            {copy['homepage.hero.cta_secondary_label']}
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
