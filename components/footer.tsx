import Link from 'next/link'

/*
  Dense multi-column footer — on a marketplace this is real navigation, not
  decoration, so it carries every category and both audience paths.
*/
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Categories',
    links: [
      { label: 'AI Automation',    href: '/browse/ai-automation' },
      { label: 'Web Apps & Tools', href: '/browse/web-apps' },
      { label: 'CRM & Sales',      href: '/browse/crm-sales' },
      { label: 'Marketing',        href: '/browse/marketing' },
      { label: 'E-Commerce',       href: '/browse/ecommerce' },
      { label: 'Operations',       href: '/browse/operations' },
    ],
  },
  {
    title: 'For buyers',
    links: [
      { label: 'Browse listings', href: '/browse' },
      { label: 'How it works',    href: '/how-it-works/buyers' },
      { label: 'Concierge',       href: '/concierge' },
      { label: 'Compare tools',   href: '/compare' },
      { label: 'Refund policy',   href: '/refund-policy' },
    ],
  },
  {
    title: 'For sellers',
    links: [
      { label: 'List your app',    href: '/submit' },
      { label: 'Seller dashboard', href: '/dashboard' },
      { label: 'Seller guide',     href: '/how-it-works/sellers' },
      { label: 'Pricing',          href: '/#pricing' },
      { label: 'Seller agreement', href: '/seller-agreement' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About',   href: '/about' },
      { label: 'Blog',    href: '/blog' },
      { label: 'Press',   href: '/press' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="gf-footer">
      <div className="gf-footer-inner">
        <div className="gf-footer-cols">
          {COLUMNS.map(col => (
            <div className="gf-footer-col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map(link => (
                  <li key={link.href + link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="gf-footer-bottom">
          <span className="gf-footer-copy">
            © {new Date().getFullYear()} GetForged. Built by builders, made for business.
          </span>
          <nav className="gf-footer-legal" aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/refund-policy">Refunds</Link>
            <Link href="/seller-agreement">Seller agreement</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
