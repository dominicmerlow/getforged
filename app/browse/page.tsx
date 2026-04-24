import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import ScrollReveal from '@/components/scroll-reveal'
import { listLiveProducts } from '@/lib/products'
import WishlistButton from '@/components/WishlistButton'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Browse AI-Built Apps & Tools',
  description: 'Every AI-built tool on GetForged — browse apps, automations, and websites priced for small businesses.',
}

export default async function BrowsePage() {
  const products = await listLiveProducts()

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="products-header">
            <div>
              <div className="section-tag">Catalogue</div>
              <h1 className="section-title" style={{ fontSize: 'clamp(40px,5.5vw,72px)' }}>
                All <span>{products.length}</span> products
              </h1>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginTop: 12, maxWidth: 640 }}>
                Every tool below was built by an AI developer and is ready to ship. Licence for a one-time fee or buy exclusive rights.
              </p>
            </div>
          </div>

          <div className="product-grid" style={{ marginTop: 48 }}>
            {products.map(product => (
              <div key={product.slug} className="product-card reveal">
                <div className="product-thumb" style={{ position: 'relative' }}>
                  {product.heroImage ? (
                    <Image
                      src={product.heroImage}
                      alt={product.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div className={`product-thumb-bg ${product.thumb}`}>{product.emoji}</div>
                  )}
                  <span className="product-category-tag">{product.category}</span>
                  <span className={`product-licensed-tag${product.type === 'Exclusive' ? ' exclusive' : ''}`}>
                    {product.type}
                  </span>
                </div>
                <div className="product-body">
                  <div className="product-title">{product.title}</div>
                  <div className="product-desc">{product.description}</div>
                  <div className="product-tags">
                    {product.tags.map(tag => (
                      <span key={tag} className="product-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="product-foot">
                    <div className="product-price">
                      <div className="product-price-main">{product.priceMain}</div>
                      <div className="product-price-sub">{product.priceSub}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {product.id && (
                        <WishlistButton
                          productId={product.id}
                          returnTo="/browse"
                          compact
                        />
                      )}
                      <Link href={`/products/${product.slug}`} className="product-btn">
                        View →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <ScrollReveal />
    </>
  )
}
