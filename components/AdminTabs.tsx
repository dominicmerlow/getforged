'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Package, Send, FileText, Settings, ScrollText,
} from 'lucide-react'

/**
 * Persistent navigation for the /admin section.
 *
 * A sidebar on desktop, collapsing to the previous horizontal tab strip below
 * 900px (handled entirely by `.gf-admin-side` in globals.css). A back-office
 * with seven destinations reads better as a vertical list — the labels stay
 * left-aligned and scannable instead of competing for a single row of width.
 *
 * Active state matches exactly for "/admin" and by prefix for the rest, so
 * /admin/products/[id]/edit still highlights Products.
 */

interface Tab {
  href: string
  label: string
  Icon: typeof LayoutDashboard
}

const TABS: Tab[] = [
  { href: '/admin',           label: 'Overview',  Icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',     Icon: Users },
  { href: '/admin/products',  label: 'Products',  Icon: Package },
  { href: '/admin/prospects', label: 'Prospects', Icon: Send },
  { href: '/admin/content',   label: 'Content',   Icon: FileText },
  { href: '/admin/settings',  label: 'Settings',  Icon: Settings },
  { href: '/admin/audit',     label: 'Audit',     Icon: ScrollText },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AdminTabs() {
  const pathname = usePathname()

  return (
    <nav className="gf-admin-side" aria-label="Admin sections">
      <div className="gf-admin-side-label">Administration</div>
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? 'page' : undefined}
        >
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
