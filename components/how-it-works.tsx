const STEPS = [
  {
    num: '01',
    icon: '🔗',
    title: 'Connect Your App',
    desc: 'Submit your product URL. GetForged crawls your app, extracts features, screenshots and copy automatically.',
  },
  {
    num: '02',
    icon: '✨',
    title: 'AI Writes Your Page',
    desc: 'Claude API generates a full buyer-facing sales page — headline, benefits, use-cases, SEO. You review and publish.',
  },
  {
    num: '03',
    icon: '🛒',
    title: 'Buyers Discover & Buy',
    desc: 'SME buyers browse by category, watch demos, try free trials, and purchase licensed or exclusive versions.',
  },
  {
    num: '04',
    icon: '💸',
    title: 'You Get Paid',
    desc: 'Revenue lands in your Stripe account. Sell licences for recurring income — or list your full business for exit via Flippa.',
  },
]

export default function HowItWorks() {
  return (
    <section className="section">
      <div className="section-tag">How it works</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
        <h2 className="section-title">
          From <span>URL</span><br />
          to listed<br />
          in 48 hours.
        </h2>
        <p className="section-body">
          Submit your app URL. Our AI crawls it, writes the sales page, and publishes your listing.
          Buyers find you. You earn.
        </p>
      </div>

      <div className="how-grid">
        {STEPS.map((step) => (
          <div key={step.num} className="how-card reveal">
            <div className="how-num">{step.num}</div>
            <div className="how-icon">{step.icon}</div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
