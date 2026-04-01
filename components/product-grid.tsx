'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ProductCardData {
  title: string
  desc: string
  category: string
  tags: string[]
  priceMain: string
  priceSub: string
  type: 'Licensed' | 'Exclusive'
  thumb: string
  emoji: string
  slug: string
}

const PRODUCTS: ProductCardData[] = [
  {
    title: 'InvoiceBot Pro',
    desc: 'Automatically generates, sends and chases invoices from your Notion workspace. Zero manual effort.',
    category: 'AI Automation',
    tags: ['Claude Code', 'Notion API', 'Stripe'],
    priceMain: '£149',
    priceSub: 'one-time licence',
    type: 'Licensed',
    thumb: 't1',
    emoji: '⚡',
    slug: 'invoicebot-pro',
  },
  {
    title: 'ClientPortal.ai',
    desc: 'White-label client portal with project updates, secure file sharing, and two-way messaging.',
    category: 'Web App',
    tags: ['Cursor', 'Supabase', 'React'],
    priceMain: '£1,200',
    priceSub: 'exclusive buy-out',
    type: 'Exclusive',
    thumb: 't2',
    emoji: '🌐',
    slug: 'clientportal-ai',
  },
  {
    title: 'LeadTrackr',
    desc: "Lightweight CRM for service businesses. Tracks leads, follow-ups, and pipeline without the bloat of Salesforce.",
    category: 'CRM & Sales',
    tags: ['Airtable', 'Make', 'No-Code'],
    priceMain: '£89',
    priceSub: 'per month',
    type: 'Licensed',
    thumb: 't3',
    emoji: '📊',
    slug: 'leadtrackr',
  },
  {
    title: 'ReviewRadar',
    desc: 'Monitors Google & Trustpilot reviews. Alerts you instantly. Drafts AI-generated responses for your approval.',
    category: 'Marketing',
    tags: ['Lovable', 'Claude API', 'Resend'],
    priceMain: '£49',
    priceSub: 'per month',
    type: 'Licensed',
    thumb: 't4',
    emoji: '📧',
    slug: 'reviewradar',
  },
  {
    title: 'ShopBot Assistant',
    desc: 'AI chatbot trained on your product catalogue. Answers customer questions, recommends products, reduces support tickets by 60%.',
    category: 'E-Commerce',
    tags: ['Windsurf', 'Shopify', 'Claude API'],
    priceMain: '£199',
    priceSub: 'one-time licence',
    type: 'Licensed',
    thumb: 't5',
    emoji: '🏪',
    slug: 'shopbot-assistant',
  },
  {
    title: 'BookingBridge',
    desc: 'Embeddable booking system for service businesses. Syncs with Google Calendar. SMS reminders. Zero monthly fees.',
    category: 'Operations',
    tags: ['Bubble', 'Google API', 'Twilio'],
    priceMain: '£299',
    priceSub: 'one-time licence',
    type: 'Licensed',
    thumb: 't6',
    emoji: '📅',
    slug: 'bookingbridge',
  },
]

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
              <div className="product-desc">{product.desc}</div>
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
