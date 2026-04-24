'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SEED_PRODUCTS } from '@/lib/seed-products'

const PRODUCTS = SEED_PRODUCTS

const FILTERS = ['All', 'AI Automation', 'Web Apps', 'CRM & Sales', 'E-Commerce']

export default function ProductGrid() {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All'
    ? PRODUCTS
    : PRODUCTS.filter(p =>
        p.category.toLowerCase().includes(activeFilter.toLowerCase()) ||
        activeFilter.toLowerCase().includes(p.category.toLowerCase())
      )

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="products-header">
        <div>
          <div className="section-tag">Featured Listings</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(36px,5vw,56px)' }}>
            Browse <span>340+</span> Products
          </h2>
        </div>
        <div className="filter-row">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-chip${activeFilter === f ? ' active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="product-grid">
        {filtered.map(product => (
          <div key={product.slug} className="product-card reveal">
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
                {product.tags.map(tag => (
                  <span key={tag} className="product-tag">{tag}</span>
                ))}
              </div>
              <div className="product-foot">
                <div className="product-price">
                  <div className="product-price-main">{product.priceMain}</div>
                  <div className="product-price-sub">{product.priceSub}</div>
                </div>
                <Link href={`/products/${product.slug}`} className="product-btn">
                  View →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '48px' }}>
        <Link href="/browse" className="btn-hero-secondary" style={{ padding: '14px 40px' }}>
          Browse All 340+ Products
        </Link>
      </div>
    </section>
  )
}
