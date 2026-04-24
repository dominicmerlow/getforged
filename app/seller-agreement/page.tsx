import Nav from '@/components/nav'
import Footer from '@/components/footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Seller Agreement — GetForged',
}

export default function SellerAgreementPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="section-tag">Legal</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
            Seller Agreement
          </h1>
          <p style={{ color: 'var(--warm-ink)', opacity: 0.55, marginBottom: '3rem', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
            Last updated: April 2026
          </p>

          <div style={{ lineHeight: 1.8, color: 'var(--warm-ink)', fontFamily: 'var(--font-sans)', fontSize: 17 }}>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              1. Eligibility
            </h2>
            <p>
              To sell on GetForged you must be at least 18 years old (or the age of legal majority in your jurisdiction), capable of entering a binding contract, and not prohibited from doing so under applicable law. By submitting a product listing, you confirm that you meet these requirements and agree to the terms of this Seller Agreement.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              2. Intellectual Property Ownership
            </h2>
            <p>
              You must own all intellectual property rights in everything you list. This includes the source code, any assets bundled with the product, and any third-party libraries — which must be licensed in a way that permits the sale and use described in your listing. You are solely responsible for ensuring your product does not infringe patents, trademarks, copyrights, or trade secrets belonging to others.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              By listing a product, you grant GetForged a non-exclusive, royalty-free licence to display product information, screenshots, and promotional materials on the Platform and in marketing materials for the purposes of operating the marketplace.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              3. Commission & Pricing
            </h2>
            <p>
              GetForged charges a <strong>15% commission</strong> on each completed sale. You set your own listing price. Commission is calculated on the gross transaction amount before any applicable taxes. The remaining 85% constitutes your payout. Prices must be denominated in GBP unless we explicitly enable other currencies.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              4. Payout Schedule
            </h2>
            <p>
              Payouts are processed via Stripe Connect. Once Stripe Connect is fully live on the Platform, sellers with a connected Stripe account will receive payouts on a rolling 7-day basis after each sale clears the refund window. <strong>Currently, payouts are processed manually</strong> — we will contact you directly to arrange payment for completed sales. You must provide accurate payment details and keep them up to date.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              5. Seller Responsibilities
            </h2>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Product titles, descriptions, and feature lists must be accurate and not misleading.</li>
              <li>Demo links and preview environments must remain live and functional for as long as the listing is active.</li>
              <li>For Exclusive listings: once a sale completes, you must hand over the full codebase promptly and must not re-list the same product or sell it to another buyer.</li>
              <li>You are responsible for providing basic support to buyers as described in your listing&apos;s support terms.</li>
              <li>You must respond to buyer enquiries within a reasonable timeframe (we recommend within 3 business days).</li>
            </ul>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              6. Prohibited Listings
            </h2>
            <p>
              The following are not permitted on GetForged:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Products you do not own or do not have the right to sell</li>
              <li>Malicious software, backdoors, or data-harvesting tools</li>
              <li>Products that facilitate fraud, spam, or illegal activity</li>
              <li>Clone products that are near-identical reskins of existing listed products</li>
              <li>Products with fabricated or manipulated demo environments</li>
            </ul>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              7. Termination
            </h2>
            <p>
              GetForged may suspend or remove individual listings or your entire seller account for breach of this agreement, high refund rates, IP disputes, or other conduct that is harmful to buyers or the Platform. We will attempt to provide reasonable notice unless immediate action is required to protect buyers. You may close your seller account at any time by emailing support@getforged.io; outstanding payouts for completed sales will still be remitted.
            </p>

            <p style={{ marginTop: '3rem', opacity: 0.5, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
              Seller questions? Email sellers@getforged.io
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
