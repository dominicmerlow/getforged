'use client'

import { track } from '@/lib/analytics'

interface Props {
  href: string
  productId: string
  slug: string
  label?: string
}

export default function DemoLink({ href, productId, slug, label = 'See Live Demo ↗' }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-hero-secondary"
      style={{ textDecoration: 'none' }}
      onClick={() =>
        track('click_demo', {
          product_id: productId,
          slug,
          demo_url: href,
        })
      }
    >
      {label}
    </a>
  )
}
