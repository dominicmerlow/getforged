import { redirect } from 'next/navigation'
import { eq, and, desc, sql } from 'drizzle-orm'
import { formatPrice } from '@/lib/utils'
import { adminUpdateStatus } from './actions'
import AdminBatchScreenshotButton from '@/components/AdminBatchScreenshotButton'
import RefundButton from '@/components/RefundButton'
import { auth } from '@/auth'
import { checkAdminAccess } from '@/lib/admin'
import { db, dbConfigured } from '@/lib/db'
import { products, sellers, purchases } from '@/db/schema'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  if (!dbConfigured()) {
    return (
      <>
        <h1 className="gf-admin-title">Not connected</h1>
        <p className="gf-admin-sub">
          <code>DATABASE_URL</code> is not set. Add it to <code>.env.local</code> to use the admin console.
        </p>
      </>
    )
  }

  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  const [drafts, recentPurchases, sellerCountRow, statusCounts] = await Promise.all([
    db
      .select({
        id: products.id, title: products.title, slug: products.slug,
        category: products.category, createdAt: products.createdAt,
        sellerName: sellers.displayName,
      })
      .from(products)
      .innerJoin(sellers, eq(products.sellerId, sellers.id))
      .where(and(eq(products.status, 'draft'), eq(products.isProspect, false)))
      .orderBy(desc(products.createdAt))
      .limit(50),
    db
      .select({
        id: purchases.id, amount: purchases.amount, purchaseType: purchases.purchaseType,
        createdAt: purchases.createdAt, productTitle: products.title,
        refundedAt: purchases.refundedAt, stripePaymentIntentId: purchases.stripePaymentIntentId,
      })
      .from(purchases)
      .innerJoin(products, eq(purchases.productId, products.id))
      .orderBy(desc(purchases.createdAt))
      .limit(20),
    db.select({ count: sql<number>`count(*)` }).from(sellers).then(r => r[0]?.count ?? 0),
    db
      .select({ status: products.status, count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isProspect, false))
      .groupBy(products.status),
  ])

  const statusMap = Object.fromEntries(statusCounts.map(r => [r.status, Number(r.count)]))
  const recentSalesTotal = recentPurchases.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return (
    <>
      <h1 className="gf-admin-title">Overview</h1>
      <p className="gf-admin-sub">
        {session.user.email}
        <span className="gf-badge-level" style={{ marginLeft: 10 }}>{role}</span>
      </p>

      <div className="gf-stats">
        <div className="gf-stat">
          <div className="gf-stat-label">Sellers</div>
          <div className="gf-stat-value">{sellerCountRow}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Live products</div>
          <div className="gf-stat-value">{statusMap['live'] ?? 0}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Draft products</div>
          <div className="gf-stat-value">{statusMap['draft'] ?? 0}</div>
        </div>
        <div className="gf-stat">
          <div className="gf-stat-label">Recent sales (last 20)</div>
          <div className="gf-stat-value">{formatPrice(recentSalesTotal)}</div>
        </div>
      </div>

      <div className="gf-panel" style={{ marginBottom: 24 }}>
        <div className="gf-panel-head">Operations</div>
        <div className="gf-panel-body">
          <AdminBatchScreenshotButton />
        </div>
      </div>

      <div className="gf-panel" style={{ marginBottom: 24 }}>
        <div className="gf-panel-head">Moderation queue: pending review ({drafts.length})</div>
        {drafts.length === 0 ? (
          <div className="gf-panel-body" style={{ textAlign: 'center', color: 'var(--gf-text-2)' }}>
            No products awaiting review.
          </div>
        ) : (
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Category</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map(draft => (
                  <tr key={draft.id}>
                    <td style={{ fontWeight: 600 }}>{draft.title}</td>
                    <td>{draft.sellerName}</td>
                    <td>{draft.category}</td>
                    <td>{draft.createdAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <form action={adminUpdateStatus}>
                          <input type="hidden" name="id" value={draft.id} />
                          <input type="hidden" name="status" value="live" />
                          <button type="submit" className="btn btn-primary btn-sm">Approve</button>
                        </form>
                        <form action={adminUpdateStatus}>
                          <input type="hidden" name="id" value={draft.id} />
                          <input type="hidden" name="status" value="archived" />
                          <button type="submit" className="btn btn-ghost-new btn-sm">Reject</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="gf-panel">
        <div className="gf-panel-head">Recent sales: last 20 purchases</div>
        {recentPurchases.length === 0 ? (
          <div className="gf-panel-body" style={{ textAlign: 'center', color: 'var(--gf-text-2)' }}>
            No purchases yet.
          </div>
        ) : (
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th className="num">Amount</th>
                  <th style={{ textAlign: 'right' }}>Refund</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.productTitle}</td>
                    <td>{row.purchaseType}</td>
                    <td>{row.createdAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="num">{formatPrice(row.amount ?? 0)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {row.refundedAt ? (
                        <span style={{ color: 'var(--gf-text-2)', fontSize: 13 }}>Refunded</span>
                      ) : row.stripePaymentIntentId ? (
                        <RefundButton purchaseId={row.id} />
                      ) : (
                        <span style={{ color: 'var(--gf-text-2)', fontSize: 13 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
