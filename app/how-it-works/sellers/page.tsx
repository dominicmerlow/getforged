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
  title: 'How it works — for sellers',
  description:
    'Turn your weekend AI builds into real revenue. Drop a URL, we generate the sales page, and send qualified buyers to your listing.',
}

export default function SellersPage() {
  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="section" style={{ paddingBottom: 32 }}>
          <div className="section-tag">For sellers</div>
          <h1
            className="section-title"
            style={{
              fontSize: 'clamp(48px, 7vw, 96px)',
              maxWidth: 960,
              lineHeight: 1.02,
            }}
          >
            Turn your <span>weekend builds</span>
            <br />
            into real monthly revenue.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(20px, 2vw, 26px)',
              lineHeight: 1.45,
              color: 'var(--warm-ink-dim)',
              maxWidth: 780,
              marginTop: 24,
            }}
          >
            You built the thing. You don&apos;t want to write sales copy, run
            Stripe, chase SEO, or do support. FORGE handles the marketplace —
            you ship the app, we bring the buyers. Keep 85% of every sale.
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 32, flexWrap: 'wrap' }}>
            <Link href="/submit" className="btn-hero-primary" style={{ padding: '14px 32px' }}>
              List your first app →
            </Link>
            <Link href="/how-it-works/buyers" className="btn-hero-secondary" style={{ padding: '14px 32px' }}>
              I&apos;m a buyer
            </Link>
          </div>
        </section>

        {/* Steps */}
        <section className="section" style={{ paddingTop: 24 }}>
          <div className="section-tag">How it works</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>
            From <span>URL</span> to <span>listed</span> in 90 seconds
          </h2>

          <div style={{ marginTop: 40 }}>
            <StepRow
              number="01"
              title="Sign in with email. No signup forms."
              body={
                <>
                  We send you a magic link. One click and you&apos;re in. Your
                  seller profile is created automatically — no onboarding
                  slideshow.
                </>
              }
              illustration={
                <IllustrationFrame caption="/login">
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--soft-amber)',
                    }}
                  >
                    Sellers
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 34,
                      fontStyle: 'italic',
                      color: 'var(--warm-ink)',
                      lineHeight: 1.05,
                    }}
                  >
                    Sign in
                  </div>
                  <div
                    style={{
                      padding: 10,
                      border: '1px solid rgba(42,34,23,0.15)',
                      borderRadius: 2,
                      background: 'var(--cream-2)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--warm-muted)',
                    }}
                  >
                    you@company.com
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '10px 18px',
                      background: 'var(--soft-amber)',
                      color: 'var(--cream)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      borderRadius: 2,
                      alignSelf: 'start',
                    }}
                  >
                    Send magic link
                  </div>
                </IllustrationFrame>
              }
            />

            <StepRow
              number="02"
              title="Drop your product URL. We do the rest."
              body={
                <>
                  We scrape your site, run it through Claude and DeepSeek, and
                  generate a full sales page — headline, features, use cases,
                  SEO copy. All in about 15 seconds.
                </>
              }
              reverse
              illustration={
                <IllustrationFrame caption="/submit">
                  <div
                    style={{
                      padding: 10,
                      border: '1px solid rgba(42,34,23,0.15)',
                      borderRadius: 2,
                      background: 'var(--cream-2)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--warm-ink)',
                    }}
                  >
                    https://invoicebot.pro
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--warm-muted)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    → Firecrawl scrapes the page
                    <br />
                    → Claude + DeepSeek generate sales copy
                    <br />
                    → Draft lands in your dashboard
                  </div>
                  <div
                    style={{
                      padding: '6px 0',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 14,
                      fontStyle: 'italic',
                      color: 'var(--warm-ink-dim)',
                    }}
                  >
                    Average time: 15 seconds.
                  </div>
                </IllustrationFrame>
              }
            />

            <StepRow
              number="03"
              title="Review, tweak, set pricing"
              body={
                <>
                  Your dashboard shows the AI-generated draft alongside a full
                  edit form. Fix the headline, add AI models you use, set a
                  licence price, an exclusive price — or both. Takes 2 minutes.
                </>
              }
              illustration={
                <IllustrationFrame caption="/dashboard/products/.../edit">
                  <MockProductCard
                    tag="Draft · AI generated"
                    title="InvoiceBot Pro"
                    tagline="Invoices that chase themselves."
                    price="£149"
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Claude Sonnet 4.5', 'Stripe', 'Notion'].map(t => (
                      <span
                        key={t}
                        style={{
                          padding: '3px 10px',
                          background: 'var(--soft-amber)',
                          color: 'var(--cream)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          borderRadius: 2,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </IllustrationFrame>
              }
            />

            <StepRow
              number="04"
              title="One click to publish"
              body={
                <>
                  Hit <em>Approve → Live</em> and your product is public on the
                  marketplace. Nothing is auto-posted — you&apos;re always in
                  control of what goes live.
                </>
              }
              reverse
              illustration={
                <IllustrationFrame caption="dashboard actions">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '8px 16px',
                        background: 'var(--soft-amber)',
                        color: 'var(--cream)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        borderRadius: 2,
                      }}
                    >
                      Approve → Live
                    </span>
                    <span className="btn-ghost" style={{ padding: '8px 16px', fontSize: 11 }}>
                      Archive
                    </span>
                    <span className="btn-ghost" style={{ padding: '8px 16px', fontSize: 11 }}>
                      Edit
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 14,
                      color: 'var(--warm-ink-dim)',
                      lineHeight: 1.5,
                    }}
                  >
                    Your draft ships to <code style={{ fontFamily: 'var(--font-mono)' }}>/products/invoicebot-pro</code>.
                    SEO metadata, social cards, sitemap entry — all
                    automatic.
                  </div>
                </IllustrationFrame>
              }
            />

            <StepRow
              number="05"
              title="Get paid, automatically"
              body={
                <>
                  Every sale drops into your connected Stripe account.
                  Platform commission is <strong style={{ color: 'var(--warm-ink)' }}>15%</strong>. You
                  keep 85% — on both licences and exclusive buy-outs. No
                  hidden fees, no payout minimums.
                </>
              }
              illustration={
                <IllustrationFrame caption="sale breakdown · example">
                  <BreakdownRow label="Buyer pays" value="£149.00" />
                  <BreakdownRow label="Stripe fees" value="−£3.25" subtle />
                  <BreakdownRow label="Platform commission (15%)" value="−£21.86" subtle />
                  <div
                    style={{
                      borderTop: '1px solid rgba(42,34,23,0.15)',
                      paddingTop: 10,
                      marginTop: 4,
                    }}
                  >
                    <BreakdownRow label="Lands in your Stripe" value="£123.89" big />
                  </div>
                </IllustrationFrame>
              }
            />
          </div>
        </section>

        {/* Benefits */}
        <section className="section">
          <div className="section-tag">Why sell on FORGE</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>
            Built for <span>indie AI builders</span>
          </h2>
          <BenefitGrid
            items={[
              {
                icon: '🧠',
                title: 'Zero marketing overhead',
                body: 'We generate your sales copy, handle SEO, and run the marketplace. You just ship code.',
              },
              {
                icon: '⚙️',
                title: 'Sell it twice',
                body: 'Licence repeatedly for £49-£299, OR buy-out for £1k-£10k+. Same listing, two revenue streams.',
              },
              {
                icon: '🎯',
                title: 'Qualified traffic only',
                body: 'Buyers arrive via category filters and spec-sheet search. They already know what they need.',
              },
              {
                icon: '💳',
                title: 'Instant payouts',
                body: 'Stripe Connect drops every sale directly in your account. No monthly invoice dance.',
              },
              {
                icon: '📬',
                title: 'Seller support baked in',
                body: 'Buyers message you through FORGE. Reply from your inbox. Automatic record-keeping.',
              },
              {
                icon: '🪪',
                title: 'Your IP, your terms',
                body: 'You own the code. Exclusive buys transfer it. Licence buys keep you selling forever.',
              },
            ]}
          />
        </section>

        {/* Pricing summary */}
        <section className="section">
          <div className="section-tag">Seller pricing</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(36px, 5vw, 60px)' }}>
            Free to list. <span>15% when you earn.</span>
          </h2>
          <div
            style={{
              marginTop: 32,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            {[
              { k: 'Listing fee', v: '£0', sub: 'List as many apps as you want' },
              { k: 'Monthly fee', v: '£0', sub: 'No subscription, ever' },
              { k: 'Commission', v: '15%', sub: 'Taken automatically from each sale' },
              { k: 'Payout schedule', v: 'Instant', sub: 'Direct to your Stripe account' },
            ].map(row => (
              <div key={row.k} className="product-card" style={{ padding: 24 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--warm-muted)',
                  }}
                >
                  {row.k}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-bebas)',
                    fontSize: 56,
                    letterSpacing: '0.02em',
                    color: 'var(--warm-ink)',
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {row.v}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 14,
                    color: 'var(--warm-ink-dim)',
                    marginTop: 8,
                  }}
                >
                  {row.sub}
                </div>
              </div>
            ))}
          </div>
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
            You&apos;ve already built it. Let it earn.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              marginTop: 16,
              color: 'rgba(251,246,236,0.75)',
            }}
          >
            Free to list. First sale usually lands within the first week.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              marginTop: 32,
              flexWrap: 'wrap',
            }}
          >
            <Link href="/submit" className="btn-hero-primary" style={{ padding: '16px 36px' }}>
              List your first app →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function BreakdownRow({
  label,
  value,
  subtle = false,
  big = false,
}: {
  label: string
  value: string
  subtle?: boolean
  big?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        fontFamily: 'var(--font-serif)',
        fontSize: big ? 18 : 14,
        color: subtle ? 'var(--warm-muted)' : 'var(--warm-ink)',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-bebas), sans-serif',
          fontSize: big ? 32 : 18,
          color: big ? 'var(--soft-amber)' : 'inherit',
          letterSpacing: '0.02em',
        }}
      >
        {value}
      </span>
    </div>
  )
}
