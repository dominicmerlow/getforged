import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { checkAdminAccess } from '@/lib/admin'
import { db } from '@/lib/db'
import { products, sellers } from '@/db/schema'
import ProductTable, { type AdminProductRow } from './ProductTable'
import ForgeOfTheWeekPicker from './ForgeOfTheWeekPicker'

export const dynamic = 'force-dynamic'

/**
 * Admin Products screen.
 *
 * Lists every product in the catalogue (any status), joined with its
 * seller's display name. Client-side filters + bulk action bar handle
 * everything inside the page; no URL state for v1.
 *
 * Loads up to 500 rows in one shot — fine until the marketplace passes a
 * few hundred products. Past that we'll need server-side pagination + URL
 * filters.
 */
export default async function AdminProductsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  let rows: (typeof products.$inferSelect & { sellerName: string | null })[] = []
  let loadError: string | null = null
  try {
    // Left join — a product whose seller row is missing (shouldn't happen,
    // but a hard `inner` join would silently drop it from the admin view
    // entirely, which is the wrong failure mode for a moderation screen)
    // still appears, with "(unknown)" for the seller.
    const joined = await db
      .select({ product: products, sellerName: sellers.displayName })
      .from(products)
      .leftJoin(sellers, eq(products.sellerId, sellers.id))
      .orderBy(desc(products.createdAt))
      .limit(500)
    rows = joined.map(r => ({ ...r.product, sellerName: r.sellerName }))
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown read error'
  }

  const productRows: AdminProductRow[] = rows.map(r => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    category: r.category,
    price_licensed: r.priceLicensed,
    price_exclusive: r.priceExclusive,
    featured: !!r.featured,
    featured_position: r.featuredPosition ?? null,
    forge_of_the_week: !!r.forgeOfTheWeek,
    has_screenshot: !!(r.screenshots && r.screenshots.length > 0),
    view_count: r.views ?? 0,
    created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    seller_name: r.sellerName ?? '(unknown)',
  }))

  const categories = Array.from(
    new Set(productRows.map(p => p.category).filter((c): c is string => !!c))
  ).sort()
  const sellerNames = Array.from(new Set(productRows.map(p => p.seller_name))).sort()

  const counts = productRows.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <h1 className="gf-admin-title">Products</h1>

      <div className="gf-stats">
        <div className="gf-stat"><div className="gf-stat-label">Total</div><div className="gf-stat-value">{productRows.length}</div></div>
        <div className="gf-stat"><div className="gf-stat-label">Live</div><div className="gf-stat-value">{counts.live ?? 0}</div></div>
        <div className="gf-stat"><div className="gf-stat-label">Draft</div><div className="gf-stat-value">{counts.draft ?? 0}</div></div>
        <div className="gf-stat"><div className="gf-stat-label">Archived</div><div className="gf-stat-value">{counts.archived ?? 0}</div></div>
        <div className="gf-stat"><div className="gf-stat-label">Featured</div><div className="gf-stat-value">{productRows.filter(p => p.featured).length}</div></div>
        <div className="gf-stat"><div className="gf-stat-label">Missing screenshot</div><div className="gf-stat-value">{productRows.filter(p => !p.has_screenshot).length}</div></div>
      </div>

      {loadError && (
        <div style={{
          marginBottom: 20, padding: 14, borderRadius: 'var(--gf-radius)',
          background: 'rgba(194,55,74,0.06)', border: '1px solid var(--gf-danger)',
          fontSize: 13, color: 'var(--gf-danger)',
        }}>
          <strong>Couldn&apos;t load products:</strong> {loadError}
        </div>
      )}

      {!loadError && productRows.length === 0 && (
        <div style={{
          marginBottom: 20, padding: 14, borderRadius: 'var(--gf-radius)',
          background: 'var(--gf-surface-2)', border: '1px dashed var(--gf-line-strong)',
          fontSize: 13, color: 'var(--gf-text-2)',
        }}>
          No products yet.
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <ForgeOfTheWeekPicker
          products={productRows
            .filter(p => p.status === 'live')
            .map(p => ({ id: p.id, title: p.title, slug: p.slug, forge_of_the_week: p.forge_of_the_week }))}
        />
      </div>

      <ProductTable products={productRows} categories={categories} sellers={sellerNames} />
    </>
  )
}
