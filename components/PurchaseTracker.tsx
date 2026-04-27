'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

interface Props {
  sessionId?: string | null
  productName?: string | null
  amountTotal?: number | null
  currency?: string | null
}

export default function PurchaseTracker({ sessionId, productName, amountTotal, currency }: Props) {
  useEffect(() => {
    if (!sessionId) return
    // Idempotency: PostHog dedups by ($session_id, event_name, distinct_id) so
    // duplicate refreshes won't double-count revenue in funnels.
    track('purchase_success', {
      session_id: sessionId,
      product_name: productName ?? null,
      amount: amountTotal ?? null,  // in pence/cents from Stripe
      currency: currency ?? null,
    })
  }, [sessionId, productName, amountTotal, currency])

  return null
}
