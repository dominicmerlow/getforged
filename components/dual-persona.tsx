import Link from 'next/link'
import Image from 'next/image'

/**
 * The two-audience split. A marketplace has to sell to supply and demand at
 * once, and burying either side costs listings or buyers.
 *
 * Each half now carries its own photograph — the section was previously two
 * walls of text separated by a hairline, which read as terms and conditions
 * rather than an invitation.
 */
export default function DualPersona() {
  return (
    <div className="dual-section" id="for-sellers">
      <div className="dual-inner">

        <div className="dual-half reveal">
          <Image
            src="/img/sellers.jpg"
            alt="A developer working on code at a desk"
            width={800}
            height={450}
            loading="lazy"
            sizes="(max-width: 900px) 100vw, 45vw"
            style={{
              width: '100%', height: 160, objectFit: 'cover',
              borderRadius: 'var(--gf-radius)', marginBottom: 20,
            }}
          />
          <div className="dual-label">For builders</div>
          <h2>Turn your code into revenue</h2>
          <p>
            You built something good with Claude Code, Cursor or Lovable. Listing it puts it in
            front of buyers who are actively looking for AI-built tools.
          </p>
          <ul className="dual-list">
            <li>Submit your URL. AI writes the full sales page automatically</li>
            <li>Set your own price: licensed, exclusive, or subscription</li>
            <li>Earn recurring income, or list the business for a full exit</li>
            <li>Dashboard tracks revenue, conversion and buyer geography</li>
            <li>Free to list, we only earn when you do (15% commission)</li>
          </ul>
          <Link href="/register" className="btn btn-primary">Start selling free</Link>
        </div>

        <div className="dual-half reveal">
          <Image
            src="/img/buyers.jpg"
            alt="A small business team reviewing work together on a laptop"
            width={800}
            height={450}
            loading="lazy"
            sizes="(max-width: 900px) 100vw, 45vw"
            style={{
              width: '100%', height: 160, objectFit: 'cover',
              borderRadius: 'var(--gf-radius)', marginBottom: 20,
            }}
          />
          <div className="dual-label">For businesses</div>
          <h2>Powerful tools, honest prices</h2>
          <p>
            You need an automation, a web app, or an AI tool, without paying £15,000 to an
            agency or £500 a day to a contractor.
          </p>
          <ul className="dual-list">
            <li>Browse by category to find exactly what your business needs</li>
            <li>Try before you buy: live demos and video walkthroughs</li>
            <li>Buy a licence, or exclusive ownership that&apos;s yours alone</li>
            <li>Setup measured in hours, not months</li>
            <li>Real builders, real products, real reviews</li>
          </ul>
          <Link href="/browse" className="btn btn-secondary">Browse the marketplace</Link>
        </div>

      </div>
    </div>
  )
}
