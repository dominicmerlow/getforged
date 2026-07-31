import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { sellers, messages, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Messages',
}

export const dynamic = 'force-dynamic'

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function MessagesPage() {
  if (!dbConfigured()) {
    return (
      <>
        <div className="section-tag">Messages</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
          Not connected
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16 }}>
          Set <code>DATABASE_URL</code> in <code>.env.local</code> to use messages.
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
        <div className="section-tag">Messages</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
          No seller profile found
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16 }}>
          Your seller profile is still being created. Check back shortly.
        </p>
      </>
    )
  }

  const rows = await db
    .select({
      id: messages.id, senderName: messages.senderName, senderEmail: messages.senderEmail,
      body: messages.body, createdAt: messages.createdAt,
      productTitle: products.title, productSlug: products.slug,
    })
    .from(messages)
    .leftJoin(products, eq(products.id, messages.productId))
    .where(eq(messages.sellerId, sellerRow.id))
    .orderBy(desc(messages.createdAt))

  return (
    <>
      <div className="section-tag">Seller dashboard</div>
      <h1 className="gf-admin-title">Messages</h1>
      <p className="gf-admin-sub">
        {rows.length === 0
          ? 'No messages yet.'
          : `${rows.length} message${rows.length === 1 ? '' : 's'} from buyers.`}
      </p>

      {rows.length === 0 ? (
        <div className="gf-panel">
          <div className="gf-panel-body" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 17, color: 'var(--gf-text-2)' }}>
              No messages yet. They&apos;ll appear here when buyers reach out.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map(msg => (
            <article key={msg.id} className="gf-panel">
              <div className="gf-panel-body" style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                  <div>
                    {msg.productTitle && msg.productSlug ? (
                      <Link
                        href={`/products/${msg.productSlug}`}
                        style={{ fontWeight: 600, fontSize: 17, color: 'var(--gf-amber-ink)', textDecoration: 'none' }}
                      >
                        {msg.productTitle}
                      </Link>
                    ) : (
                      <span style={{ fontSize: 17, color: 'var(--gf-text-2)' }}>(product removed)</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gf-text-2)', whiteSpace: 'nowrap' }}>
                    {formatDate(msg.createdAt)}
                  </div>
                </div>

                <div style={{ fontSize: 14, color: 'var(--gf-text-2)' }}>
                  {msg.senderName} &lt;{msg.senderEmail}&gt;
                </div>

                <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: 'var(--gf-text)' }}>
                  {msg.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
