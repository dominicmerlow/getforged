import Link from 'next/link'

export default function FlippaStrip() {
  return (
    <div className="flippa-strip" id="exit">
      <div className="flippa-inner">
        <div className="flippa-left">
          <div className="flippa-eyebrow">Exit strategy</div>
          <h3>Ready to sell the whole business?</h3>
          <p>
            GetForged integrates with Flippa, the largest marketplace for buying and selling
            online businesses. Cross-list your product for wider exposure, or run a full
            business auction in front of Flippa&apos;s verified buyer network.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
          <div className="flippa-badge">
            <div className="flippa-badge-logo">Flippa</div>
            <div className="flippa-badge-text">
              Official integration partner
              <br />
              <span className="flippa-badge-sub">Cross-listing and full exit auctions</span>
            </div>
          </div>
          {/* Was a bare <button> that did nothing when clicked. */}
          <Link href="/how-it-works/sellers#exit" className="btn btn-secondary">
            Learn about exits
          </Link>
        </div>
      </div>
    </div>
  )
}
