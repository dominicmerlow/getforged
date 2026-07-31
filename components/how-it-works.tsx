import { Link2, Sparkles, ShoppingBag, Banknote } from 'lucide-react'

/* Lucide SVGs rather than the emoji this section used to render: emoji are
   drawn by the OS, so 🔗 was a different colour, weight and size on every
   visitor's machine, and screen readers announce them as prose. */
const STEPS = [
  {
    num: '01',
    Icon: Link2,
    title: 'Connect your app',
    desc: 'Submit your product URL. GetForged crawls your app and extracts features, screenshots and copy automatically.',
  },
  {
    num: '02',
    Icon: Sparkles,
    title: 'AI writes your page',
    desc: 'Claude generates a full buyer-facing sales page — headline, benefits, use cases, SEO. You review and publish.',
  },
  {
    num: '03',
    Icon: ShoppingBag,
    title: 'Buyers discover and buy',
    desc: 'Buyers browse by category, watch demos, and purchase a licence or exclusive rights.',
  },
  {
    num: '04',
    Icon: Banknote,
    title: 'You get paid',
    desc: 'Revenue lands in your Stripe account. Sell licences for recurring income, or list the whole business for exit.',
  },
]

export default function HowItWorks() {
  return (
    <section className="gf-section">
      <div className="gf-section-head">
        <div>
          <h2 className="gf-section-title">From URL to listed in 48 hours</h2>
          <p className="gf-section-sub">
            Submit your app URL. Our AI crawls it, writes the sales page, and publishes your
            listing. Buyers find you. You earn.
          </p>
        </div>
      </div>

      <div className="how-grid">
        {STEPS.map(({ num, Icon, title, desc }) => (
          <div key={num} className="how-card reveal">
            <div className="how-icon">
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="how-num">Step {num}</div>
            <h3>{title}</h3>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
