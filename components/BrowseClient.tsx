'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, X } from 'lucide-react'
import type { ProductListItem } from '@/lib/products'
import GigCard from '@/components/GigCard'
import CompareToggle from '@/components/CompareToggle'
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

const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc',   label: 'Price: low to high' },
  { value: 'price-desc',  label: 'Price: high to low' },
  { value: 'rating',      label: 'Best rated' },
] as const
type SortValue = typeof SORTS[number]['value']

interface Props {
  products: ProductListItem[]
  initialCategory?: string
  /** Seeded from ?q= so a header search lands on real results */
  initialSearch?: string
  /** Product IDs the signed-in user has already saved (single bulk lookup) */
  savedIds?: string[]
  authed?: boolean
}

const checkboxLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  color: 'var(--gf-text-2)',
  cursor: 'pointer',
  padding: '5px 0',
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--gf-text)' }}>{title}</h3>
      <div style={{ display: 'grid', gap: 2 }}>{children}</div>
    </div>
  )
}

/**
 * Build a deduped, sorted list of values from `products[field]` arrays.
 * Only options at least one product actually has are offered — a filter that
 * can only ever return zero results is worse than no filter.
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

export default function BrowseClient({
  products,
  initialCategory = 'All',
  initialSearch = '',
  savedIds = [],
  authed = false,
}: Props) {
  const [search, setSearch] = useState(initialSearch)
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [type, setType] = useState<typeof TYPES[number]>('Any')
  const [priceBand, setPriceBand] = useState<typeof PRICE_BANDS[number]['label']>('Any')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortValue>('recommended')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const saved = useMemo(() => new Set(savedIds), [savedIds])
  const platformOptions = useMemo(() => uniqueValues(products, 'platform'), [products])
  const modelOptions = useMemo(() => uniqueValues(products, 'ai_models'), [products])

  const filtered = useMemo(() => {
    const band = PRICE_BANDS.find(b => b.label === priceBand) ?? PRICE_BANDS[0]
    const searchLower = search.trim().toLowerCase()

    const matches = products.filter(p => {
      if (activeCategory !== 'All' && p.category !== activeCategory) return false
      if (type !== 'Any' && p.type !== type) return false

      // Price band — a listing with no price can't satisfy a price range
      if (band.label !== 'Any') {
        if (p.pricePence == null) return false
        if (p.pricePence < band.min || p.pricePence > band.max) return false
      }

      // Platform / model: OR within a dimension, AND across dimensions
      if (selectedPlatforms.size > 0 && !p.platform.some(x => selectedPlatforms.has(x))) return false
      if (selectedModels.size > 0 && !p.ai_models.some(x => selectedModels.has(x))) return false

      if (searchLower) {
        const haystack = `${p.title} ${p.tagline} ${p.description} ${p.tags.join(' ')} ${p.category}`.toLowerCase()
        if (!haystack.includes(searchLower)) return false
      }
      return true
    })

    // Sorting is applied after filtering so the comparators only see survivors.
    // 'recommended' keeps the server's order (featured first, then newest).
    const sorted = [...matches]
    if (sort === 'price-asc') {
      sorted.sort((a, b) => (a.pricePence ?? Infinity) - (b.pricePence ?? Infinity))
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => (b.pricePence ?? -Infinity) - (a.pricePence ?? -Infinity))
    } else if (sort === 'rating') {
      // Unrated listings sort last rather than being treated as zero-star
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    }
    return sorted
  }, [products, activeCategory, type, priceBand, selectedPlatforms, selectedModels, search, sort])

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

  const rail = (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <label htmlFor="browse-search" style={{ display: 'block', marginBottom: 8 }}>Search</label>
        <input
          id="browse-search"
          type="search"
          placeholder="invoices, AI agent, …"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <FilterGroup title="Category">
        {CATEGORIES.map(cat => (
          <label key={cat} style={checkboxLabel}>
            <input
              type="radio"
              name="category"
              style={{ width: 'auto' }}
              checked={activeCategory === cat}
              onChange={() => {
                setActiveCategory(cat)
                track('apply_filter', { dimension: 'category', value: cat, action: 'set' })
              }}
            />
            {cat}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="Licence type">
        {TYPES.map(t => (
          <label key={t} style={checkboxLabel}>
            <input
              type="radio"
              name="type"
              style={{ width: 'auto' }}
              checked={type === t}
              onChange={() => {
                setType(t)
                track('apply_filter', { dimension: 'type', value: t, action: 'set' })
              }}
            />
            {t}
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="Price">
        {PRICE_BANDS.map(band => (
          <label key={band.label} style={checkboxLabel}>
            <input
              type="radio"
              name="price"
              style={{ width: 'auto' }}
              checked={priceBand === band.label}
              onChange={() => {
                setPriceBand(band.label)
                track('apply_filter', { dimension: 'price', value: band.label, action: 'set' })
              }}
            />
            {band.label}
          </label>
        ))}
      </FilterGroup>

      {platformOptions.length > 0 && (
        <FilterGroup title="Platform">
          <div style={{ display: 'grid', gap: 2, maxHeight: 220, overflowY: 'auto' }}>
            {platformOptions.map(opt => (
              <label key={opt} style={checkboxLabel}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={selectedPlatforms.has(opt)}
                  onChange={() => toggle(selectedPlatforms, setSelectedPlatforms, opt, 'platform')}
                />
                {opt}
              </label>
            ))}
          </div>
        </FilterGroup>
      )}

      {modelOptions.length > 0 && (
        <FilterGroup title="AI model">
          <div style={{ display: 'grid', gap: 2, maxHeight: 220, overflowY: 'auto' }}>
            {modelOptions.map(opt => (
              <label key={opt} style={checkboxLabel}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={selectedModels.has(opt)}
                  onChange={() => toggle(selectedModels, setSelectedModels, opt, 'ai_model')}
                />
                {opt}
              </label>
            ))}
          </div>
        </FilterGroup>
      )}

      {activeFilterCount > 0 && (
        <button type="button" onClick={clearAll} className="btn btn-secondary">
          Clear filters ({activeFilterCount})
        </button>
      )}
    </div>
  )

  return (
    <div className="gf-browse">
      <aside className="gf-browse-rail">{rail}</aside>

      {/* Below 900px the rail is hidden and opens as a sheet instead */}
      {filtersOpen && (
        <div className="gf-browse-sheet">
          <div className="gf-browse-sheet-head">
            <strong>Filters</strong>
            <button
              type="button"
              className="btn btn-ghost-new btn-sm"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="gf-browse-sheet-body">{rail}</div>
        </div>
      )}

      <div>
        <div className="gf-browse-toolbar">
          <span style={{ fontSize: 15, color: 'var(--gf-text-2)' }}>
            <strong style={{ color: 'var(--gf-text)' }}>{filtered.length}</strong>
            {' '}of {products.length} {products.length === 1 ? 'listing' : 'listings'}
          </span>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm gf-browse-filter-btn"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>

            <label htmlFor="browse-sort" style={{ fontSize: 14, color: 'var(--gf-text-2)', fontWeight: 400 }}>
              Sort by
            </label>
            <select
              id="browse-sort"
              value={sort}
              onChange={e => setSort(e.target.value as SortValue)}
              style={{ width: 'auto', minWidth: 170 }}
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            padding: 48,
            border: '1px solid var(--gf-line)',
            borderRadius: 'var(--gf-radius)',
            textAlign: 'center',
            display: 'grid',
            gap: 16,
          }}>
            <p style={{ fontSize: 17, margin: 0, color: 'var(--gf-text-2)' }}>
              Nothing matches these filters.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={clearAll} className="btn btn-secondary">Clear filters</button>
              <Link href="/concierge" className="btn btn-primary">Ask the AI concierge</Link>
            </div>
          </div>
        ) : (
          <div className="gf-grid">
            {filtered.map((product, i) => (
              <GigCard
                key={product.slug}
                product={product}
                priority={i < 4}
                saved={product.id ? saved.has(product.id) : false}
                authed={authed}
                returnTo="/browse"
                action={
                  <CompareToggle
                    slug={product.slug}
                    title={product.title}
                    priceMain={product.priceMain}
                    category={product.category}
                    stopPropagation
                  />
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
