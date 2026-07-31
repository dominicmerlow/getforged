import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import type { ProductListItem } from '@/lib/products'
import CardSaveButton from '@/components/CardSaveButton'

interface GigCardProps {
  product: ProductListItem
  /** Above-the-fold cards get priority image loading; everything else lazy-loads */
  priority?: boolean
  /** Whether the signed-in user has saved this listing (from a bulk lookup) */
  saved?: boolean
  /** Omit the heart entirely — e.g. inside the admin console */
  showSave?: boolean
  authed?: boolean
  returnTo?: string
  /** Extra control for the card footer, e.g. the compare toggle on /browse */
  action?: React.ReactNode
}

/**
 * The listing card. Field order is fixed (see design-system/MASTER.md §5) —
 * thumbnail, seller, title, rating, tags, price — because a marketplace grid is
 * scanned vertically down a column, and a card that reorders its own fields
 * forces the eye to re-parse every tile.
 *
 * Two honesty rules are enforced here rather than left to callers:
 *
 *   1. No rating is invented. A listing with zero reviews shows a `New` pill,
 *      the way Fiverr marks new sellers. Rendering "5.0 (0)" or a placeholder
 *      score would be a fabricated trust signal.
 *   2. No stock photography. If a seller hasn't supplied a screenshot we draw a
 *      gradient with the product's initial — clearly a placeholder — rather
 *      than a stock photo that implies the product looks like something it
 *      doesn't.
 */
export default function GigCard({
  product,
  priority = false,
  saved = false,
  showSave = true,
  authed = false,
  returnTo = '/browse',
  action,
}: GigCardProps) {
  const {
    slug, title, description, tagline, category, tags,
    priceMain, type, thumb, heroImage,
    sellerName, sellerVerified, rating, ratingCount,
  } = product

  const href = `/products/${slug}`
  const summary = tagline || description
  const initial = title.trim().charAt(0).toUpperCase() || '?'

  return (
    <article className="gf-card">
      <div className="gf-card-media">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${title} screenshot`}
            width={480}
            height={270}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            // Screenshots come from Firecrawl's scrape-time CDN (unpredictable
            // hostname per capture) or a seller's Blob upload — not a fixed
            // domain Next's optimizer can allowlist. Same reasoning as
            // ProductScreenshot.tsx and the product-detail gallery.
            unoptimized
          />
        ) : (
          /* Placeholder, not a photo — see rule 2 above */
          <div className={`gf-card-media-fallback ${thumb}`} aria-hidden="true">
            {initial}
          </div>
        )}

        <span className="gf-card-flag">{category}</span>

        {showSave && product.id && (
          <CardSaveButton
            productId={product.id}
            saved={saved}
            authed={authed}
            returnTo={returnTo}
          />
        )}
      </div>

      <div className="gf-card-body">
        {sellerName && (
          <div className="gf-card-seller">
            <span className="gf-avatar" aria-hidden="true">
              {sellerName.trim().charAt(0).toUpperCase()}
            </span>
            <span className="gf-card-seller-name">{sellerName}</span>
            {sellerVerified && <span className="gf-badge-level">Verified</span>}
          </div>
        )}

        <h3 className="gf-card-title">
          <Link href={href}>
            {summary || title}
          </Link>
        </h3>

        <div className="gf-rating">
          {rating !== null && ratingCount > 0 ? (
            <>
              <Star size={15} aria-hidden="true" />
              <span className="gf-rating-score">{rating.toFixed(1)}</span>
              <span className="gf-rating-count">({ratingCount})</span>
            </>
          ) : (
            /* Zero reviews — say so, don't invent a score */
            <span className="gf-rating-new">New</span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="gf-card-tags">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="gf-pill">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="gf-card-foot">
        <span className="gf-pill">{type}</span>
        {/* Raised above the stretched title link so it stays clickable */}
        {action && <span style={{ position: 'relative', zIndex: 2 }}>{action}</span>}
        <span className="gf-card-price">
          <span className="gf-card-price-from">From</span>
          <span className="gf-card-price-value">{priceMain}</span>
        </span>
      </div>
    </article>
  )
}
