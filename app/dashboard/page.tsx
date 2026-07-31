import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq, desc, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { products, sellers, salesPages, messages } from '@/db/schema'
import type { ProductStatus } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { updateProductStatus } from './actions'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your GetForged product listings.',
}

export const dynamic = 'force-dynamic'

const STATUS_ACTIONS: Record<ProductStatus, { next: ProductStatus; label: string; primary?: boolean }[]> = {
  draft: [
    { next: 'live', label: 'Publish', primary: true },
    { next: 'archived', label: 'Archive' },
  ],
  live: [
    { next: 'draft', label: 'Unpublish' },
    { next: 'archived', label: 'Archive' },
  ],
  archived: [
    { next: 'draft', label: 'Restore' },
  ],
}

/** Order listings so the ones needing attention surface first. */
const STATUS_ORDER: Record<ProductStatus, number> = { draft: 0, live: 1, archived: 2 }

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="gf-panel">
      <div className="gf-panel-body" style={{ padding: 40, textAlign: 'center' }}>
        {children}
      </div>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string }>
}) {
  const { claimed } = await searchParams

  if (!dbConfigured()) {
    return (
      <>
        <h1 className="gf-admin-title">Not connected</h1>
        <p className="gf-admin-sub">
          Set <code>DATABASE_URL</code> in <code>.env.local</code> to use the dashboard.
        </p>
      </>
    )
  }

  const session = await auth()
  if (!session?.user) redirect('/login')

  const sellerRow = await db.query.sellers.findFirst({ where: eq(sellers.userId, session.user.id) })

  if (!sellerRow) {
    return (
      <>
        <h1 className="gf-admin-title">Welcome, {session.user.email}</h1>
        <p className="gf-admin-sub">
          Your seller profile is still being created. If this persists, it likely failed during
          sign-up — contact support so we can create it manually.
        </p>
      </>
    )
  }

  const [rows, messageCountRow] = await Promise.all([
    db
      .select({ product: products, salesPage: salesPages })
      .from(products)
      .leftJoin(salesPages, eq(salesPages.productId, products.id))
      .where(eq(products.sellerId, sellerRow.id))
      .orderBy(desc(products.createdAt)),
    db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.sellerId, sellerRow.id)),
  ])

  const messageCount = Number(messageCountRow[0]?.count ?? 0)
  const liveCount = rows.filter(r => r.product.status === 'live').length
  const draftCount = rows.filter(r => r.product.status === 'draft').length
  const totalViews = rows.reduce((s, r) => s + (r.product.views ?? 0), 0)

  const sorted = [...rows].sort((a, b) => STATUS_ORDER[a.product.status] - STATUS_ORDER[b.product.status])

  return (
    <>
      {claimed === '1' && (
        <div style={{
          marginBottom: 20,
          padding: '12px 16px',
          border: '1px solid var(--gf-amber)',
          background: 'var(--gf-amber-tint)',
          borderRadius: 'var(--gf-radius)',
          fontSize: 14,
        }}>
          Your listing has been claimed — review it below and publish when you&apos;re ready.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="gf-admin-title">
            {sellerRow.displayName}
            {sellerRow.verified && <span className="gf-badge-level" style={{ marginLeft: 10, verticalAlign: 'middle' }}>Verified</span>}
          </h1>
          <p className="gf-admin-sub">
            {rows.length === 0
              ? 'No listings yet. Submit a product URL to generate your first one.'
              : `${rows.length} listing${rows.length === 1 ? '' : 's'} · ${liveCount} live · ${draftCount} in draft`}
          </p>
        </div>
        <Link href="/submit" className="btn btn-primary">Submit a product</Link>
      </div>

      <div className="gf-stats">
        <div className="gf-stat">
          <div className="gf-stat-label">Total views</div>
          <div className="gf-stat-value">{totalViews.toLocaleString('en-GB')}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Live listings</div>
          <div className="gf-stat-value">{liveCount}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">In draft</div>
          <div className="gf-stat-value">{draftCount}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Messages</div>
          <div className="gf-stat-value">{messageCount}</div>
          {messageCount > 0 && (
            <div className="gf-stat-delta">
              <Link href="/dashboard/messages" style={{ color: 'var(--gf-amber-ink)', textDecoration: 'underline' }}>
                Read messages
              </Link>
            </div>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty>
          <p style={{ fontSize: 17, color: 'var(--gf-text-2)', marginBottom: 20 }}>
            No listings yet. Submit a product URL and we&apos;ll generate the sales page for you.
          </p>
          <Link href="/submit" className="btn btn-primary">Submit your first product</Link>
        </Empty>
      ) : (
        <div className="gf-panel">
          <div className="gf-panel-head">Your listings</div>
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th className="num">Views</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ product: p, salesPage: sp }) => {
                  const price = p.priceLicensed ?? p.priceExclusive
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--gf-text-2)' }}>
                          {sp?.headline || p.tagline || (p.slug ? `/${p.slug}` : '—')}
                        </div>
                      </td>
                      <td><span className={`gf-status ${p.status}`}>{p.status}</span></td>
                      <td style={{ color: 'var(--gf-text-2)' }}>{p.category ?? '—'}</td>
                      <td className="num">
                        {price != null ? formatPrice(price) : '—'}
                        {p.priceExclusive != null && p.priceLicensed != null && (
                          <div style={{ fontSize: 12, color: 'var(--gf-text-2)' }}>
                            {formatPrice(p.priceExclusive)} excl.
                          </div>
                        )}
                      </td>
                      <td className="num">{p.views ?? 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {p.status === 'live' && p.slug && (
                            <Link href={`/products/${p.slug}`} className="btn btn-ghost-new btn-sm">View</Link>
                          )}
                          <Link href={`/dashboard/products/${p.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
                          {STATUS_ACTIONS[p.status].map(action => (
                            <form key={action.next} action={updateProductStatus}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="next" value={action.next} />
                              <button
                                type="submit"
                                className={`btn btn-sm ${action.primary ? 'btn-primary' : 'btn-ghost-new'}`}
                              >
                                {action.label}
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
