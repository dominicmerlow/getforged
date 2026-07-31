import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { getContentBatch } from '@/lib/content'
import { POPULAR_SEARCHES } from '@/lib/categories'
import SearchBar from '@/components/SearchBar'

interface HeroProps {
  totalCount?: number
}

/**
 * Search-first hero.
 *
 * On a marketplace the search field is the primary call to action, not a
 * button — so it gets the visual weight, and the popular-search chips sit
 * directly beneath it to solve the blank-field problem (most visitors know the
 * shape of what they want, not its name).
 *
 * Half-height by design. The previous hero was `min-height: 100vh`, which
 * pushed every listing below the fold; on a directory the listings *are* the
 * product.
 *
 * Copy still comes from `site_content` so admins can edit it without a deploy.
 * The h1/sub fields accept admin-authored HTML — unchanged from before, and
 * still not a path for untrusted input.
 */
export default async function Hero({ totalCount = 0 }: HeroProps) {
  const copy = await getContentBatch([
    'homepage.hero.eyebrow',
    'homepage.hero.h1',
    'homepage.hero.sub',
  ])

  return (
    <section className="gf-hero">
      <div className="gf-hero-inner">
        <div>
          <h1
            className="gf-hero-title"
            dangerouslySetInnerHTML={{ __html: copy['homepage.hero.h1'] }}
          />
          <p
            className="gf-hero-sub"
            dangerouslySetInnerHTML={{ __html: copy['homepage.hero.sub'] }}
          />

          <div className="gf-hero-search">
            <SearchBar size="lg" id="gf-hero-search" placeholder="What do you need built?" />
          </div>

          <div className="gf-hero-popular">
            <span>Popular:</span>
            {POPULAR_SEARCHES.map(term => (
              <Link
                key={term}
                href={`/browse?q=${encodeURIComponent(term)}`}
                className="gf-chip"
              >
                {term}
              </Link>
            ))}
          </div>

          {totalCount > 0 && (
            <p style={{ marginTop: 20, fontSize: 14, color: 'var(--gf-text-2)' }}>
              {totalCount} {totalCount === 1 ? 'listing' : 'listings'} live · reviewed before publishing
            </p>
          )}
        </div>

        <div className="gf-hero-art">
          <Image
            src="/img/hero.jpg"
            alt="A business owner reviewing work on a laptop"
            width={1200}
            height={900}
            priority
            sizes="(max-width: 900px) 0px, 45vw"
          />
          <div className="gf-hero-badge">
            <Star size={16} aria-hidden="true" style={{ color: 'var(--gf-star)', fill: 'var(--gf-star)' }} />
            <span>
              <span className="gf-hero-badge-name">Built by vetted developers</span>
              <br />
              <span className="gf-hero-badge-meta">Every listing reviewed before it goes live</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
