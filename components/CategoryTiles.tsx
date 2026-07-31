import Link from 'next/link'
import { Bot, AppWindow, Users, Megaphone, ShoppingCart, Workflow } from 'lucide-react'
import { CATEGORIES, type Category } from '@/lib/categories'

/* Icons are SVG components, never emoji — emoji render differently on every
   platform and carry no semantic meaning to a screen reader. */
const ICONS = { Bot, AppWindow, Users, Megaphone, ShoppingCart, Workflow } as const

function TileIcon({ name }: { name: Category['icon'] }) {
  const Icon = ICONS[name]
  return <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
}

/**
 * The category row directly beneath the hero — the second-most-used navigation
 * on a marketplace after search, because most visitors arrive knowing the kind
 * of thing they want but not its name.
 */
export default function CategoryTiles() {
  return (
    <nav className="gf-tiles" aria-label="Browse by category">
      {CATEGORIES.map(cat => (
        <Link key={cat.slug} href={`/browse/${cat.slug}`} className="gf-tile">
          <TileIcon name={cat.icon} />
          <span>{cat.label}</span>
        </Link>
      ))}
    </nav>
  )
}
