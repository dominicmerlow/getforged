import Link from 'next/link'
import type { ProductListItem } from '@/lib/products'
import ProductGridFilter from '@/components/product-grid-filter'

interface ProductGridProps {
  products: ProductListItem[]
}

export default function ProductGrid({ products }: ProductGridProps) {
  const count = products.length

  return (
    <section className="section" id="featured" style={{ paddingTop: 0 }}>
      <div className="products-header">
        <div>
          <div className="section-tag">Featured Listings</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(36px,5vw,56px)' }}>
            {count > 0
              ? <>Browse <span>{count}</span> {count === 1 ? 'product' : 'products'}</>
              : <>The forge is <span>warming up</span></>}
          </h2>
        </div>
      </div>

      {count === 0 ? (
        <div style={{
          marginTop: 32,
          padding: '48px 32px',
          border: '1px dashed rgba(42,39,32,0.2)',
          textAlign: 'center',
          maxWidth: 720,
          marginInline: 'auto',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.5 }}>
            We&apos;re hand-picking the first wave of builders.
            Be the first to list — every founding seller gets a verified badge and free featured placement for 90 days.
          </p>
          <Link href="/submit" className="btn-hero-primary" style={{ marginTop: 24, display: 'inline-block' }}>
            Become a Founding Builder →
          </Link>
        </div>
      ) : (
        <ProductGridFilter products={products} />
      )}

      {count > 0 && (
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link href="/browse" className="btn-hero-secondary" style={{ padding: '14px 40px' }}>
            Browse All {count} {count === 1 ? 'Product' : 'Products'} →
          </Link>
        </div>
      )}
    </section>
  )
}
