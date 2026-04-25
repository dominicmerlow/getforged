'use client'

import { useActionState } from 'react'
import { regenerateScreenshot, type ScreenshotState } from './actions'

export default function RegenerateScreenshotButton({ productId }: { productId: string }) {
  const action = regenerateScreenshot.bind(null, productId)
  const [state, formAction, isPending] = useActionState<ScreenshotState, FormData>(action, null)

  return (
    <form action={formAction} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button
        type="submit"
        disabled={isPending}
        className="btn-hero-secondary"
        style={{
          padding: '8px 14px',
          fontSize: 12,
          cursor: isPending ? 'wait' : 'pointer',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Capturing screenshot…' : '📸 Auto-capture screenshot from URL'}
      </button>
      {state && 'ok' in state && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#3fa85a' }}>
          ✓ Screenshot saved. Refresh the page to see it.
        </span>
      )}
      {state && 'error' in state && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#c87d1a' }}>
          {state.error}
        </span>
      )}
    </form>
  )
}
