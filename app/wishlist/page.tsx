import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { eq, desc } from 'drizzle-orm'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { auth } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { bookmarks, products } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Your wishlist',
  description: 'Products you have saved on GetForged.',
}

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  // A wishlist is meaningless without auth, so an unconfigured backend lands on
  // /login rather than throwing a 500 out of a Drizzle query.
  if (!dbConfigured()) redirect('/login?next=/wishlist')

  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/wishlist')

  // Inner join means an unpublished (draft/archived) saved product silently
  // drops off the list — same behaviour the old `products_public_read` RLS
  // policy produced by only exposing `status = 'live'` rows to this query.
  const rows = await db
    .select({ product: products })
    .from(bookmarks)
    .innerJoin(products, eq(bookmarks.productId, products.id))
    .where(eq(bookmarks.userId, session.user.id))
    .orderBy(desc(bookmarks.createdAt))

  const saved = rows.map(r => r.product).filter(p => p.status === 'live')

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Wishlist</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)' }}>
            {saved.length === 0 ? (
              <>No <span>saves</span> yet</>
            ) : (
              <>{saved.length} saved <span>{saved.length === 1 ? 'product' : 'products'}</span></>
            )}
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16, color: 'var(--warm-ink-dim)' }}>
            {saved.length === 0
              ? 'Tap the ♡ on any product to save it here. Handy when you want to compare a shortlist before buying.'
              : 'These are the products you saved. Click through to review or buy.'}
          </p>

          {saved.length === 0 && (
            <div style={{ marginTop: 32 }}>
              <Link href="/browse" className="btn-hero-primary" style={{ padding: '14px 28px' }}>
                Browse products →
              </Link>
            </div>
          )}

          {saved.length > 0 && (
            <div className="product-grid" style={{ marginTop: 48 }}>
              {saved.map(p => {
                const hero = p.screenshots?.[0] ?? null
                const isExclusive = p.priceExclusive && !p.priceLicensed
                const priceMain = isExclusive
                  ? `£${p.priceExclusive!.toLocaleString('en-GB')}`
                  : p.priceLicensed
                    ? `£${p.priceLicensed.toLocaleString('en-GB')}`
                    : 'Contact'
                const priceSub = isExclusive ? 'exclusive buy-out' : 'one-time licence'
                return (
                  <div key={p.id} className="product-card">
                    <div className="product-thumb" style={{ position: 'relative' }}>
                      {hero ? (
                        <Image
                          src={hero}
                          alt={p.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          style={{ objectFit: 'cover' }}
                          unoptimized
                        />
                      ) : (
                        <div className="product-thumb-bg t1">⚡</div>
                      )}
                      {p.category && <span className="product-category-tag">{p.category}</span>}
                    </div>
                    <div className="product-body">
                      <div className="product-title">{p.title}</div>
                      {p.tagline && <div className="product-desc">{p.tagline}</div>}
                      <div className="product-foot">
                        <div className="product-price">
                          <div className="product-price-main">{priceMain}</div>
                          <div className="product-price-sub">{priceSub}</div>
                        </div>
                        {p.slug && (
                          <Link href={`/products/${p.slug}`} className="product-btn">
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
