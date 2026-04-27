'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

interface Props {
  productId: string
  slug?: string
  category?: string | null
  priceMain?: string
}

export default function ViewTracker({ productId, slug, category, priceMain }: Props) {
  useEffect(() => {
    if (!productId || productId.startsWith('seed-')) return

    // Persist a server-side view count (rate-limited)
    fetch('/api/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    }).catch(() => {}) // silent fail

    // PostHog event for funnel reporting
    track('view_product', {
      product_id: productId,
      slug: slug ?? null,
      category: category ?? null,
      price: priceMain ?? null,
    })
  }, [productId, slug, category, priceMain])

  return null
}
