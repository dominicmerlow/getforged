import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Blog — GetForged',
  description: 'Stories, deep dives and launch notes from the GetForged builder community. Coming soon.',
}

export default function BlogPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 720 }}>
          <div className="section-tag">Journal</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,6vw,72px)' }}>
            The Forge <span>Journal</span>
          </h1>

          <p style={{
            marginTop: 24,
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            lineHeight: 1.5,
          }}>
            Coming soon — case studies on the first Founding Builders, how-tos on
            shipping AI-built tools, and one new featured product every Tuesday.
          </p>

          <div style={{
            marginTop: 40,
            padding: 28,
            border: '1px dashed rgba(42,39,32,0.3)',
            display: 'grid',
            gap: 12,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--soft-amber, #b97314)',
            }}>
              Forge of the Week
            </div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, margin: 0, lineHeight: 1.5 }}>
              One curated AI-built tool, in your inbox every Tuesday. No noise, no
              hype — just the best new product on the marketplace and what it
              replaces.
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#6b6b6b',
              margin: 0,
            }}>
              Newsletter signup launching with the first issue.
            </p>
          </div>

          <div style={{ marginTop: 48 }}>
            <Link href="/browse" className="btn-hero-primary">
              Browse the Marketplace →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
