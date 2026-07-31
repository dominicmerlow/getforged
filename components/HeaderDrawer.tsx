'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import SearchBar from '@/components/SearchBar'

interface HeaderDrawerProps {
  authed: boolean
  isAdmin: boolean
}

/**
 * Mobile menu. Below 900px the primary nav is hidden and the header search is
 * dropped for space, so this drawer has to carry both — otherwise Browse,
 * Concierge and search become unreachable on a phone.
 */
export default function HeaderDrawer({ authed, isAdmin }: HeaderDrawerProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        className="gf-drawer-toggle"
        aria-expanded={open}
        aria-controls="gf-drawer"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen(o => !o)}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {open && (
        <div id="gf-drawer" className="gf-drawer">
          <div style={{ padding: '12px 0' }}>
            <SearchBar id="gf-drawer-search" placeholder="Search AI tools" />
          </div>
          <nav aria-label="Mobile">
            <Link href="/browse" onClick={close}>Browse</Link>
            <Link href="/concierge" onClick={close}>Concierge</Link>
            <Link href="/how-it-works/buyers" onClick={close}>For buyers</Link>
            <Link href="/how-it-works/sellers" onClick={close}>For sellers</Link>
            {authed ? (
              <>
                <Link href="/wishlist" onClick={close}>Saved</Link>
                <Link href="/dashboard" onClick={close}>Dashboard</Link>
                {isAdmin && <Link href="/admin" onClick={close}>Admin</Link>}
              </>
            ) : (
              <>
                <Link href="/login" onClick={close}>Sign in</Link>
                <Link href="/submit" onClick={close}>List your app</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  )
}
