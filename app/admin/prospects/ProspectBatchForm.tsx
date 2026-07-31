'use client'

import { useActionState } from 'react'
import { createProspectBatch, type ProspectBatchState } from './actions'

export default function ProspectBatchForm() {
  const [state, action, pending] = useActionState<ProspectBatchState, FormData>(
    createProspectBatch,
    null
  )

  const results = state && 'results' in state ? state.results : null
  const error = state && 'error' in state ? state.error : null

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form action={action} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            One row per prospect: url, name, email, source[, category]
          </span>
          <textarea
            name="csv"
            required
            rows={8}
            placeholder={'https://example.com, ExampleApp, owner@example.com, producthunt\nhttps://another.io, AnotherTool, , twitter, AI Automation'}
            style={{
              padding: '12px 14px',
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 13,
              border: '1px solid var(--warm-border, rgba(42,34,23,0.18))',
              background: 'var(--cream-2, #f4ece0)',
              color: 'var(--warm-ink, #2a2217)',
              borderRadius: 2,
              outline: 'none',
              width: '100%',
              resize: 'vertical',
            }}
          />
        </label>

        {error && (
          <p style={{ color: '#c04a1b', fontFamily: 'var(--font-mono)', fontSize: 13, margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-hero-primary"
          style={{ padding: '12px 24px', cursor: pending ? 'wait' : 'pointer', border: 'none', justifySelf: 'start', opacity: pending ? 0.7 : 1 }}
        >
          {pending ? 'Generating drafts…' : 'Generate claim links'}
        </button>
      </form>

      {results && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="section-tag">
            Batch result: {results.filter(r => r.ok).length}/{results.length} succeeded
          </div>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                padding: '10px 14px',
                border: `1px solid ${r.ok ? 'var(--warm-border, rgba(42,34,23,0.15))' : '#c04a1b'}`,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                display: 'grid',
                gap: 4,
              }}
            >
              <div style={{ color: r.ok ? 'inherit' : '#c04a1b' }}>{r.message}</div>
              {r.claimUrl && (
                <code style={{ wordBreak: 'break-all', color: 'var(--soft-amber, #b97314)' }}>{r.claimUrl}</code>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
