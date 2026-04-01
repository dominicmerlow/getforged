import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <div className="footer-brand-name">
            GETFORGED<span>.</span>
          </div>
          <div className="footer-tagline">Built by builders. Made for business.</div>
        </div>

        <div className="footer-cols">
          <div className="footer-col">
            <h4>Marketplace</h4>
            <ul>
              <li><Link href="/browse">Browse Products</Link></li>
              <li><Link href="/browse?category=ai-automation">AI Automation</Link></li>
              <li><Link href="/browse?category=web-apps">Web Apps</Link></li>
              <li><Link href="/browse?category=crm-sales">CRM &amp; Sales Tools</Link></li>
              <li><Link href="/browse?category=ecommerce">E-Commerce</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>For Sellers</h4>
            <ul>
              <li><Link href="/register">List Your App</Link></li>
              <li><Link href="/dashboard">Seller Dashboard</Link></li>
              <li><Link href="/#pricing">Pricing Plans</Link></li>
              <li><Link href="/#exit">Flippa Exit</Link></li>
              <li><Link href="/guide">Seller Guide</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About GetForged</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/press">Press</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-copy">
          © 2026 GETFORGED — ALL RIGHTS RESERVED
        </div>
        <div className="footer-legal">
          <span><Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link></span>
          <span><Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link></span>
          <span><Link href="/seller-tos" style={{ color: 'inherit', textDecoration: 'none' }}>Seller ToS</Link></span>
          <span><Link href="/cookies" style={{ color: 'inherit', textDecoration: 'none' }}>Cookies</Link></span>
        </div>
      </div>
    </footer>
  )
}
