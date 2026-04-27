'use client'

import { useState, useTransition } from 'react'
import { adminBatchRegenerateScreenshots, type BatchScreenshotResult } from '@/app/admin/actions'

export default function AdminBatchScreenshotButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<BatchScreenshotResult | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  function run() {
    setResult(null)
    startTransition(async () => {
      const r = await adminBatchRegenerateScreenshots()
      setResult(r)
      setConfirmed(false)
    })
  }

  if (!confirmed) {
    return (
      <button
        type="button"
        onClick={() => setConfirmed(true)}
        className="btn-ghost"
        style={{
          padding: '10px 16px',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
        }}
      >
        📸 Regenerate all live screenshots…
      </button>
    )
  }

  return (
    <div style={{
      padding: 16,
      border: '2px solid var(--soft-amber, #b97314)',
      display: 'grid',
      gap: 12,
      maxWidth: 540,
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, margin: 0 }}>
        This re-scrapes every live product&apos;s <code>source_url</code> via Firecrawl
        (~1 credit per product). Existing screenshots are kept as gallery thumbs.
        Concurrency is 2 — expect ~3 seconds per product.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={run}
          disabled={isPending}
          className="btn-amber"
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            cursor: isPending ? 'wait' : 'pointer',
            border: 'none',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Capturing…' : 'Run batch'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmed(false)}
          disabled={isPending}
          className="btn-ghost"
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
      {result && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, display: 'grid', gap: 6 }}>
          <div>
            ✅ {result.ok} captured ·
            {' '}🟡 {result.skipped} skipped (no source URL) ·
            {' '}❌ {result.failed} failed
          </div>
          {result.failures.length > 0 && (
            <details>
              <summary style={{ cursor: 'pointer' }}>Failures ({result.failures.length})</summary>
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                {result.failures.map(f => (
                  <li key={f.slug} style={{ fontSize: 12 }}>
                    <strong>{f.slug}</strong>: {f.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
