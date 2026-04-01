import Link from 'next/link'

const PLANS = [
  {
    tier: 'Starter',
    price: '0',
    cadence: 'forever free',
    featured: false,
    features: [
      { text: '2 active listings',           included: true },
      { text: 'AI sales page generation',    included: true },
      { text: 'Screenshot gallery',          included: true },
      { text: 'Basic seller dashboard',      included: true },
      { text: 'Video walkthrough',           included: false },
      { text: 'Sandbox demo',                included: false },
      { text: 'Flippa cross-listing',        included: false },
    ],
    cta: 'Get Started Free',
    ctaClass: 'btn-ghost',
    href: '/register',
  },
  {
    tier: 'Pro',
    price: '29',
    cadence: 'per month',
    featured: true,
    features: [
      { text: '10 active listings',          included: true },
      { text: 'AI sales page generation',    included: true },
      { text: 'Video walkthrough',           included: true },
      { text: 'Free trial tier management',  included: true },
      { text: 'Full analytics dashboard',    included: true },
      { text: 'Flippa cross-listing',        included: true },
      { text: 'Sponsored placement',         included: false },
    ],
    cta: 'Start Pro Trial',
    ctaClass: 'btn-amber',
    href: '/register?plan=pro',
  },
  {
    tier: 'Studio',
    price: '79',
    cadence: 'per month',
    featured: false,
    features: [
      { text: 'Unlimited listings',          included: true },
      { text: 'Live sandbox demos',          included: true },
      { text: 'Featured placement slots',    included: true },
      { text: 'Priority buyer matching',     included: true },
      { text: 'Full analytics + exports',    included: true },
      { text: 'Flippa exit listing support', included: true },
      { text: 'Dedicated account manager',   included: true },
    ],
    cta: 'Go Studio',
    ctaClass: 'btn-ghost',
    href: '/register?plan=studio',
  },
]

export default function Pricing() {
  return (
    <section className="section" id="pricing">
      <div className="section-tag">Seller Plans</div>
      <h2 className="section-title">
        List Free.<br />Grow on <span>Your Terms.</span>
      </h2>

      <div className="pricing-grid">
        {PLANS.map(plan => (
          <div
            key={plan.tier}
            className={`pricing-card reveal${plan.featured ? ' featured' : ''}`}
          >
            <div className="pricing-tier">{plan.tier}</div>
            <div className="pricing-price"><sup>£</sup>{plan.price}</div>
            <div className="pricing-cadence">{plan.cadence}</div>
            <div className="pricing-divider" />
            <ul className="pricing-features">
              {plan.features.map(f => (
                <li key={f.text}>
                  <span className={f.included ? 'check' : 'cross'}>
                    {f.included ? '✓' : '✗'}
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={plan.ctaClass}
              style={{ width: '100%', padding: '12px', display: 'block', textAlign: 'center' }}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <p style={{
        textAlign: 'center',
        marginTop: '28px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--muted)',
        letterSpacing: '0.1em',
      }}>
        All plans include 15% commission on sales. No hidden fees.
      </p>
    </section>
  )
}
