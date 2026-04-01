import Link from 'next/link'

export default function DualPersona() {
  return (
    <div className="dual-section" id="for-sellers">
      <div className="dual-inner">

        {/* For Builders */}
        <div className="dual-half reveal">
          <div className="dual-label">For Builders</div>
          <h2>Turn Your Code Into Cash.</h2>
          <p>
            You built something remarkable with Claude Code, Cursor, or Lovable.
            Stop leaving it on your hard drive. List it on GetForged and let
            50,000 SME buyers find it.
          </p>
          <ul className="dual-list">
            <li>Submit your URL — AI writes your full sales page automatically</li>
            <li>Set your price: licensed, exclusive, or subscription</li>
            <li>Earn passive income or list your business for full exit via Flippa</li>
            <li>Dashboard tracks revenue, conversion, and buyer geography</li>
            <li>Free to list — we only earn when you do (15% commission)</li>
          </ul>
          <Link href="/register" className="btn-amber">
            Start Selling Free →
          </Link>
        </div>

        {/* For Businesses */}
        <div className="dual-half reveal">
          <div className="dual-label">For Businesses</div>
          <h2>Powerful Tools. Honest Prices.</h2>
          <p>
            You need automation, a web app, or an AI tool. But you&apos;re not paying
            £15,000 to an agency or £500/day to a developer. GetForged is your shortcut.
          </p>
          <ul className="dual-list">
            <li>Browse by category — find exactly what your business needs</li>
            <li>Try before you buy: free trials, live demos, video walkthroughs</li>
            <li>Buy a licence (multi-use) or exclusive ownership (yours alone)</li>
            <li>No-code setup wizard — live in hours, not months</li>
            <li>Real builders, real products, real reviews</li>
          </ul>
          <Link href="/browse" className="btn-hero-secondary" style={{ padding: '14px 28px' }}>
            Browse the Marketplace
          </Link>
        </div>

      </div>
    </div>
  )
}
