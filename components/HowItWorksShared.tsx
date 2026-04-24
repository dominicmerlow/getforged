import type { ReactNode } from 'react'

// Reusable building blocks for the /how-it-works/buyers and /sellers pages.
// Pure server components — no interactivity needed.

export function StepRow({
  number,
  title,
  body,
  illustration,
  reverse = false,
}: {
  number: string
  title: string
  body: ReactNode
  illustration: ReactNode
  reverse?: boolean
}) {
  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 48,
        alignItems: 'center',
        padding: '56px 0',
        borderTop: '1px solid rgba(42,34,23,0.1)',
        direction: reverse ? 'rtl' : 'ltr',
      }}
    >
      <div style={{ direction: 'ltr' }}>
        <div
          style={{
            fontFamily: 'var(--font-bebas), sans-serif',
            fontSize: 72,
            color: 'var(--soft-amber, #b97314)',
            lineHeight: 1,
            letterSpacing: '0.04em',
            marginBottom: 12,
          }}
        >
          {number}
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(28px, 3.2vw, 40px)',
            fontStyle: 'italic',
            fontWeight: 400,
            color: 'var(--warm-ink, #2a2217)',
            margin: 0,
            marginBottom: 12,
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 18,
            lineHeight: 1.6,
            color: 'var(--warm-ink-dim, #5d513f)',
            maxWidth: 520,
          }}
        >
          {body}
        </div>
      </div>

      <div style={{ direction: 'ltr' }}>{illustration}</div>
    </article>
  )
}

export function IllustrationFrame({
  children,
  caption,
}: {
  children: ReactNode
  caption?: string
}) {
  return (
    <div
      style={{
        background: 'var(--cream-2, #f4ece0)',
        border: '1px solid rgba(42,34,23,0.12)',
        borderRadius: 4,
        padding: 28,
        boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 4px 12px rgba(42,34,23,0.06)',
        display: 'grid',
        gap: 14,
      }}
    >
      <div
        style={{
          background: 'var(--cream, #fbf6ec)',
          border: '1px solid rgba(42,34,23,0.08)',
          borderRadius: 3,
          padding: 24,
          display: 'grid',
          gap: 16,
        }}
      >
        {children}
      </div>
      {caption && (
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 11,
            color: 'var(--warm-muted, #8a7d69)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  )
}

export function BenefitGrid({
  items,
}: {
  items: { icon: string; title: string; body: string }[]
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 20,
        marginTop: 32,
      }}
    >
      {items.map(item => (
        <div
          key={item.title}
          className="product-card"
          style={{
            padding: 28,
            display: 'grid',
            gap: 10,
            alignContent: 'start',
          }}
        >
          <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 4 }}>{item.icon}</div>
          <h4
            style={{
              fontFamily: 'var(--font-sans), Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: 17,
              color: 'var(--warm-ink, #2a2217)',
              margin: 0,
            }}
          >
            {item.title}
          </h4>
          <p
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--warm-ink-dim, #5d513f)',
              margin: 0,
            }}
          >
            {item.body}
          </p>
        </div>
      ))}
    </div>
  )
}

// Mini inline mock of a product card — used inside illustration frames.
export function MockProductCard({
  title,
  tagline,
  price,
  tag,
}: {
  title: string
  tagline: string
  price: string
  tag?: string
}) {
  return (
    <div
      style={{
        background: 'var(--cream-2, #f4ece0)',
        border: '1px solid rgba(42,34,23,0.12)',
        borderRadius: 3,
        padding: 16,
        display: 'grid',
        gap: 8,
      }}
    >
      {tag && (
        <span
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10,
            color: 'var(--soft-amber, #b97314)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          {tag}
        </span>
      )}
      <div
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 18,
          fontStyle: 'italic',
          color: 'var(--warm-ink, #2a2217)',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: 13,
          color: 'var(--warm-ink-dim, #5d513f)',
          lineHeight: 1.45,
        }}
      >
        {tagline}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-bebas), sans-serif',
          fontSize: 20,
          color: 'var(--warm-ink, #2a2217)',
          letterSpacing: '0.04em',
          marginTop: 4,
        }}
      >
        {price}
      </div>
    </div>
  )
}
