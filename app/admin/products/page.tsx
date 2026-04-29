import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin'
import ProductTable, { type AdminProductRow } from './ProductTable'
import ForgeOfTheWeekPicker from './ForgeOfTheWeekPicker'

export const dynamic = 'force-dynamic'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

interface RawRow {
  id: string
  slug: string | null
  title: string
  status: string
  category: string | null
  price_licensed: number | null
  price_exclusive: number | null
  featured?: boolean | null            // optional — exists only if 008 applied
  featured_position?: number | null
  forge_of_the_week?: boolean | null
  screenshots: string[] | null
  view_count?: number | null            // optional — exists only if 003 applied
  created_at: string
  seller: { display_name: string } | { display_name: string }[] | null
}

// Columns that always exist (pre-008 baseline)
const SAFE_COLUMNS =
  'id, slug, title, status, category, price_licensed, price_exclusive, screenshots, created_at, seller:sellers!inner(display_name)'

// Columns added by migrations 003 + 008 — included if available
const FULL_COLUMNS =
  'id, slug, title, status, category, price_licensed, price_exclusive, featured, featured_position, forge_of_the_week, screenshots, view_count, created_at, seller:sellers!inner(display_name)'

/**
 * Admin Products screen — Phase 3 of the admin suite.
 *
 * Lists every product in the catalogue (any status), joinned with its
 * seller's display_name. Client-side filters + bulk action bar handle
 * everything inside the page; no URL state for v1.
 *
 * Loads up to 500 rows in one shot — fine until the marketplace passes
 * a few hundred products. Past that we'll need server-side pagination
 * + URL filters.
 */
export default async function AdminProductsPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const db = adminDb()

  // Two-pass query: try the full column set first; if migration 008 (and/or
  // 003) hasn't been applied, retry with the safe baseline. This means the
  // page renders with real data even pre-migration; the new flag columns
  // just default to false / 0 in the reshape step below.
  let rows: RawRow[] = []
  let loadError: string | null = null
  let usedFallback = false
  try {
    const { data, error } = await db
      .from('products')
      .select(FULL_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      // Most likely: column-not-found. Retry with safe columns so the page
      // still works before migration is applied.
      const { data: safeData, error: safeError } = await db
        .from('products')
        .select(SAFE_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(500)
      if (safeError) throw new Error(safeError.message)
      rows = (safeData ?? []) as RawRow[]
      usedFallback = true
    } else {
      rows = (data ?? []) as RawRow[]
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown read error'
  }

  // Reshape rows for the client component.
  const products: AdminProductRow[] = rows.map(r => {
    const seller = Array.isArray(r.seller) ? r.seller[0] : r.seller
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: (r.status as AdminProductRow['status']) ?? 'draft',
      category: r.category,
      price_licensed: r.price_licensed,
      price_exclusive: r.price_exclusive,
      featured: !!r.featured,
      featured_position: r.featured_position ?? null,
      forge_of_the_week: !!r.forge_of_the_week,
      has_screenshot: !!(r.screenshots && r.screenshots.length > 0),
      view_count: r.view_count ?? 0,
      created_at: r.created_at,
      seller_name: seller?.display_name ?? '(unknown)',
    }
  })

  // Distinct values for filter dropdowns
  const categories = Array.from(
    new Set(products.map(p => p.category).filter((c): c is string => !!c))
  ).sort()
  const sellers = Array.from(new Set(products.map(p => p.seller_name))).sort()

  const counts = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
        <section className="section">
          <div className="section-tag">Admin · Products</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h1 className="section-title" style={{ fontSize: 'clamp(36px,4.5vw,56px)' }}>
              Products
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <span><strong>{products.length}</strong> total</span>
            <span><strong>{counts.live ?? 0}</strong> live</span>
            <span><strong>{counts.draft ?? 0}</strong> draft</span>
            <span><strong>{counts.archived ?? 0}</strong> archived</span>
            <span><strong>{products.filter(p => p.featured).length}</strong> featured</span>
            <span><strong>{products.filter(p => !p.has_screenshot).length}</strong> missing screenshot</span>
          </div>

          {loadError && (
            <div style={{
              marginTop: 16,
              padding: 14,
              background: 'rgba(192,74,27,0.08)',
              border: '1px solid rgba(192,74,27,0.3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
            }}>
              <strong>Couldn&apos;t load products:</strong> {loadError}
            </div>
          )}

          {usedFallback && !loadError && (
            <div style={{
              marginTop: 16,
              padding: 14,
              background: 'rgba(232,146,10,0.08)',
              border: '1px solid rgba(232,146,10,0.3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
            }}>
              <strong>Featured-flag columns not present.</strong>
              {' '}Showing products without ★ Feature / Forge of the Week support.
              {' '}Run <code>008_products_featured.sql</code> in Supabase SQL editor to enable these.
            </div>
          )}

          {!loadError && !usedFallback && rows.length === 0 && (
            <div style={{
              marginTop: 16,
              padding: 14,
              background: 'rgba(42,39,32,0.05)',
              border: '1px dashed rgba(42,39,32,0.2)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
            }}>
              <strong>Query returned 0 rows.</strong>
              {' '}If you expect to see products, the most common cause is that they
              exist but have no <code>seller</code> row joined via the inner join.
              Check that each product&apos;s <code>seller_id</code> matches an existing
              row in <code>sellers</code>.
            </div>
          )}
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          {/* Forge of the Week picker — only show if 008 columns are present
              (otherwise forge_of_the_week is always false and picker is moot) */}
          {!usedFallback && (
            <div style={{ marginBottom: 16 }}>
              <ForgeOfTheWeekPicker
                products={products
                  .filter(p => p.status === 'live')
                  .map(p => ({ id: p.id, title: p.title, slug: p.slug, forge_of_the_week: p.forge_of_the_week }))}
              />
            </div>
          )}

          <ProductTable products={products} categories={categories} sellers={sellers} />
        </section>
    </>
  )
}
