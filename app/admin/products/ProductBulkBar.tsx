'use client'

import { useActionState, useState, useTransition } from 'react'
import {
  adminBulkUpdateStatus,
  adminBulkSetFeatured,
  adminBulkDelete,
  type BulkResult,
} from './actions'

/**
 * Floating action bar that appears when 1+ rows are selected in the
 * products table. Issues bulk actions against the selected ids.
 *
 * Design choice: this lives as a React Context-less component — the
 * parent ProductTable owns the selection state and passes the ids
 * down. Simpler than a global store for one screen.
 */
export default function ProductBulkBar({
  selectedIds,
  onClear,
}: {
  selectedIds: string[]
  onClear: () => void
}) {
  const [statusState, statusAction, statusPending] = useActionState<BulkResult | null, FormData>(
    adminBulkUpdateStatus,
    null
  )
  const [featuredState, featuredAction, featuredPending] = useActionState<BulkResult | null, FormData>(
    adminBulkSetFeatured,
    null
  )
  const [deleteState, deleteAction, deletePending] = useActionState<BulkResult | null, FormData>(
    adminBulkDelete,
    null
  )

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [, startTransition] = useTransition()

  if (selectedIds.length === 0) return null

  const result =
    (statusState && 'ok' in statusState) ? statusState :
    (featuredState && 'ok' in featuredState) ? featuredState :
    (deleteState && 'ok' in deleteState) ? deleteState : null
  const error =
    (statusState && 'error' in statusState ? statusState.error : null) ??
    (featuredState && 'error' in featuredState ? featuredState.error : null) ??
    (deleteState && 'error' in deleteState ? deleteState.error : null)

  const pending = statusPending || featuredPending || deletePending

  // Each action button posts its own form so we can pass status/featured
  // values as hidden inputs without coupling to a shared form state.
  const bulkInput = (extra: Record<string, string>) => (
    <>
      {selectedIds.map(id => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      {Object.entries(extra).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  )

  const btn: React.CSSProperties = {
    padding: '8px 14px',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: '0.06em',
    background: 'rgba(255,255,255,0.08)',
    color: 'inherit',
    border: '1px solid rgba(255,255,255,0.12)',
    cursor: pending ? 'wait' : 'pointer',
    opacity: pending ? 0.6 : 1,
  }

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: 'var(--ink, #2a2217)',
        color: 'var(--paper, #fafaf5)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        maxWidth: 'min(96vw, 1100px)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--soft-amber, #b97314)',
      }}>
        {selectedIds.length} selected
      </div>

      <form action={statusAction} style={{ display: 'inline' }}>
        {bulkInput({ status: 'live' })}
        <button type="submit" disabled={pending} style={btn}>Publish</button>
      </form>
      <form action={statusAction} style={{ display: 'inline' }}>
        {bulkInput({ status: 'draft' })}
        <button type="submit" disabled={pending} style={btn}>Move to Draft</button>
      </form>
      <form action={statusAction} style={{ display: 'inline' }}>
        {bulkInput({ status: 'archived' })}
        <button type="submit" disabled={pending} style={btn}>Archive</button>
      </form>

      <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)' }} />

      <form action={featuredAction} style={{ display: 'inline' }}>
        {bulkInput({ featured: 'true' })}
        <button type="submit" disabled={pending} style={btn}>★ Feature</button>
      </form>
      <form action={featuredAction} style={{ display: 'inline' }}>
        {bulkInput({ featured: 'false' })}
        <button type="submit" disabled={pending} style={btn}>Unfeature</button>
      </form>

      <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)' }} />

      {!confirmDelete ? (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          style={{ ...btn, color: '#ff8a6a' }}
        >
          Delete…
        </button>
      ) : (
        <form
          action={deleteAction}
          onSubmit={() => {
            startTransition(() => setConfirmDelete(false))
          }}
          style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
        >
          {bulkInput({})}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ff8a6a' }}>
            Permanently delete {selectedIds.length}?
          </span>
          <button type="submit" disabled={pending} style={{ ...btn, background: '#ff5722', color: '#fff', border: 'none' }}>
            Yes, delete
          </button>
          <button type="button" onClick={() => setConfirmDelete(false)} style={btn}>Cancel</button>
        </form>
      )}

      <button
        type="button"
        onClick={onClear}
        style={{ ...btn, marginLeft: 'auto' }}
      >
        Clear ({selectedIds.length})
      </button>

      {result && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#3fa85a', width: '100%', flexBasis: '100%' }}>
          ✓ {result.affected} updated
        </span>
      )}
      {error && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ff8a6a', width: '100%', flexBasis: '100%' }}>
          {error}
        </span>
      )}
    </div>
  )
}
