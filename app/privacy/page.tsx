import Nav from '@/components/nav'
import Footer from '@/components/footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — GetForged',
}

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 820, margin: '0 auto' }}>
          <div className="section-tag">Legal</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--warm-ink)', opacity: 0.55, marginBottom: '3rem', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
            Last updated: April 2026
          </p>

          <div style={{ lineHeight: 1.8, color: 'var(--warm-ink)', fontFamily: 'var(--font-sans)', fontSize: 17 }}>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              1. What We Collect
            </h2>
            <p>
              When you create an account, we collect your email address and the display name you choose. When you make a purchase or set up as a seller, Stripe collects your payment or payout details directly — GetForged never sees or stores your full card number or bank account details. We also collect standard usage data (pages visited, browser type, approximate location derived from IP) to understand how the Platform is used and to improve it.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              2. How We Store Your Data
            </h2>
            <p>
              User accounts and product data are stored in Supabase, a Postgres-based cloud database hosted on AWS infrastructure in the EU. Supabase is SOC 2 Type II certified. Your password is never stored in plain text — authentication is handled via Supabase Auth using bcrypt hashing. We retain your account data for as long as your account is active, plus a reasonable period after deletion for legal and fraud-prevention purposes.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              3. Third-Party Services
            </h2>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Stripe</strong> — processes all payments. Stripe&apos;s own privacy policy governs the data you share with them at checkout.</li>
              <li><strong>Resend</strong> — handles transactional email (order confirmations, password resets). We share only your email address and the minimum data needed to send the relevant email.</li>
              <li><strong>Supabase</strong> — database and authentication infrastructure.</li>
              <li><strong>Vercel</strong> — hosts the application. Vercel may log request metadata for security and performance purposes.</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>
              We do not sell your data to any third party, ever. We do not use your data for advertising targeting on other platforms.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              4. Cookies & Tracking
            </h2>
            <p>
              We use essential session cookies required for authentication. We do not use advertising cookies or third-party tracking pixels. Basic analytics (page views, referrers) may be collected in aggregate form; this data is not linked to individual identities.
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              5. Your Rights (GDPR)
            </h2>
            <p>
              If you are located in the UK or EU, you have the right to access, correct, or delete your personal data. You may also request a portable copy of your data or object to certain processing. To exercise any of these rights, email privacy@getforged.io with &ldquo;Data Request&rdquo; in the subject line. We will respond within 30 days. You also have the right to lodge a complaint with your local data protection authority (in the UK: the ICO at ico.org.uk).
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              6. Data Retention & Deletion
            </h2>
            <p>
              You may request deletion of your account at any time by emailing privacy@getforged.io. We will delete or anonymise your personal data within 30 days, except where retention is required by law (e.g., financial records for tax purposes, which may be kept for up to 7 years).
            </p>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, marginBottom: '0.75rem', marginTop: '2.5rem' }}>
              7. Changes to This Policy
            </h2>
            <p>
              We may update this policy as our services evolve. Material changes will be communicated by email or prominent notice on the Platform. Continued use after the effective date constitutes acceptance of the revised policy.
            </p>

            <p style={{ marginTop: '3rem', opacity: 0.5, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
              Privacy questions? Email privacy@getforged.io
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
