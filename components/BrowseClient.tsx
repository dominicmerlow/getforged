'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProductListItem } from '@/lib/products'
import ProductScreenshot from '@/components/ProductScreenshot'
import { track } from '@/lib/analytics'

const CATEGORIES = ['All', 'AI Automation', 'Web App', 'CRM & Sales', 'Marketing', 'E-Commerce', 'Operations']
const TYPES = ['Any', 'Licensed', 'Exclusive'] as const
const PRICE_BANDS = [
  { label: 'Any', min: 0, max: Number.POSITIVE_INFINITY },
  { label: 'Under £100', min: 0, max: 99 },
  { label: '£100–£499', min: 100, max: 499 },
  { label: '£500–£1,499', min: 500, max: 1499 },
  { label: '£1,500+', min: 1500, max: Number.POSITIVE_INFINITY },
] as const

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

const sidebarHeading: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--soft-amber, #b97314)',
  marginBottom: 10,
}

const checkboxLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  cursor: 'pointer',
  padding: '4px 0',
}

interface Props {
  products: ProductListItem[]
  initialCategory?: string
}

/**
 * Build a deduped, sorted list of values from `products[field]` arrays.
 * Falsy / empty values are dropped. Only show options that >=1 product has.
 */
function uniqueValues<T extends keyof ProductListItem>(
  products: ProductListItem[],
  field: T
): string[] {
  const set = new Set<string>()
  for (const p of products) {
    const v = p[field]
    if (Array.isArray(v)) {
      for (const x of v) if (typeof x === 'string' && x.trim()) set.add(x.trim())
    } else if (typeof v === 'string' && v.trim()) {
      set.add(v.trim())
    }
  }
  return [...set].sort()
}

export default function BrowseClient({ products, initialCategory = 'All' }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [type, setType] = useState<typeof TYPES[number]>('Any')
  const [priceBand, setPriceBand] = useState<typeof PRICE_BANDS[number]['label']>('Any')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())

  const platformOptions = useMemo(() => uniqueValues(products, 'platform'), [products])
  const modelOptions = useMemo(() => uniqueValues(products, 'ai_models'), [products])

  const filtered = useMemo(() => {
    const band = PRICE_BANDS.find(b => b.label === priceBand) ?? PRICE_BANDS[0]
    const searchLower = search.trim().toLowerCase()

    return products.filter(p => {
      // Category
      if (activeCategory !== 'All' && p.category !== activeCategory) return false

      // Type
      if (type !== 'Any' && p.type !== type) return false

      // Price band (skip filter if price unknown)
      if (band.label !== 'Any') {
        if (p.pricePence == null) return false
        if (p.pricePence < band.min || p.pricePence > band.max) return false
      }

      // Platform AND-of-OR: product matches if it has at least one of the selected
      if (selectedPlatforms.size > 0) {
        const hit = p.platform.some(x => selectedPlatforms.has(x))
        if (!hit) return false
      }

      // AI model AND-of-OR (same shape)
      if (selectedModels.size > 0) {
        const hit = p.ai_models.some(x => selectedModels.has(x))
        if (!hit) return false
      }

      // Free-text search
      if (searchLower) {
        const haystack = `${p.title} ${p.description} ${p.tags.join(' ')} ${p.category}`.toLowerCase()
        if (!haystack.includes(searchLower)) return false
      }

      return true
    })
  }, [products, activeCategory, type, priceBand, selectedPlatforms, selectedModels, search])

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, val: string, dimension: string) {
    const next = new Set(set)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    setter(next)
    track('apply_filter', { dimension, value: val, action: next.has(val) ? 'add' : 'remove' })
  }

  const activeFilterCount =
    (activeCategory !== 'All' ? 1 : 0) +
    (type !== 'Any' ? 1 : 0) +
    (priceBand !== 'Any' ? 1 : 0) +
    selectedPlatforms.size +
    selectedModels.size +
    (search.trim() ? 1 : 0)

  function clearAll() {
    setSearch('')
    setActiveCategory('All')
    setType('Any')
    setPriceBand('Any')
    setSelectedPlatforms(new Set())
    setSelectedModels(new Set())
    track('apply_filter', { dimension: 'all', value: 'clear', action: 'clear' })
  }

  return (
    <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'minmax(220px, 260px) 1fr', alignItems: 'start' }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={{
        position: 'sticky',
        top: 24,
        display: 'grid',
        gap: 28,
        paddingRight: 16,
        borderRight: '1px solid rgba(42,39,32,0.12)',
      }}>
        <div>
          <div style={sidebarHeading}>Search</div>
          <input
            type="text"
            placeholder="invoices, AI agent, …"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, padding: '10px 12px', fontSize: 13 }}
            aria-label="Search products"
          />
        </div>

        <div>
          <div style={sidebarHeading}>Category</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {CATEGORIES.map(cat => (
              <label key={cat} style={checkboxLabel}>
                <input
                  type="radio"
                  name="category"
                  checked={activeCategory === cat}
                  onChange={() => {
                    setActiveCategory(cat)
                    track('apply_filter', { dimension: 'category', value: cat, action: 'set' })
                  }}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div style={sidebarHeading}>Licence type</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {TYPES.map(t => (
              <label key={t} style={checkboxLabel}>
                <input
                  type="radio"
                  name="type"
                  checked={type === t}
                  onChange={() => {
                    setType(t)
                    track('apply_filter', { dimension: 'type', value: t, action: 'set' })
                  }}
                />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div style={sidebarHeading}>Price</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {PRICE_BANDS.map(band => (
              <label key={band.label} style={checkboxLabel}>
                <input
                  type="radio"
                  name="price"
                  checked={priceBand === band.label}
                  onChange={() => {
                    setPriceBand(band.label)
                    track('apply_filter', { dimension: 'price', value: band.label, action: 'set' })
                  }}
                />
                {band.label}
              </label>
            ))}
          </div>
        </div>

        {platformOptions.length > 0 && (
          <div>
            <div style={sidebarHeading}>Platform</div>
            <div style={{ display: 'grid', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
              {platformOptions.map(opt => (
                <label key={opt} style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.has(opt)}
                    onChange={() => toggle(selectedPlatforms, setSelectedPlatforms, opt, 'platform')}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        )}

        {modelOptions.length > 0 && (
          <div>
            <div style={sidebarHeading}>AI model</div>
            <div style={{ display: 'grid', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
              {modelOptions.map(opt => (
                <label key={opt} style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedModels.has(opt)}
                    onChange={() => toggle(selectedModels, setSelectedModels, opt, 'ai_model')}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        )}

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              border: '1px solid var(--ink)',
              background: 'transparent',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            Clear all filters ({activeFilterCount})
          </button>
        )}
      </aside>

      {/* ── Results column ──────────────────────────────────────── */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--muted, #6b6b6b)',
        }}>
          <span>
            Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> of {products.length} products
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            padding: 40,
            border: '1px dashed rgba(42,39,32,0.2)',
            textAlign: 'center',
            display: 'grid',
            gap: 16,
          }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, margin: 0 }}>
              No products match these filters.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={clearAll} className="btn-hero-secondary" style={{ padding: '10px 18px' }}>
                Clear filters
              </button>
              <Link href="/concierge" className="btn-hero-primary" style={{ padding: '10px 18px' }}>
                Try the AI Concierge →
              </Link>
            </div>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(product => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="product-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="product-thumb" style={{ position: 'relative', height: 190 }}>
                  <ProductScreenshot
                    src={product.heroImage}
                    title={product.title}
                    emoji={product.emoji}
                    category={product.category}
                    size="card"
                  />
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
