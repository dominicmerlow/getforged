import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        GET<span>FORGED</span>
      </Link>

      <ul className="nav-links">
        <li><Link href="/browse">Browse</Link></li>
        <li><Link href="/#for-sellers">For Sellers</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
        <li><Link href="/#exit">Exit via Flippa</Link></li>
      </ul>

      <div className="nav-actions">
        <Link href="/login" className="btn-ghost">Sign In</Link>
        <Link href="/register" className="btn-amber">List Your App</Link>
      </div>
    </nav>
  )
}
