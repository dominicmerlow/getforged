import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { checkAdminAccess } from '@/lib/admin'
import { db } from '@/lib/db'
import { products, sellers, users } from '@/db/schema'
import AdminEditForm, { type AdminEditableProduct } from './AdminEditForm'

export const dynamic = 'force-dynamic'

/**
 * Per-product admin editor.
 *
 * Hard gate: must hold an admin role per `checkAdminAccess`. Loads the
 * product directly — there's no RLS to bypass anymore, so admins simply
 * query any row; the role check above is what makes that safe.
 *
 * Read-only context (seller name + email, timestamps, view count) is
 * rendered alongside the form so admins know whose listing they're touching
 * before they mutate it. All mutations are written to admin_audit.
 */
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  const { id } = await params

  const row = await db.query.products.findFirst({ where: eq(products.id, id) })
  if (!row) return notFound()

  const product: AdminEditableProduct & { seller_id: string; slug: string | null; view_count?: number | null; updated_at?: string | null; created_at: string } = {
    id: row.id,
    slug: row.slug,
    seller_id: row.sellerId,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    price_licensed: row.priceLicensed,
    price_exclusive: row.priceExclusive,
    featured: row.featured ?? false,
    featured_position: row.featuredPosition ?? null,
    forge_of_the_week: row.forgeOfTheWeek ?? false,
    internal_notes: row.internalNotes,
    view_count: row.views ?? 0,
    created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
  }

  const sellerRow = await db.query.sellers.findFirst({ where: eq(sellers.id, row.sellerId) })
  let sellerEmail: string | null = null
  if (sellerRow?.userId) {
    const userRow = await db.query.users.findFirst({
      where: eq(users.id, sellerRow.userId),
      columns: { email: true },
    })
    sellerEmail = userRow?.email ?? null
  }

  return (
    <>
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
              {sellerRow?.displayName ?? '(unknown)'}
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
    </>
  )
}
