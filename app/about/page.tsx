import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'About GetForged',
  description: 'GetForged is the marketplace for AI-built apps and automations. Pre-built, priced like software, owned like assets.',
}

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 820 }}>
          <div className="section-tag">About</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,6vw,72px)' }}>
            The marketplace for the next generation of <span>builders</span>.
          </h1>

          <div style={{
            marginTop: 32,
            display: 'grid',
            gap: 24,
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            lineHeight: 1.6,
          }}>
            <p>
              A new class of builder is shipping faster than agencies can quote.
              Claude Code, Cursor, Lovable, v0, Bolt — what used to take a quarter
              now takes a weekend.
            </p>
            <p>
              GetForged is where those builders meet the small businesses who need
              what they&apos;ve built. Pre-built apps, automations and internal tools —
              installed in hours, priced like software, owned like assets.
            </p>
            <p>
              We&apos;re currently onboarding our first wave of <strong>Founding Builders</strong>
              {' '}— curated, verified, and free to list. If you&apos;ve shipped something
              remarkable, <Link href="/submit" style={{ color: 'var(--soft-amber, #b97314)' }}>list it free →</Link>
            </p>
          </div>

          <div style={{
            marginTop: 56,
            padding: '32px',
            border: '2px solid var(--warm-ink, #2a2217)',
            display: 'grid',
            gap: 16,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--soft-amber, #b97314)',
            }}>
              How we&apos;re different
            </div>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 12,
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
            }}>
              <li>✓ Every listing has a full spec sheet — platform, AI models, monthly run cost, deploy time</li>
              <li>✓ Buy a licence (perpetual use) or exclusive ownership (yours alone)</li>
              <li>✓ AI Concierge matches buyers to tools by plain-English problem description</li>
              <li>✓ 7-day money-back guarantee on every purchase</li>
              <li>✓ Builders keep 85% — we earn only when you sell</li>
            </ul>
          </div>

          <div style={{ marginTop: 56, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/browse" className="btn-hero-primary">Browse the Marketplace →</Link>
            <Link href="/submit" className="btn-hero-secondary">List Your App</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
