import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import NewsletterCapture from '@/components/NewsletterCapture'

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

          <div style={{ marginTop: 40 }}>
            <NewsletterCapture
              source="blog"
              variant="card"
              heading="Forge of the Week"
              subhead="One curated AI-built tool, in your inbox every Tuesday. No noise, no hype — just the best new product on the marketplace and what it replaces."
              ctaLabel="Get the first issue"
            />
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
