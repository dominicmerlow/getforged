/**
 * Single source of truth for the marketplace's top-level categories.
 *
 * The long-form landing copy (h1, use cases, meta) still lives in
 * app/browse/[category]/page.tsx — that's page content. What lives here is the
 * navigational identity of a category: its slug, its short label, and the value
 * stored in `products.category`. The header, the homepage tiles, and the
 * category routes all read from this list so they can never drift apart.
 *
 * `dbValue` is deliberately separate from `label`: the DB stores 'Web App'
 * while the UI says 'Web Apps & Tools'. Changing display copy must not require
 * a data migration.
 */
export interface Category {
  slug: string
  /** Full label — used on category landing pages and tiles */
  label: string
  /** Compact label for the header strip, where horizontal space is scarce */
  short: string
  /** The exact string stored in `products.category` */
  dbValue: string
  /** lucide-react icon name, resolved by components/CategoryTiles.tsx */
  icon: 'Bot' | 'AppWindow' | 'Users' | 'Megaphone' | 'ShoppingCart' | 'Workflow'
}

export const CATEGORIES: Category[] = [
  { slug: 'ai-automation', label: 'AI Automation',           short: 'AI Automation', dbValue: 'AI Automation', icon: 'Bot' },
  { slug: 'web-apps',      label: 'Web Apps & Tools',        short: 'Web Apps',      dbValue: 'Web App',       icon: 'AppWindow' },
  { slug: 'crm-sales',     label: 'CRM & Sales',             short: 'CRM & Sales',   dbValue: 'CRM & Sales',   icon: 'Users' },
  { slug: 'marketing',     label: 'Marketing & Growth',      short: 'Marketing',     dbValue: 'Marketing',     icon: 'Megaphone' },
  { slug: 'ecommerce',     label: 'E-Commerce',              short: 'E-Commerce',    dbValue: 'E-Commerce',    icon: 'ShoppingCart' },
  { slug: 'operations',    label: 'Operations & Workflows',  short: 'Operations',    dbValue: 'Operations',    icon: 'Workflow' },
]

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find(c => c.slug === slug)
}

export function categoryByDbValue(dbValue: string): Category | undefined {
  return CATEGORIES.find(c => c.dbValue === dbValue)
}

/** Popular search terms shown beneath the hero search field. */
export const POPULAR_SEARCHES = [
  'Invoice automation',
  'Client portal',
  'Lead routing',
  'AI chatbot',
  'Dashboard',
]
