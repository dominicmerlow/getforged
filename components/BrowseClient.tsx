'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProductListItem } from '@/lib/products'

const CATEGORIES = ['All', 'AI Automation', 'Web App', 'CRM & Sales', 'Marketing', 'E-Commerce', 'Operations']

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: 15,
  border: '1px solid var(--ink)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  outline: 'none',
  width: '100%',
}

interface Props {
  products: ProductListItem[]
  initialCategory?: string
}

export default function BrowseClient({ products, initialCategory = 'All' }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(initialCategory)

  const filtered = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory
    if (!matchesCategory) return false
    if (!search.trim()) return true
    const haystack = `${p.title} ${p.description} ${p.tags.join(' ')}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  return (
    <div>
      {/* Search input */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
          aria-label="Search products"
        />
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 36 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              border: '1px solid var(--ink)',
              background: activeCategory === cat ? 'var(--ink)' : 'transparent',
              color: activeCategory === cat ? 'var(--paper)' : 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, opacity: 0.6 }}>
          No products match your search.
        </p>
      ) : (
        <div className="product-grid">
          {filtered.map(product => (
            <div key={product.slug} className="product-card">
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
                    <Link href={`/products/${product.slug}`} className="product-btn">
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
