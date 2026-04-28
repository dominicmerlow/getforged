import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('YOUR_PROJECT') && !key.startsWith('your_')
}

async function getUser() {
  if (!supabaseConfigured()) return null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data.user ?? null
  } catch {
    return null
  }
}

export default async function Nav() {
  const user = await getUser()

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo" aria-label="GetForged home">
        {/*
          Hexagonal "G" shield mark — the new GetForged logo.
          - Outer path: horizontally-stretched hexagon, amber fill (currentColor on the parent
            anchor, but locked to amber here so the icon stays on-brand on light or dark bg).
          - Inner G: cut as a negative-space punch using `evenodd` fill-rule.
          - Small triangular notch on the right of the G arm hints at "forging / forward motion".
          The whole mark is single-fill amber so it sits cleanly on either ink or paper backgrounds.
        */}
        <svg
          className="nav-logo-mark"
          viewBox="0 0 100 90"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            fill="var(--amber, #e8920a)"
            d="
              M 25 4
              L 75 4
              L 96 45
              L 75 86
              L 25 86
              L 4 45
              Z

              M 50 22
              C 36 22, 28 32, 28 45
              C 28 58, 36 68, 50 68
              C 60 68, 67 64, 71 58
              L 71 47
              L 49 47
              L 49 53
              L 62 53
              C 60 58, 56 61, 50 61
              C 41 61, 36 54, 36 45
              C 36 36, 41 29, 50 29
              C 56 29, 60 32, 63 37
              L 70 32
              C 65 25, 58 22, 50 22
              Z
            "
          />
          {/* Forge-arrow notch — small triangular cut on the upper-right of the G's terminal */}
          <path
            fill="var(--amber, #e8920a)"
            d="M 71 47 L 78 43 L 78 51 Z"
          />
        </svg>
        GET<span>FORGED</span>
      </Link>

      <ul className="nav-links">
        <li><Link href="/browse">Browse</Link></li>
        <li><Link href="/concierge">Concierge</Link></li>
        <li><Link href="/how-it-works/buyers">For Buyers</Link></li>
        <li><Link href="/how-it-works/sellers">For Sellers</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
      </ul>

      <div className="nav-actions">
        {user ? (
          <>
            <Link href="/wishlist" className="btn-ghost" aria-label="Wishlist" title="Wishlist">♥</Link>
            <Link href="/dashboard" className="btn-ghost">Dashboard</Link>
            {user.email === process.env.ADMIN_EMAIL && (
              <Link href="/admin" className="btn-ghost">Admin</Link>
            )}
            <form action={signOut} style={{ display: 'inline' }}>
              <button type="submit" className="btn-ghost" style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}>
                Sign Out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-ghost">Sign In</Link>
            <Link href="/login" className="btn-amber">List Your App</Link>
          </>
        )}
      </div>
    </nav>
  )
}
