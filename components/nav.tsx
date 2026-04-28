import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import { isAdminEmail } from '@/lib/admin'

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
      <Link href="/" className="nav-logo nav-logo-image" aria-label="GetForged home">
        {/*
          Full GetForged lockup as a raster asset. We render the mark + wordmark
          from one PNG so it stays pixel-identical to brand artwork.
          - `priority` because the nav logo is above the fold on every page.
          - intrinsic dimensions are 612×408 (3:2); CSS constrains the displayed
            height via .nav-logo-image img.
        */}
        <Image
          src="/getforged_logo.png"
          alt="GetForged"
          width={612}
          height={408}
          priority
        />
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
            {isAdminEmail(user.email) && (
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
