import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Contact GetForged',
  description: 'Get in touch with GetForged — for builders, buyers, press and partnerships.',
}

const channels = [
  {
    label: 'For builders',
    detail: 'List your app, ask about Founding Builder status, or pitch a product partnership.',
    cta: 'List your app →',
    href: '/submit',
  },
  {
    label: 'For buyers',
    detail: "Can't find the right tool? Describe what you need and our AI will find a match — or capture it for the build queue.",
    cta: 'Try the AI Concierge →',
    href: '/concierge',
  },
  {
    label: 'Press & partnerships',
    detail: 'Interviews, brand assets, and integration enquiries.',
    cta: 'Email hello@getforged.io',
    href: 'mailto:hello@getforged.io',
  },
  {
    label: 'Buyer & seller support',
    detail: 'Refunds, payouts, account questions, anything in-flight.',
    cta: 'Email support@getforged.io',
    href: 'mailto:support@getforged.io',
  },
]

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 820 }}>
          <div className="section-tag">Contact</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,6vw,72px)' }}>
            Talk to <span>us</span>.
          </h1>
          <p style={{
            marginTop: 16,
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            lineHeight: 1.5,
            maxWidth: 640,
          }}>
            Pick the channel that fits — we read everything and reply within
            one working day.
          </p>

          <div style={{
            marginTop: 40,
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          }}>
            {channels.map(c => (
              <div
                key={c.label}
                style={{
                  padding: 24,
                  border: '1px solid rgba(42,39,32,0.15)',
                  display: 'grid',
                  gap: 12,
                  alignContent: 'start',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--soft-amber, #b97314)',
                }}>
                  {c.label}
                </div>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.5, margin: 0 }}>
                  {c.detail}
                </p>
                {c.href.startsWith('mailto:') ? (
                  <a href={c.href} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--warm-ink, #2a2217)',
                    textDecoration: 'underline',
                  }}>
                    {c.cta}
                  </a>
                ) : (
                  <Link href={c.href} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--warm-ink, #2a2217)',
                    textDecoration: 'underline',
                  }}>
                    {c.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
