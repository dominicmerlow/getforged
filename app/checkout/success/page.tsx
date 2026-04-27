import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import PurchaseTracker from '@/components/PurchaseTracker'
import { getStripe, stripeConfigured } from '@/lib/stripe'

export const metadata: Metadata = {
  title: 'Purchase complete',
}

export const dynamic = 'force-dynamic'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  let productName: string | null = null
  let amountLabel: string | null = null
  let amountTotal: number | null = null
  let currency: string | null = null

  if (session_id && stripeConfigured()) {
    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items'],
      })
      productName = session.line_items?.data[0]?.description ?? null
      amountTotal = session.amount_total ?? null
      currency = session.currency ?? null
      if (amountTotal != null) {
        amountLabel = new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: (currency ?? 'gbp').toUpperCase(),
        }).format(amountTotal / 100)
      }
    } catch {
      // swallow — show the generic success message
    }
  }

  return (
    <>
      <Nav />
      <PurchaseTracker
        sessionId={session_id ?? null}
        productName={productName}
        amountTotal={amountTotal}
        currency={currency}
      />
      <main>
        <section className="section" style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', textAlign: 'center' }}>
          <div style={{ maxWidth: 640 }}>
            <div className="section-tag">Paid</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(40px,5.5vw,72px)' }}>
              You&apos;re <span>in</span>.
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginTop: 16 }}>
              {productName
                ? `Payment confirmed for ${productName}${amountLabel ? ` (${amountLabel})` : ''}.`
                : 'Payment confirmed.'}
              {' '}We&apos;ve emailed you a receipt and notified the seller — they&apos;ll be in touch with access details.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
              <Link href="/browse" className="btn-hero-primary" style={{ padding: '14px 28px' }}>
                Browse more products
              </Link>
              <Link href="/dashboard" className="btn-hero-secondary" style={{ padding: '14px 28px' }}>
                Go to dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
