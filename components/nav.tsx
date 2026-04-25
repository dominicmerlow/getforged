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
        <svg className="nav-logo-mark" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="navGfAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f5a623" />
              <stop offset="100%" stopColor="#e8920a" />
            </linearGradient>
          </defs>
          <path d="M30 4 L38 15 L32 12 L26 15 Z" fill="url(#navGfAmber)" opacity="0.95" />
          <path d="M2 24 L6 18 L52 18 L52 28 L42 28 L42 40 L58 40 Q60 40 60 42 L60 48 Q60 50 58 50 L6 50 Q4 50 4 48 L4 42 Q4 40 6 40 L22 40 L22 28 L6 28 Z" fill="url(#navGfAmber)" />
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
