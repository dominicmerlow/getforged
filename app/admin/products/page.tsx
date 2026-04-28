import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin'
import ProductTable, { type AdminProductRow } from './ProductTable'

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
  featured: boolean | null
  featured_position: number | null
  forge_of_the_week: boolean | null
  screenshots: string[] | null
  view_count: number | null
  created_at: string
  seller: { display_name: string } | { display_name: string }[] | null
}

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

  // Belt-and-braces: if migration 008 hasn't been applied yet, the
  // featured / forge_of_the_week / featured_position columns won't
  // exist. We catch the error and surface a clear instruction.
  let rows: RawRow[] = []
  let loadError: string | null = null
  try {
    const { data, error } = await db
      .from('products')
      .select(
        'id, slug, title, status, category, price_licensed, price_exclusive, featured, featured_position, forge_of_the_week, screenshots, view_count, created_at, seller:sellers!inner(display_name)'
      )
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message)
    rows = (data ?? []) as RawRow[]
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
      featured_position: r.featured_position,
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
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Admin · Products</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h1 className="section-title" style={{ fontSize: 'clamp(36px,4.5vw,56px)' }}>
              Products
            </h1>
            <Link href="/admin" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: '#6b6b6b',
              textDecoration: 'underline',
            }}>
              ← Admin overview
            </Link>
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
              <br />
              Most likely cause: <code>008_products_featured.sql</code> migration hasn&apos;t been applied yet
              (it adds the <code>featured</code>, <code>featured_position</code>, <code>forge_of_the_week</code> columns).
              Run it in the Supabase SQL editor.
            </div>
          )}
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <ProductTable products={products} categories={categories} sellers={sellers} />
        </section>
      </main>
      <Footer />
    </>
  )
}
