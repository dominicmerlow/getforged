'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MessageSquare, UserCog, PlusCircle } from 'lucide-react'

const TABS = [
  { href: '/dashboard',          label: 'Listings', Icon: LayoutDashboard },
  { href: '/dashboard/messages', label: 'Messages', Icon: MessageSquare },
  { href: '/dashboard/profile',  label: 'Profile',  Icon: UserCog },
  { href: '/submit',             label: 'New listing', Icon: PlusCircle },
]

function isActive(pathname: string, href: string): boolean {
  // Exact match for the index, prefix for the rest, so
  // /dashboard/products/[id]/edit doesn't light up every tab.
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

/** Seller console navigation. Shares `.gf-admin-side` with the admin sidebar so
 *  both back-offices behave identically, including the mobile tab collapse. */
export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="gf-admin-side" aria-label="Dashboard sections">
      <div className="gf-admin-side-label">Seller</div>
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={isActive(pathname, href) ? 'page' : undefined}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
