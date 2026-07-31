import Link from 'next/link'
import { Check } from 'lucide-react'
import { getContentBatch } from '@/lib/content'

const INCLUDED = [
  'Unlimited listings',
  'AI-generated sales page from your URL',
  'Spec sheet, screenshots and video walkthrough',
  'Verified Builder badge for the first 50 sellers',
  'Secure checkout via Stripe on every sale',
  'Featured placement during the launch window',
]

/**
 * Seller pricing. One tier, so it renders as a single centred card rather than
 * a comparison grid — a lone card in a three-column layout looks like two
 * options failed to load.
 *
 * Copy still comes from `site_content` so it stays admin-editable.
 */
export default async function Pricing() {
  const copy = await getContentBatch([
    'pricing.section_tag',
    'pricing.heading',
    'pricing.tier_label',
    'pricing.commission_note',
    'pricing.cta_label',
  ])

  return (
    <section className="gf-section" id="pricing">
      <div className="gf-section-head" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <div>
          <h2
            className="gf-section-title"
            dangerouslySetInnerHTML={{ __html: copy['pricing.heading'] }}
          />
          <p className="gf-section-sub" style={{ marginInline: 'auto' }}>
            {copy['pricing.section_tag']}
          </p>
        </div>
      </div>

      <div
        className="gf-panel"
        style={{ maxWidth: 640, marginInline: 'auto', borderColor: 'var(--gf-amber)', borderWidth: 2 }}
      >
        <div className="gf-panel-body" style={{ padding: 32, textAlign: 'center' }}>
          <div className="pricing-tier">{copy['pricing.tier_label']}</div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
            <span className="pricing-price" style={{ fontSize: 56, marginBottom: 0 }}>£0</span>
            <span style={{ fontSize: 16, color: 'var(--gf-text-2)' }}>to list, forever</span>
          </div>

          <ul
            style={{
              listStyle: 'none', display: 'grid', gap: 12,
              maxWidth: 420, marginInline: 'auto', textAlign: 'left', marginBottom: 24,
            }}
          >
            {INCLUDED.map(line => (
              <li key={line} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15, color: 'var(--gf-text-2)' }}>
                <Check size={18} strokeWidth={2.4} aria-hidden="true" style={{ color: 'var(--gf-success)', flexShrink: 0, marginTop: 2 }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <p style={{ fontSize: 14, color: 'var(--gf-text-2)', marginBottom: 20 }}>
            {copy['pricing.commission_note']}
          </p>

          <Link href="/submit" className="btn btn-primary btn-lg">
            {copy['pricing.cta_label']}
          </Link>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--gf-text-2)' }}>
        Pro and Studio tiers (analytics, Flippa cross-listing, sandbox demos) unlock once we
        reach 50 verified builders.
      </p>
    </section>
  )
}
