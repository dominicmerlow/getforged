import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import {
  StepRow,
  IllustrationFrame,
  BenefitGrid,
  MockProductCard,
} from '@/components/HowItWorksShared'

export const metadata: Metadata = {
  title: 'How it works — for buyers',
  description:
    'Skip the £50k dev quote. Find ready-to-ship AI-built apps for your business on FORGE — browse, buy, deploy in one afternoon.',
}

export default function BuyersPage() {
  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="section" style={{ paddingBottom: 32 }}>
          <div className="section-tag">For buyers</div>
          <h1
            className="section-title"
            style={{
              fontSize: 'clamp(48px, 7vw, 96px)',
              maxWidth: 900,
              lineHeight: 1.02,
            }}
          >
            Skip the <span>£50k dev quote</span>.
            <br />
            Buy a finished app instead.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(20px, 2vw, 26px)',
              lineHeight: 1.45,
              color: 'var(--warm-ink-dim)',
              maxWidth: 760,
              marginTop: 24,
            }}
          >
            FORGE is a marketplace of AI-built apps, automations and internal
            tools — made by indie builders using Claude Code, Cursor, and the
            modern AI stack, priced for small businesses that can&apos;t afford
            agency rates.
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 32, flexWrap: 'wrap' }}>
            <Link href="/browse" className="btn-hero-primary" style={{ padding: '14px 32px' }}>
              Browse the marketplace →
            </Link>
            <Link href="/how-it-works/sellers" className="btn-hero-secondary" style={{ padding: '14px 32px' }}>
              I&apos;m a seller
            </Link>
          </div>
        </section>

        {/* Steps */}
        <section className="section" style={{ paddingTop: 24 }}>
          <div className="section-tag">How it works</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>
            From <span>brief</span> to <span>shipped</span> in one afternoon
          </h2>

          <div style={{ marginTop: 40 }}>
            <StepRow
              number="01"
              title="Browse listings by outcome, not tech"
              body={
                <>
                  Every app on FORGE is tagged by the business problem it solves
                  — invoice chasing, client portal, lead tracking, review
                  monitoring. Filter by category, budget, or platform (Web, iOS,
                  Shopify, etc).
                </>
              }
              illustration={
                <IllustrationFrame caption="/browse — live catalogue">
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 4,
                    }}
                  >
                    {['All', 'AI Automation', 'Web App', 'CRM & Sales'].map((c, i) => (
                      <span
                        key={c}
                        className={i === 0 ? 'filter-chip active' : 'filter-chip'}
                        style={{ padding: '5px 14px', fontSize: 11, borderRadius: 2 }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <MockProductCard
                      tag="AI automation"
                      title="InvoiceBot Pro"
                      tagline="Chases overdue invoices from Notion. Zero effort."
                      price="£149"
                    />
                    <MockProductCard
                      tag="CRM & Sales"
                      title="LeadTrackr"
                      tagline="Lightweight pipeline CRM for service businesses."
                      price="£89/mo"
                    />
                  </div>
                </IllustrationFrame>
              }
            />

            <StepRow
              number="02"
              title="Every listing has a full spec sheet"
              body={
                <>
                  No marketing fluff. See the AI models inside, the integrations
                  it ships with, the monthly running cost, the time to deploy,
                  and a live video walkthrough — before you pay a penny.
                </>
              }
              reverse
              illustration={
                <IllustrationFrame caption="product spec panel">
                  <SpecPeek label="Platform" value="Web · iOS · Shopify App" />
                  <SpecPeek label="Native AI" value="Claude Sonnet 4.5" />
                  <SpecPeek label="Integrations" value="Stripe · Notion · Slack" />
                  <SpecPeek label="Monthly cost to run" value="£18/mo approx" />
                  <SpecPeek label="Time to deploy" value="15 minutes" />
                </IllustrationFrame>
              }
            />

            <StepRow
              number="03"
              title="Choose licence — or buy it outright"
              body={
                <>
                  <strong style={{ color: 'var(--warm-ink)' }}>Licence</strong>{' '}
                  for a one-time fee, keep the seller on the hook for
                  maintenance. Or buy <strong style={{ color: 'var(--warm-ink)' }}>exclusive rights</strong>{' '}
                  — full source, remove the listing from the marketplace, make
                  it yours.
                </>
              }
              illustration={
                <IllustrationFrame caption="at checkout">
                  <PricingPeek type="Licence" price="£149" sub="one-time · seller maintains" featured />
                  <PricingPeek type="Exclusive" price="£1,200" sub="buy-out · full source, yours forever" />
                </IllustrationFrame>
              }
            />

            <StepRow
              number="04"
              title="Pay by card. Get access in minutes."
              body={
                <>
                  Stripe Checkout in GBP. Instant email with deploy instructions,
                  the repo (for exclusive buys), and a direct line to the seller
                  if you need setup help.
                </>
              }
              reverse
              illustration={
                <IllustrationFrame caption="your inbox, 90 seconds later">
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--warm-muted)' }}>
                    noreply@getforged.io
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontStyle: 'italic', color: 'var(--warm-ink)' }}>
                    You bought InvoiceBot Pro — here&apos;s your deploy kit
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--warm-ink-dim)', lineHeight: 1.5 }}>
                    Receipt: £149 licence · Setup guide: 4 steps · Seller:
                    cliftonflack (reply to this email to reach them).
                  </div>
                </IllustrationFrame>
              }
            />
          </div>
        </section>

        {/* Benefits */}
        <section className="section">
          <div className="section-tag">Why buy on FORGE</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>
            The agency quote, <span>without the agency</span>
          </h2>
          <BenefitGrid
            items={[
              {
                icon: '⚡',
                title: 'Shipped, not scoped',
                body: 'Every app is live and buyable today. No Statement of Work, no six-week discovery phase.',
              },
              {
                icon: '🔍',
                title: 'Fully transparent',
                body: 'You see the stack, the AI models, the integrations, and the monthly cost before you buy.',
              },
              {
                icon: '🔓',
                title: 'No lock-in',
                body: 'Licence terms in plain English. Exclusive buys transfer source and kill the listing.',
              },
              {
                icon: '💬',
                title: 'Talk to the builder',
                body: 'Every listing has a Message Seller button. These are indie devs, not call centres.',
              },
              {
                icon: '💷',
                title: 'Priced for SMEs',
                body: 'From £49 to £5k. Replace a £30k agency quote or a 6-figure software team.',
              },
              {
                icon: '🛡️',
                title: 'Stripe-secured',
                body: 'Refund protection for 14 days on licences. If it doesn&apos;t deploy, you don&apos;t pay.',
              },
            ]}
          />
        </section>

        {/* CTA */}
        <section
          className="section"
          style={{
            textAlign: 'center',
            background: 'var(--warm-ink)',
            color: 'var(--cream)',
            marginTop: 32,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(36px, 5vw, 60px)',
              color: 'var(--cream)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Find the tool your business needs.
          </h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginTop: 16, color: 'rgba(251,246,236,0.75)' }}>
            Curated apps. 90-second checkout. Deploy by dinner.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
            <Link
              href="/browse"
              className="btn-hero-primary"
              style={{ padding: '16px 36px' }}
            >
              Browse all products →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

// ── Small inline helper components used only on this page ──────────
function SpecPeek({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 2,
        paddingBottom: 10,
        borderBottom: '1px dashed rgba(42,34,23,0.12)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--warm-muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          color: 'var(--warm-ink)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function PricingPeek({
  type,
  price,
  sub,
  featured = false,
}: {
  type: string
  price: string
  sub: string
  featured?: boolean
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 4,
        padding: 14,
        background: featured ? 'var(--soft-amber)' : 'transparent',
        color: featured ? 'var(--cream)' : 'var(--warm-ink)',
        border: '1px solid',
        borderColor: featured ? 'var(--soft-amber)' : 'rgba(42,34,23,0.15)',
        borderRadius: 3,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          opacity: featured ? 0.85 : 0.7,
        }}
      >
        {type}
      </span>
      <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 30, letterSpacing: '0.04em', lineHeight: 1 }}>
        {price}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 13,
          opacity: featured ? 0.9 : 0.7,
        }}
      >
        {sub}
      </span>
    </div>
  )
}
