'use client'

import { useEffect } from 'react'

export default function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    if (!productId || productId.startsWith('seed-')) return
    fetch('/api/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    }).catch(() => {}) // silent fail
  }, [productId])

  return null
}
