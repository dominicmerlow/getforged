import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Your wishlist',
  description: 'Products you have saved on FORGE.',
}

export const dynamic = 'force-dynamic'

type SavedProduct = {
  id: string
  title: string
  tagline: string | null
  slug: string | null
  price_licensed: number | null
  price_exclusive: number | null
  screenshots: string[] | null
  category: string | null
}

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login?next=/wishlist')

  // Fetch bookmark rows with joined product data. The RLS policy on
  // `bookmarks` restricts to the user's own rows, and `products_public_read`
  // will filter to live-only — which is what we want on the wishlist.
  const { data: rows } = await supabase
    .from('bookmarks')
    .select(`
      id,
      created_at,
      product:products (
        id, title, tagline, slug, price_licensed, price_exclusive, screenshots, category, status
      )
    `)
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  type Row = { id: string; created_at: string; product: SavedProduct & { status?: string } | (SavedProduct & { status?: string })[] | null }
  const products: SavedProduct[] = ((rows ?? []) as Row[])
    .map(r => (Array.isArray(r.product) ? r.product[0] : r.product))
    .filter((p): p is SavedProduct & { status?: string } => !!p && p.status === 'live')

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Wishlist</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)' }}>
            {products.length === 0 ? (
              <>No <span>saves</span> yet</>
            ) : (
              <>{products.length} saved <span>{products.length === 1 ? 'product' : 'products'}</span></>
            )}
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16, color: 'var(--warm-ink-dim)' }}>
            {products.length === 0
              ? 'Tap the ♡ on any product to save it here. Handy when you want to compare a shortlist before buying.'
              : 'These are the products you saved. Click through to review or buy.'}
          </p>

          {products.length === 0 && (
            <div style={{ marginTop: 32 }}>
              <Link href="/browse" className="btn-hero-primary" style={{ padding: '14px 28px' }}>
                Browse products →
              </Link>
            </div>
          )}

          {products.length > 0 && (
            <div className="product-grid" style={{ marginTop: 48 }}>
              {products.map(p => {
                const hero = p.screenshots?.[0] ?? null
                const isExclusive = p.price_exclusive && !p.price_licensed
                const priceMain = isExclusive
                  ? `£${p.price_exclusive!.toLocaleString('en-GB')}`
                  : p.price_licensed
                    ? `£${p.price_licensed.toLocaleString('en-GB')}`
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
