import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'How FORGE works',
  description:
    'Two sides of the marketplace. Builders list AI apps they built. Businesses buy them. Here is how each side works.',
}

export default function HowItWorksIndex() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ textAlign: 'center' }}>
          <div className="section-tag">How it works</div>
          <h1
            className="section-title"
            style={{
              fontSize: 'clamp(48px, 7vw, 96px)',
              maxWidth: 1000,
              margin: '0 auto',
              lineHeight: 1.02,
            }}
          >
            Two sides of the <span>forge</span>.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(20px, 2vw, 26px)',
              lineHeight: 1.45,
              color: 'var(--warm-ink-dim)',
              maxWidth: 720,
              margin: '24px auto 0',
            }}
          >
            Builders turn weekend AI projects into revenue. Small businesses buy
            ready-to-ship apps for a fraction of an agency quote. Pick your side.
          </p>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 24,
              maxWidth: 1200,
              margin: '0 auto',
            }}
          >
            <PathCard
              href="/how-it-works/buyers"
              eyebrow="For buyers"
              title="Find ready-to-ship apps"
              body="Browse AI-built tools tagged by the business problem they solve. Full spec sheet, transparent pricing, deploy in an afternoon."
              cta="See the buyer flow →"
            />
            <PathCard
              href="/how-it-works/sellers"
              eyebrow="For sellers"
              title="Turn builds into revenue"
              body="Drop a URL, we generate the sales page, buyers pay by card, you keep 85%. Zero marketing required."
              cta="See the seller flow →"
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function PathCard({
  href,
  eyebrow,
  title,
  body,
  cta,
}: {
  href: string
  eyebrow: string
  title: string
  body: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="product-card"
      style={{
        padding: 48,
        display: 'grid',
        gap: 16,
        textDecoration: 'none',
        alignContent: 'start',
        minHeight: 320,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--soft-amber)',
        }}
      >
        {eyebrow}
      </span>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(32px, 4vw, 48px)',
          fontWeight: 400,
          color: 'var(--warm-ink)',
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.015em',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          lineHeight: 1.55,
          color: 'var(--warm-ink-dim)',
          margin: 0,
        }}
      >
        {body}
      </p>
      <span
        style={{
          marginTop: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--soft-amber)',
          letterSpacing: '0.08em',
        }}
      >
        {cta}
      </span>
    </Link>
  )
}
