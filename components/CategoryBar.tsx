import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

interface CategoryBarProps {
  /** Slug of the category currently being viewed, if any */
  activeSlug?: string
}

/**
 * Second header row — the persistent category strip.
 *
 * Scrolls horizontally on narrow viewports rather than wrapping to two lines or
 * collapsing into a menu: keeping the categories one tap away on mobile is the
 * whole point of the row. The scrollbar is hidden but the overflow is real, so
 * touch and trackpad scrolling both work.
 */
export default function CategoryBar({ activeSlug }: CategoryBarProps) {
  return (
    <div className="gf-catbar">
      <nav className="gf-catbar-inner no-scrollbar" aria-label="Product categories">
        <Link href="/browse" aria-current={activeSlug ? undefined : 'page'}>
          All categories
        </Link>
        {CATEGORIES.map(cat => (
          <Link
            key={cat.slug}
            href={`/browse/${cat.slug}`}
            aria-current={activeSlug === cat.slug ? 'page' : undefined}
          >
            {cat.short}
          </Link>
        ))}
      </nav>
    </div>
  )
}
