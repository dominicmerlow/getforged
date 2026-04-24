'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProductListItem } from '@/lib/products'

const FILTERS = ['All', 'AI Automation', 'Web Apps', 'CRM & Sales', 'E-Commerce', 'Marketing', 'Operations']

export default function ProductGridFilter({ products }: { products: ProductListItem[] }) {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return products
    const f = activeFilter.toLowerCase()
    return products.filter(p => {
      const c = (p.category ?? '').toLowerCase()
      return c.includes(f) || f.includes(c)
    })
  }, [products, activeFilter])

  return (
    <>
      <div className="filter-row" style={{ marginTop: 24 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-chip${activeFilter === f ? ' active' : ''}`}
            onClick={() => setActiveFilter(f)}
            type="button"
          >
            {f}
          </button>
        ))}
      </div>

      <div className="product-grid" style={{ marginTop: 32 }}>
        {filtered.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            padding: 32,
            border: '1px dashed rgba(42,39,32,0.2)',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: '#6b6b6b',
          }}>
            No products in this category yet.
            {' '}
            <Link href="/concierge" style={{ textDecoration: 'underline', color: 'inherit' }}>
              Try the AI Concierge →
            </Link>
          </div>
        ) : (
          filtered.map(product => (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="product-card reveal"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div className="product-thumb">
                <div className={`product-thumb-bg ${product.thumb}`}>{product.emoji}</div>
                <span className="product-category-tag">{product.category}</span>
                <span className={`product-licensed-tag${product.type === 'Exclusive' ? ' exclusive' : ''}`}>
                  {product.type}
                </span>
              </div>
              <div className="product-body">
                <div className="product-title">{product.title}</div>
                <div className="product-desc">{product.description}</div>
                <div className="product-tags">
                  {product.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="product-tag">{tag}</span>
                  ))}
                </div>
                <div className="product-foot">
                  <div className="product-price">
                    <div className="product-price-main">{product.priceMain}</div>
                    <div className="product-price-sub">{product.priceSub}</div>
                  </div>
                  <span className="product-btn">View →</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
