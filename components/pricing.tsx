import Link from 'next/link'
import { getContentBatch } from '@/lib/content'

export default async function Pricing() {
  const copy = await getContentBatch([
    'pricing.section_tag',
    'pricing.heading',
    'pricing.tier_label',
    'pricing.commission_note',
    'pricing.cta_label',
  ])

  return (
    <section className="section" id="pricing">
      <div className="section-tag">{copy['pricing.section_tag']}</div>
      <h2
        className="section-title"
        dangerouslySetInnerHTML={{ __html: copy['pricing.heading'] }}
      />

      <div
        style={{
          marginTop: 32,
          maxWidth: 720,
          marginInline: 'auto',
          border: '2px solid var(--warm-ink, #2a2217)',
          padding: '40px 32px',
          display: 'grid',
          gap: 20,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--soft-amber, #b97314)',
          }}
        >
          {copy['pricing.tier_label']}
        </div>

        <div
          style={{
            fontFamily: 'var(--font-bebas, "Bebas Neue", sans-serif)',
            fontSize: 'clamp(56px, 8vw, 96px)',
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}
        >
          £0
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted, #6b6b6b)',
              marginLeft: 12,
            }}
          >
            to list, forever
          </span>
        </div>

        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: 12,
            maxWidth: 480,
            marginInline: 'auto',
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            textAlign: 'left',
          }}
        >
          {[
            'Unlimited listings',
            'AI-generated sales page from your URL',
            'Spec-sheet, screenshots & video walkthrough',
            'Verified Builder badge for the first 50 sellers',
            'Stripe payouts direct to your account',
            'Featured placement during launch window',
          ].map(line => (
            <li key={line} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: '#3fa85a', fontSize: 18, flexShrink: 0 }}>✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted, #6b6b6b)',
            margin: 0,
          }}
        >
          {copy['pricing.commission_note']}
        </p>

        <div>
          <Link
            href="/submit"
            className="btn-amber"
            style={{ display: 'inline-block', padding: '14px 36px', fontSize: 16 }}
          >
            {copy['pricing.cta_label']}
          </Link>
        </div>
      </div>

      <p
        style={{
          textAlign: 'center',
          marginTop: 24,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--muted, #6b6b6b)',
          letterSpacing: '0.1em',
        }}
      >
        Pro &amp; Studio tiers (analytics, Flippa cross-listing, sandbox demos)
        unlock once we hit 50 verified builders.
      </p>
    </section>
  )
}
