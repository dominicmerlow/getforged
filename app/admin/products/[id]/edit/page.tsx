import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin'
import AdminEditForm, { type AdminEditableProduct } from './AdminEditForm'

export const dynamic = 'force-dynamic'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

interface SellerLite {
  id: string
  user_id: string
  display_name: string | null
}

/**
 * Per-product admin editor.
 *
 * Hard gate: must hold an admin role per `checkAdminAccess`. Loads the product
 * via the service-role client so seller-scoped RLS is bypassed — admins see
 * (and can edit) any product, regardless of who owns it.
 *
 * Read-only context (seller name + email, timestamps, view_count) is rendered
 * alongside the form so admins know whose listing they're touching before they
 * mutate it. All mutations are written to admin_audit by the action.
 */
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const { id } = await params
  const db = adminDb()

  // Try the full column set first, fall back to the safe set if 008 hasn't
  // been applied. Keeps the admin editor functional during migration windows.
  type LoadedProduct = AdminEditableProduct & {
    seller_id: string
    slug: string | null
    view_count?: number | null
  }
  let product: LoadedProduct | null = null

  const FULL =
    'id, slug, seller_id, title, description, category, status, price_licensed, price_exclusive, featured, featured_position, forge_of_the_week, internal_notes, view_count, created_at, updated_at'
  const SAFE =
    'id, slug, seller_id, title, description, category, status, price_licensed, price_exclusive, created_at'

  let migrationGap = false
  let loadError: string | null = null
  try {
    const full = await db.from('products').select(FULL).eq('id', id).maybeSingle()
    if (full.error) {
      const safe = await db.from('products').select(SAFE).eq('id', id).maybeSingle()
      if (safe.error) throw new Error(safe.error.message)
      if (!safe.data) return notFound()
      migrationGap = true
      product = {
        ...(safe.data as unknown as Record<string, unknown>),
        featured: false,
        featured_position: null,
        forge_of_the_week: false,
        internal_notes: null,
        view_count: 0,
        updated_at: null,
      } as unknown as LoadedProduct
    } else {
      if (!full.data) return notFound()
      product = full.data as unknown as LoadedProduct
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown read error'
  }

  if (loadError) {
    return (
      <>
        <Nav />
        <main>
          <section className="section">
            <div className="section-tag">Admin · Product edit</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(28px,3vw,40px)' }}>
              Couldn&apos;t load product
            </h1>
            <div style={{
              marginTop: 16,
              padding: 14,
              background: 'rgba(192,74,27,0.08)',
              border: '1px solid rgba(192,74,27,0.3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}>
              <strong>Error:</strong> {loadError}
            </div>
            <Link href="/admin/products" style={{ marginTop: 16, display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 13, textDecoration: 'underline' }}>
              ← Back to products
            </Link>
          </section>
        </main>
        <Footer />
      </>
    )
  }
  if (!product) return notFound()

  // Resolve seller info — display_name from sellers, email from auth.users.
  const { data: seller } = await db
    .from('sellers')
    .select('id, user_id, display_name')
    .eq('id', product.seller_id)
    .maybeSingle<SellerLite>()

  let sellerEmail: string | null = null
  if (seller?.user_id) {
    try {
      const { data } = await db.auth.admin.getUserById(seller.user_id)
      sellerEmail = data?.user?.email ?? null
    } catch {
      /* admin API failure is non-fatal — page still renders */
    }
  }

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag" style={{ color: '#b97314' }}>Admin · Product edit</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h1 className="section-title" style={{ fontSize: 'clamp(28px,3vw,40px)' }}>
              {product.title}
            </h1>
            <Link href="/admin/products" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: '#6b6b6b',
              textDecoration: 'underline',
            }}>
              ← Back to products
            </Link>
            {product.slug && (
              <Link href={`/products/${product.slug}`} target="_blank" style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--soft-amber, #b97314)',
                textDecoration: 'underline',
              }}>
                View public page ↗
              </Link>
            )}
          </div>

          {/* Yellow override banner — visible warning that this bypasses ownership */}
          <div style={{
            marginTop: 20,
            padding: 14,
            background: 'rgba(232,146,10,0.08)',
            border: '1px solid rgba(232,146,10,0.4)',
            borderLeft: '3px solid #b97314',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            <strong style={{ color: '#b97314' }}>Admin edit — this bypasses ownership.</strong>{' '}
            All changes are logged to <code>admin_audit</code> with a before/after diff.
          </div>

          {migrationGap && (
            <div style={{
              marginTop: 12,
              padding: 14,
              background: 'rgba(232,146,10,0.06)',
              border: '1px solid rgba(232,146,10,0.3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
            }}>
              <strong>Featured / internal-notes columns not present.</strong>
              {' '}Run <code>008_products_featured.sql</code> in the Supabase SQL editor to enable
              the Featured / Forge-of-the-Week / Internal-notes fields below.
            </div>
          )}

          {/* Read-only seller context */}
          <div style={{
            marginTop: 16,
            padding: 14,
            border: '1px solid rgba(42,39,32,0.12)',
            background: 'rgba(42,39,32,0.03)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}>
            <div>
              <div style={{ color: '#6b6b6b', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Seller</div>
              <div style={{ marginTop: 4, fontWeight: 600 }}>
                {seller?.display_name ?? '(unknown)'}
              </div>
              <div style={{ color: '#6b6b6b' }}>{sellerEmail ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: '#6b6b6b', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Slug</div>
              <div style={{ marginTop: 4 }}>/{product.slug ?? '(none)'}</div>
            </div>
            <div>
              <div style={{ color: '#6b6b6b', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Created</div>
              <div style={{ marginTop: 4 }}>
                {new Date(product.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            {product.updated_at && (
              <div>
                <div style={{ color: '#6b6b6b', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Updated</div>
                <div style={{ marginTop: 4 }}>
                  {new Date(product.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            )}
            {typeof product.view_count === 'number' && (
              <div>
                <div style={{ color: '#6b6b6b', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Views</div>
                <div style={{ marginTop: 4 }}>{product.view_count.toLocaleString()}</div>
              </div>
            )}
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <AdminEditForm product={product} />
        </section>
      </main>
      <Footer />
    </>
  )
}
