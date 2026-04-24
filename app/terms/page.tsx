import Nav from '@/components/nav'
import Footer from '@/components/footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — GetForged',
}

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="section-tag">Legal</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--warm-ink)', opacity: 0.55, marginBottom: '3rem', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
            Last updated: April 2026
          </p>

          <div style={{ lineHeight: 1.8, color: 'var(--warm-ink)', fontFamily: 'var(--font-sans)', fontSize: 17 }}>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using GetForged (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, you must stop using the Platform immediately. These terms apply to all visitors, registered users, buyers, and sellers. We may update these terms from time to time; continued use after changes are posted constitutes acceptance.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              2. Marketplace Rules
            </h2>
            <p>
              GetForged is a marketplace where independent sellers list AI-built software applications for sale. Sellers warrant that they own all intellectual property rights in their listings and that their products do not infringe third-party rights, violate any law, or contain malicious code. Buyers receive a licence to use the purchased product (or, for Exclusive listings, ownership of the codebase), not a transfer of the underlying IP unless explicitly stated as &ldquo;Exclusive&rdquo;.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              All product descriptions, demo links, and technical specifications must be accurate. GetForged reserves the right to remove any listing that violates these rules at any time, without notice.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              3. Licence vs. Exclusive
            </h2>
            <p>
              <strong>Licensed:</strong> The buyer receives a perpetual, non-exclusive, non-transferable licence to use the software for their own business purposes. The seller retains IP ownership and may sell licences to other buyers.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              <strong>Exclusive:</strong> The buyer receives the full codebase and sole rights to the product. The seller agrees not to resell or re-list the same product after the transaction completes. Ownership of the IP transfers to the buyer upon confirmed payment.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              4. Platform Fees
            </h2>
            <p>
              GetForged charges a 15% commission on each completed sale. This fee is deducted from the seller&apos;s payout before funds are remitted. Buyers pay the listed price in full. Prices are shown in GBP. Stripe processes all payments; applicable taxes are the responsibility of each party per their jurisdiction.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              5. Prohibited Content
            </h2>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Products that violate intellectual property rights</li>
              <li>Malware, spyware, or software designed to deceive end-users</li>
              <li>Products facilitating illegal activity</li>
              <li>Misleading or fabricated product demonstrations</li>
              <li>Adult content or anything harmful to minors</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              Repeated violations will result in permanent account suspension and may be referred to relevant authorities.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              6. Termination
            </h2>
            <p>
              GetForged may suspend or terminate your account at any time for breach of these terms, fraudulent activity, or at our sole discretion with reasonable notice. You may close your account at any time by contacting support@getforged.io. Outstanding obligations (e.g., pending payouts or active licences) survive termination.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              7. Limitation of Liability
            </h2>
            <p>
              The Platform is provided &ldquo;as is&rdquo;. GetForged does not warrant that the Platform will be uninterrupted or error-free, nor does it endorse or guarantee any individual product listing. To the fullest extent permitted by law, GetForged&apos;s total liability for any claim arising from use of the Platform is limited to the amount you paid in the 30 days preceding the claim. GetForged is not liable for indirect, incidental, or consequential damages.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              8. Governing Law
            </h2>
            <p>
              These terms are governed by the laws of England and Wales. Any disputes arising from these terms or use of the Platform shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>

            <p style={{ marginTop: '3rem', opacity: 0.5, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
              Questions? Email legal@getforged.io
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
