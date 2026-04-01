export default function FlippaStrip() {
  return (
    <div className="flippa-strip" id="exit">
      <div className="flippa-inner">
        <div className="flippa-left">
          <div className="flippa-eyebrow">Exit Strategy</div>
          <h3>
            Ready to Sell<br />
            the Whole Business?
          </h3>
          <p>
            GetForged integrates directly with Flippa — the world&apos;s largest marketplace
            for buying and selling online businesses. Cross-list your product for maximum
            exposure, or initiate a full business auction with Flippa&apos;s verified buyer network.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
          <div className="flippa-badge">
            <div className="flippa-badge-logo">FLIPPA</div>
            <div className="flippa-badge-text">
              Official Integration Partner<br />
              <span className="flippa-badge-sub">Cross-listing + Full Exit Auctions</span>
            </div>
          </div>
          <button className="btn-ghost" style={{ padding: '12px 24px' }}>
            Learn About Exits →
          </button>
        </div>
      </div>
    </div>
  )
}
