import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Press — GetForged',
  description: 'Press resources, brand assets and contact for GetForged — the AI builder marketplace.',
}

export default function PressPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 820 }}>
          <div className="section-tag">Press</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,6vw,72px)' }}>
            For <span>writers</span> and reporters.
          </h1>

          <p style={{
            marginTop: 24,
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            lineHeight: 1.5,
          }}>
            GetForged is the marketplace for AI-built apps, automations and
            internal tools — built by Claude Code, Cursor, Lovable and v0 power
            users, sold to the small businesses who need them.
          </p>

          <div style={{
            marginTop: 48,
            display: 'grid',
            gap: 24,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}>
            <div style={{ padding: 24, border: '1px solid rgba(42,39,32,0.15)' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--soft-amber, #b97314)',
                marginBottom: 8,
              }}>
                One-line pitch
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.5, margin: 0 }}>
                A marketplace for the apps you would have hired a developer to build.
              </p>
            </div>

            <div style={{ padding: 24, border: '1px solid rgba(42,39,32,0.15)' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--soft-amber, #b97314)',
                marginBottom: 8,
              }}>
                Founded
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.5, margin: 0 }}>
                2026. Currently in Founding Builder onboarding phase.
              </p>
            </div>

            <div style={{ padding: 24, border: '1px solid rgba(42,39,32,0.15)' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--soft-amber, #b97314)',
                marginBottom: 8,
              }}>
                Built with
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.5, margin: 0 }}>
                Next.js · Supabase · Stripe · Claude · Resend · Vercel
              </p>
            </div>
          </div>

          <div style={{
            marginTop: 56,
            padding: 32,
            border: '2px solid var(--warm-ink, #2a2217)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--soft-amber, #b97314)',
              marginBottom: 12,
            }}>
              Press contact
            </div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, margin: 0, lineHeight: 1.5 }}>
              For interviews, custom data on the marketplace, or product imagery,
              get in touch via the <Link href="/contact" style={{ color: 'var(--soft-amber, #b97314)' }}>contact page →</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
