'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { submitProduct, type SubmitState } from './actions'

const CATEGORIES = [
  'AI Automation',
  'Web App',
  'CRM & Sales',
  'Marketing',
  'E-Commerce',
  'Operations',
  'Analytics',
  'Content',
  'Other',
]

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

export default function SubmitForm() {
  const [state, action, pending] = useActionState<SubmitState, FormData>(
    submitProduct,
    null
  )

  const ok = state && 'ok' in state && state.ok
  const error = state && 'error' in state ? state.error : null

  if (ok) {
    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 620 }}>
        <div className="section-tag">Draft created</div>
        <h2 style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, letterSpacing: '0.02em', margin: 0 }}>
          It&apos;s in your dashboard.
        </h2>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, lineHeight: 1.4 }}>
          We&apos;ve generated a sales page for your product. Review it, then hit Approve → live to publish.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="btn-hero-primary" style={{ padding: '12px 24px' }}>
            Review draft →
          </Link>
          <Link href={`/products/${state.slug}`} className="btn-hero-secondary" style={{ padding: '12px 24px' }}>
            Preview page
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={action} style={{ display: 'grid', gap: 20, maxWidth: 620 }}>
      <label style={{ display: 'grid', gap: 8 }}>
        <span className="section-tag">Product URL</span>
        <input
          type="url"
          name="product_url"
          required
          placeholder="https://your-product.com"
          autoComplete="url"
          style={inputStyle}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b' }}>
          We&apos;ll scrape the page and generate your sales copy automatically.
        </span>
      </label>

      <label style={{ display: 'grid', gap: 8 }}>
        <span className="section-tag">Product name</span>
        <input type="text" name="name" required placeholder="InvoiceBot Pro" style={inputStyle} />
      </label>

      <label style={{ display: 'grid', gap: 8 }}>
        <span className="section-tag">Category</span>
        <select name="category" required defaultValue="" style={inputStyle}>
          <option value="" disabled>Choose a category</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <label style={{ display: 'grid', gap: 8 }}>
          <span className="section-tag">Licence price £</span>
          <input
            type="number"
            name="price_licensed"
            min="0"
            step="1"
            placeholder="149"
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: 8 }}>
          <span className="section-tag">Exclusive price £</span>
          <input
            type="number"
            name="price_exclusive"
            min="0"
            step="1"
            placeholder="1200"
            style={inputStyle}
          />
        </label>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', marginTop: -12 }}>
        Set at least one. Both = buyer picks licence or exclusive buy-out.
      </span>

      <label style={{ display: 'grid', gap: 8 }}>
        <span className="section-tag">Notes (optional)</span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Anything the AI should know — target user, key benefits, what makes it different…"
          style={{ ...inputStyle, fontFamily: 'var(--font-serif)', fontSize: 16 }}
        />
      </label>

      {error && (
        <p style={{ color: '#c04a1b', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-hero-primary"
        style={{ padding: '16px 28px', opacity: pending ? 0.6 : 1, cursor: pending ? 'wait' : 'pointer' }}
      >
        {pending ? 'Scraping + generating…' : 'Generate my sales page →'}
      </button>

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b' }}>
        Takes 10–30 seconds. Draft goes to your dashboard — nothing is published until you approve.
      </p>
    </form>
  )
}
