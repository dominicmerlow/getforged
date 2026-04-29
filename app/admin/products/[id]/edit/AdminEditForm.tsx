'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { adminEditProduct, adminForceArchiveProduct, type AdminEditState } from './actions'

export interface AdminEditableProduct {
  id: string
  slug: string | null
  title: string
  description: string | null
  category: string | null
  status: 'draft' | 'live' | 'archived'
  price_licensed: number | null
  price_exclusive: number | null
  featured: boolean | null
  featured_position: number | null
  forge_of_the_week: boolean | null
  internal_notes: string | null
  created_at: string
  updated_at?: string | null
}

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
  padding: '12px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  border: '1px solid var(--ink, #2a2217)',
  background: 'var(--paper, #fafaf5)',
  color: 'var(--ink, #2a2217)',
  outline: 'none',
  width: '100%',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'var(--font-serif)',
  fontSize: 15,
  minHeight: 80,
  lineHeight: 1.5,
}

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(12,11,9,0.15)',
  paddingTop: 28,
  marginTop: 28,
  display: 'grid',
  gap: 16,
}

const adminTagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#b97314',
  color: '#fff',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontFamily: 'var(--font-mono)',
}

export default function AdminEditForm({
  product,
}: {
  product: AdminEditableProduct
}) {
  const [state, action, pending] = useActionState<AdminEditState, FormData>(
    adminEditProduct.bind(null, product.id),
    null
  )

  const [archiveState, archiveAction, archivePending] = useActionState<AdminEditState, FormData>(
    adminForceArchiveProduct.bind(null, product.id),
    null
  )

  const ok = state && 'ok' in state && state.ok
  const error = state && 'error' in state ? state.error : null
  const archiveOk = archiveState && 'ok' in archiveState && archiveState.ok
  const archiveError = archiveState && 'error' in archiveState ? archiveState.error : null

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 900 }}>
      {ok && (
        <div className="product-card" style={{ padding: 16, borderLeft: '3px solid #3fa85a', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          ✓ Saved. Audit logged. <Link href="/admin/products" style={{ textDecoration: 'underline' }}>Back to admin products</Link>
          {state?.slug && (
            <>
              {' · '}
              <Link href={`/products/${state.slug}`} style={{ textDecoration: 'underline' }} target="_blank">View ↗</Link>
            </>
          )}
        </div>
      )}
      {error && (
        <div className="product-card" style={{ padding: 16, borderLeft: '3px solid #c04a1b', fontFamily: 'var(--font-mono)', fontSize: 14, color: '#c04a1b' }}>
          {error}
        </div>
      )}
      {archiveOk && (
        <div className="product-card" style={{ padding: 16, borderLeft: '3px solid #3fa85a', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          ✓ Force-archived. Status set to <strong>archived</strong> and event logged.
        </div>
      )}
      {archiveError && (
        <div className="product-card" style={{ padding: 16, borderLeft: '3px solid #c04a1b', fontFamily: 'var(--font-mono)', fontSize: 14, color: '#c04a1b' }}>
          {archiveError}
        </div>
      )}

      <form action={action} style={{ display: 'grid', gap: 0 }}>
        {/* ── Core ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="section-tag">Core</div>
            <span style={adminTagStyle}>Admin override</span>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Product name</span>
            <input
              type="text"
              name="title"
              defaultValue={product.title}
              required
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              URL slug <span style={{ color: '#6b6b6b' }}>· read-only here</span>
            </span>
            <input
              type="text"
              defaultValue={product.slug ?? ''}
              readOnly
              disabled
              style={{ ...inputStyle, background: 'rgba(42,39,32,0.04)', color: '#6b6b6b' }}
            />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#6b6b6b' }}>
              Slug edits aren&apos;t allowed here to keep public URLs stable. Use the SQL editor if a slug fix is genuinely needed.
            </span>
          </label>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Category</span>
              <select name="category" defaultValue={product.category ?? ''} style={inputStyle}>
                <option value="">Choose…</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Status</span>
              <select name="status" defaultValue={product.status} style={inputStyle}>
                <option value="draft">draft</option>
                <option value="live">live</option>
                <option value="archived">archived</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Description</span>
            <textarea
              name="description"
              defaultValue={product.description ?? ''}
              rows={4}
              style={textareaStyle}
            />
          </label>
        </div>

        {/* ── Pricing override ───────────────────────────── */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="section-tag">Pricing (£)</div>
            <span style={adminTagStyle}>Dispute override</span>
          </div>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Licence price</span>
              <input
                type="number"
                min="0"
                step="1"
                name="price_licensed"
                defaultValue={product.price_licensed ?? ''}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Exclusive price</span>
              <input
                type="number"
                min="0"
                step="1"
                name="price_exclusive"
                defaultValue={product.price_exclusive ?? ''}
                style={inputStyle}
              />
            </label>
          </div>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#6b6b6b' }}>
            Use during dispute resolution to correct an incorrectly priced listing. At least one price required.
          </span>
        </div>

        {/* ── Curation ──────────────────────────────────── */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="section-tag">Curation</div>
            <span style={adminTagStyle}>Admin only</span>
          </div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <input
              type="checkbox"
              name="featured"
              defaultChecked={!!product.featured}
              value="true"
            />
            <span>★ Featured (pinned to homepage hero stack)</span>
          </label>

          <label style={{ display: 'grid', gap: 6, maxWidth: 240 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              Featured position <span style={{ color: '#6b6b6b' }}>· lower = higher up</span>
            </span>
            <input
              type="number"
              step="1"
              name="featured_position"
              defaultValue={product.featured_position ?? ''}
              placeholder="e.g. 0"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <input
              type="checkbox"
              name="forge_of_the_week"
              defaultChecked={!!product.forge_of_the_week}
              value="true"
            />
            <span>Forge of the Week (exclusive — selecting this clears any existing pick)</span>
          </label>
        </div>

        {/* ── Internal notes ─────────────────────────────── */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="section-tag">Internal notes</div>
            <span style={adminTagStyle}>Private</span>
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#6b6b6b' }}>
              Never rendered publicly. Use for moderation context, follow-ups, or notes for the next admin.
            </span>
            <textarea
              name="internal_notes"
              defaultValue={product.internal_notes ?? ''}
              rows={5}
              style={{ ...textareaStyle, fontFamily: 'var(--font-mono)', fontSize: 13 }}
              placeholder="e.g. Talked to seller 2026-04-15 about misleading screenshot — agreed to update by EOM."
            />
          </label>
        </div>

        {/* ── Save / cancel ──────────────────────────────── */}
        <div style={{
          ...sectionStyle,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              className="btn-hero-primary"
              disabled={pending}
              style={{ padding: '14px 28px', cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.6 : 1 }}
            >
              {pending ? 'Saving…' : 'Save admin edit'}
            </button>
            <Link href="/admin/products" className="btn-hero-secondary" style={{ padding: '14px 28px' }}>
              Cancel
            </Link>
          </div>
        </div>
      </form>

      {/* Force-archive lives in a separate form so its button doesn't
          accidentally submit the edit above. */}
      <form action={archiveAction} style={{ marginTop: 16 }}>
        <button
          type="submit"
          disabled={archivePending || product.status === 'archived'}
          style={{
            background: 'transparent',
            border: '1px solid #c04a1b',
            color: '#c04a1b',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            padding: '10px 18px',
            cursor: archivePending || product.status === 'archived' ? 'not-allowed' : 'pointer',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: product.status === 'archived' ? 0.5 : 1,
          }}
          onClick={(e) => {
            if (!confirm('Force-archive this product? It will be hidden from /browse and the seller dashboard will show it as archived. This is logged.')) {
              e.preventDefault()
            }
          }}
        >
          🚫 {archivePending ? 'Archiving…' : product.status === 'archived' ? 'Already archived' : 'Force archive'}
        </button>
        <span style={{ marginLeft: 12, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b' }}>
          Sets status → archived without going through the seller. Logged separately to admin_audit.
        </span>
      </form>
    </div>
  )
}
