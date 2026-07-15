'use client'

import Link from 'next/link'
import { useState } from 'react'

const LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/concierge', label: 'Concierge' },
  { href: '/how-it-works/buyers', label: 'For Buyers' },
  { href: '/how-it-works/sellers', label: 'For Sellers' },
  { href: '/#pricing', label: 'Pricing' },
]

/**
 * Mobile hamburger + drawer for the primary nav links. `.nav-links` is
 * hidden entirely below 900px (see globals.css) with no other way to reach
 * Browse/Concierge/Pricing on a phone — this is the replacement.
 */
export default function MobileNavToggle() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen(o => !o)}
      >
        <span className={`mobile-nav-icon${open ? ' is-open' : ''}`}>
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <nav id="mobile-nav-drawer" className="mobile-nav-drawer" aria-label="Primary">
          <ul>
            {LINKS.map(link => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
