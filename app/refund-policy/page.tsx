import Nav from '@/components/nav'
import Footer from '@/components/footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy — GetForged',
}

export default function RefundPolicyPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="section-tag">Legal</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
            Refund Policy
          </h1>
          <p style={{ color: 'var(--warm-ink)', opacity: 0.55, marginBottom: '3rem', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
            Last updated: April 2026
          </p>

          <div style={{ lineHeight: 1.8, color: 'var(--warm-ink)', fontFamily: 'var(--font-sans)', fontSize: 17 }}>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              Our Guarantee
            </h2>
            <p>
              We want you to feel confident buying on GetForged. All purchases — both Licensed and Exclusive — come with a <strong>7-day money-back guarantee</strong>. If you are not satisfied with your purchase for any reason, contact us within 7 days of your payment date and we will issue a full refund, no questions asked.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              How to Request a Refund
            </h2>
            <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Email <strong>support@getforged.io</strong> with the subject line &ldquo;Refund Request&rdquo;.</li>
              <li>Include your order ID (found in your purchase confirmation email) and a brief note on why you are requesting a refund.</li>
              <li>We will process your request within 3 business days. Refunds are returned to the original payment method via Stripe and typically appear within 5–10 business days depending on your bank.</li>
            </ol>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              Exclusions
            </h2>
            <p>
              The 7-day guarantee applies from the date of payment. The following situations are excluded from refunds:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Requests submitted more than 7 days after purchase.</li>
              <li>Exclusive purchases where the full codebase or repository access has already been delivered to the buyer and the seller has confirmed delivery. In this case, refunds are at our discretion and subject to negotiation with the seller.</li>
              <li>Purchases where the buyer has already deployed the product commercially and is generating revenue from it.</li>
              <li>Disputes arising from misuse of the product contrary to the licence terms.</li>
            </ul>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              Seller Implications
            </h2>
            <p>
              When a buyer receives a valid refund, the corresponding commission previously held will be released. Sellers whose products have a disproportionate refund rate may be contacted for review. GetForged reserves the right to temporarily pause listings with consistently high refund rates pending a quality review.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              Contact
            </h2>
            <p>
              If you have any questions about this policy or need help with an order, reach out at <strong>support@getforged.io</strong>. We aim to respond to all support queries within 1 business day.
            </p>

            <p style={{ marginTop: '3rem', opacity: 0.5, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
              Order issues? Email support@getforged.io
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
