import Link from 'next/link'
import type { ProductListItem } from '@/lib/products'
import { CATEGORIES } from '@/lib/categories'
import { getBookmarkedIds } from '@/lib/bookmarks'
import { auth } from '@/auth'
import GigCard from '@/components/GigCard'
import CarouselRow from '@/components/CarouselRow'

interface ProductGridProps {
  products: ProductListItem[]
}

/** One auth check + one bookmark query for the whole page, not one per card. */
async function loadSaveState(): Promise<{ authed: boolean; saved: Set<string> }> {
  try {
    const session = await auth()
    if (!session?.user) return { authed: false, saved: new Set() }
    return { authed: true, saved: new Set(await getBookmarkedIds()) }
  } catch {
    return { authed: false, saved: new Set() }
  }
}

/**
 * Homepage listings: one featured row, then a row per category that has stock.
 *
 * Rows rather than a single grid because a marketplace homepage is a shop
 * window, not a catalogue — the visitor is being shown the range, and the
 * browse page is where exhaustive listing belongs. Categories with nothing in
 * them are skipped rather than rendered empty; an empty shelf reads as a broken
 * site.
 */
export default async function ProductGrid({ products }: ProductGridProps) {
  const count = products.length
  const { authed, saved } = await loadSaveState()

  if (count === 0) {
    return (
      <section className="gf-section" id="featured">
        <div className="gf-section-head">
          <div>
            <h2 className="gf-section-title">The forge is warming up</h2>
            <p className="gf-section-sub">
              We&apos;re hand-picking the first wave of builders. Every founding seller gets a
              verified badge and free featured placement for 90 days.
            </p>
          </div>
        </div>
        <Link href="/submit" className="btn btn-primary btn-lg">Become a founding builder</Link>
      </section>
    )
  }

  const featured = products.slice(0, 10)
  // A carousel holding one card is worse than no carousel — it reads as a
  // loading failure. Below this threshold the featured row already shows
  // everything, so the per-category rows add nothing.
  const MIN_ROW = 3
  const byCategory = CATEGORIES
    .map(cat => ({ cat, items: products.filter(p => p.category === cat.dbValue) }))
    .filter(row => row.items.length >= MIN_ROW)

  const card = (product: ProductListItem, priority = false) => (
    <GigCard
      key={product.slug}
      product={product}
      priority={priority}
      saved={product.id ? saved.has(product.id) : false}
      authed={authed}
      returnTo="/"
    />
  )

  return (
    <>
      <section className="gf-section" id="featured">
        <div className="gf-section-head">
          <div>
            <h2 className="gf-section-title">Featured listings</h2>
            <p className="gf-section-sub">Hand-picked tools, reviewed before publishing.</p>
          </div>
          <Link href="/browse" className="btn btn-secondary">See all {count}</Link>
        </div>
        <CarouselRow>{featured.map((p, i) => card(p, i < 4))}</CarouselRow>
      </section>

      {byCategory.map(({ cat, items }) => (
        <section className="gf-section" key={cat.slug} style={{ paddingTop: 0 }}>
          <div className="gf-section-head">
            <div>
              <h2 className="gf-section-title" style={{ fontSize: 24 }}>{cat.label}</h2>
            </div>
            <Link href={`/browse/${cat.slug}`} className="btn btn-secondary btn-sm">
              See all {items.length}
            </Link>
          </div>
          <CarouselRow>{items.map(p => card(p))}</CarouselRow>
        </section>
      ))}
    </>
  )
}
