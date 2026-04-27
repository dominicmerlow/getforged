'use client'

import { track } from '@/lib/analytics'

interface Props {
  slug: string
  productId: string
  purchaseType: 'licensed' | 'exclusive'
  category?: string | null
  priceMain: string
  label: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Native form post to /api/checkout (so the request goes through Stripe's
 * server-side redirect with no JS dependency). We just hook into onSubmit
 * to fire a `start_checkout` event before the navigation.
 */
export default function BuyButton({
  slug,
  productId,
  purchaseType,
  category,
  priceMain,
  label,
  className = 'btn-hero-primary',
  style,
}: Props) {
  return (
    <form
      action="/api/checkout"
      method="post"
      style={{ display: 'inline' }}
      onSubmit={() => {
        track('start_checkout', {
          product_id: productId,
          slug,
          purchase_type: purchaseType,
          category: category ?? null,
          price: priceMain,
        })
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="purchase_type" value={purchaseType} />
      <button
        type="submit"
        className={className}
        style={{ cursor: 'pointer', border: 'none', ...style }}
      >
        {label}
      </button>
    </form>
  )
}
