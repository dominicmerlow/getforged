'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ProductBulkBar from './ProductBulkBar'

export interface AdminProductRow {
  id: string
  slug: string | null
  title: string
  status: 'draft' | 'live' | 'archived'
  category: string | null
  price_licensed: number | null
  price_exclusive: number | null
  featured: boolean
  featured_position: number | null
  forge_of_the_week: boolean
  has_screenshot: boolean
  view_count: number
  created_at: string
  seller_name: string
}

interface Props {
  products: AdminProductRow[]
  categories: string[]
  sellers: string[]
}

const STATUSES = ['all', 'live', 'draft', 'archived'] as const

/**
 * Filter + select + bulk-act table for the admin products view.
 *
 * Selection state lives here (not in URL) because:
 *   - Bulk actions are intra-page, no need to deep-link them
 *   - The floating BulkBar reads selectedIds directly via prop
 *
 * Filters trigger a re-render via local state. URL-state would be nicer
 * for shareable filtered views but adds complexity not worth it for v1.
 */
export default function ProductTable({ products, categories, sellers }: Props) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<typeof STATUSES[number]>('all')
  const [category, setCategory] = useState('all')
  const [seller, setSeller] = useState('all')
  const [onlyFeatured, setOnlyFeatured] = useState(false)
  const [onlyMissingScreenshot, setOnlyMissingScreenshot] = useState(false)

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter(p => {
      if (status !== 'all' && p.status !== status) return false
      if (category !== 'all' && p.category !== category) return false
      if (seller !== 'all' && p.seller_name !== seller) return false
      if (onlyFeatured && !p.featured) return false
      if (onlyMissingScreenshot && p.has_screenshot) return false
      if (q) {
        const hay = `${p.title} ${p.slug ?? ''} ${p.seller_name} ${p.category ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [products, search, status, category, seller, onlyFeatured, onlyMissingScreenshot])

  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const p of filtered) next.delete(p.id)
      } else {
        for (const p of filtered) next.add(p.id)
      }
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectInput: React.CSSProperties = {
    padding: '8px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    border: '1px solid var(--ink, #2a2217)',
    background: 'var(--paper, #fafaf5)',
    color: 'var(--ink, #2a2217)',
    cursor: 'pointer',
  }

  return (
    <>
      {/* Filter row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 10,
        marginBottom: 16,
      }}>
        <input
          type="search"
          placeholder="Search title / slug / seller…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            border: '1px solid var(--ink, #2a2217)',
            background: 'var(--paper, #fafaf5)',
            color: 'var(--ink, #2a2217)',
            outline: 'none',
            gridColumn: 'span 2',
          }}
        />

        <select value={status} onChange={e => setStatus(e.target.value as typeof STATUSES[number])} style={selectInput}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>

        <select value={category} onChange={e => setCategory(e.target.value)} style={selectInput}>
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={seller} onChange={e => setSeller(e.target.value)} style={selectInput}>
          <option value="all">All sellers</option>
          {sellers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 16,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--warm-ink, #2a2217)',
      }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyFeatured} onChange={e => setOnlyFeatured(e.target.checked)} />
          Featured only
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyMissingScreenshot} onChange={e => setOnlyMissingScreenshot(e.target.checked)} />
          Missing screenshot
        </label>
        <span style={{ marginLeft: 'auto', color: 'var(--muted, #6b6b6b)' }}>
          {filtered.length} of {products.length} products
        </span>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid rgba(42,39,32,0.12)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(42,39,32,0.04)', borderBottom: '1px solid rgba(42,39,32,0.12)' }}>
              <th style={th}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th style={th}>Title</th>
              <th style={th}>Seller</th>
              <th style={th}>Category</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Price</th>
              <th style={th}>Flags</th>
              <th style={{ ...th, textAlign: 'right' }}>Views</th>
              <th style={th}>Created</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--muted, #6b6b6b)' }}>
                  No products match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map(p => {
                const isSelected = selected.has(p.id)
                const price = p.price_licensed ?? p.price_exclusive
                const dateStr = new Date(p.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: '2-digit',
                })
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid rgba(42,39,32,0.06)',
                      background: isSelected ? 'rgba(232,146,10,0.06)' : 'transparent',
                    }}
                  >
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.title}`}
                      />
                    </td>
                    <td style={td}>
                      {p.slug ? (
                        <Link href={`/products/${p.slug}`} target="_blank" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                          {p.title}
                        </Link>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{p.title}</span>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--muted, #6b6b6b)', marginTop: 2 }}>
                        /{p.slug ?? '(no slug)'}
                      </div>
                    </td>
                    <td style={td}>{p.seller_name}</td>
                    <td style={td}>{p.category ?? '—'}</td>
                    <td style={td}>
                      <span style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        background:
                          p.status === 'live' ? '#3fa85a' :
                          p.status === 'draft' ? '#c87d1a' : 'rgba(42,39,32,0.3)',
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>{p.status}</span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {price != null ? `£${price.toLocaleString('en-GB')}` : '—'}
                    </td>
                    <td style={td}>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        {p.featured && <span title="Featured" style={flagPill('#b97314')}>★</span>}
                        {p.forge_of_the_week && <span title="Forge of the Week" style={flagPill('#7e22ce')}>FoW</span>}
                        {!p.has_screenshot && <span title="No screenshot" style={flagPill('#c04a1b')}>📷✗</span>}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--muted, #6b6b6b)' }}>
                      {p.view_count.toLocaleString()}
                    </td>
                    <td style={{ ...td, color: 'var(--muted, #6b6b6b)' }}>{dateStr}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          style={{ color: '#b97314', textDecoration: 'underline', fontWeight: 600 }}
                          title="Admin edit — bypasses ownership, all changes logged"
                        >
                          ✏ Admin edit
                        </Link>
                        {p.slug && (
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            style={{ color: 'var(--soft-amber, #b97314)', textDecoration: 'underline' }}
                          >
                            View ↗
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <ProductBulkBar
        selectedIds={Array.from(selected)}
        onClear={() => setSelected(new Set())}
      />
    </>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted, #6b6b6b)',
  fontWeight: 500,
}

const td: React.CSSProperties = {
  padding: '12px 12px',
  verticalAlign: 'top',
}

function flagPill(color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '1px 6px',
    background: color,
    color: '#fff',
    fontSize: 10,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  }
}
