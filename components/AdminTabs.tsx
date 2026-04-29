'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Persistent tabbed nav for the /admin section.
 *
 * Active state matches by exact path for "/admin" and prefix-match for the
 * rest, so /admin/products/[id]/edit still highlights the "Products" tab.
 *
 * Rendered by app/admin/layout.tsx — every admin route gets it for free.
 */

interface Tab {
  href: string
  label: string
}

const TABS: Tab[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/content', label: 'Content' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/audit', label: 'Audit' },
]

function isActive(pathname: string, href: string): boolean {
  // /admin must match exactly (otherwise it would highlight on every sub-page).
  // Sub-tabs prefix-match so deep links like /admin/products/[id]/edit still
  // highlight their parent tab.
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AdminTabs() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Admin sections"
      style={{
        background: 'rgba(244,237,224,0.6)',
        borderBottom: '1px solid rgba(42,39,32,0.12)',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
        }}
      >
        {TABS.map(tab => {
          const active = isActive(pathname, tab.href)
          return (
            <li key={tab.href} style={{ flexShrink: 0 }}>
              <Link
                href={tab.href}
                style={{
                  display: 'block',
                  padding: '14px 18px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: active
                    ? 'var(--warm-ink, #2a2217)'
                    : 'rgba(42,34,23,0.55)',
                  fontWeight: active ? 700 : 500,
                  textDecoration: 'none',
                  borderBottom: active
                    ? '3px solid var(--soft-amber, #b97314)'
                    : '3px solid transparent',
                  marginBottom: -1,
                  transition: 'color 120ms ease, border-color 120ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
