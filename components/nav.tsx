import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/auth'
import { signOut } from '@/app/actions/auth'
import { checkAdminAccess } from '@/lib/admin'
import SearchBar from '@/components/SearchBar'
import CategoryBar from '@/components/CategoryBar'
import HeaderDrawer from '@/components/HeaderDrawer'
import ConciergeModal, { ConciergeTrigger } from '@/components/ConciergeModal'

async function getUser() {
  try {
    const session = await auth()
    return session?.user ?? null
  } catch {
    return null
  }
}

interface NavProps {
  /** Hide the second-row category strip (e.g. on auth and legal pages) */
  showCategories?: boolean
  /** Category slug to mark as current in the strip */
  activeCategory?: string
  /** Seeds the header search field on the browse page */
  searchValue?: string
}

/**
 * Sticky marketplace header.
 *
 * Two rows, following the pattern every large marketplace converges on: brand +
 * search + account on top, categories underneath. Search lives in the header on
 * every page — once a visitor is past the homepage, the header search is the
 * only way to start a new query without going back.
 */
export default async function Nav({
  showCategories = true,
  activeCategory,
  searchValue = '',
}: NavProps = {}) {
  const user = await getUser()
  const isAdmin = user ? Boolean(await checkAdminAccess(user.id, user.email)) : false

  return (
    <header className="gf-header">
      <div className="gf-header-row">
        <Link href="/" className="gf-header-logo" aria-label="GetForged home">
          <Image
            src="/getforged_logo.png"
            alt="GetForged"
            width={911}
            height={274}
            priority
          />
        </Link>

        <div className="gf-header-search">
          <SearchBar id="gf-header-search" defaultValue={searchValue} placeholder="Search AI tools and automations" />
        </div>

        <nav className="gf-header-nav" aria-label="Primary">
          <Link href="/browse">Browse</Link>
          <ConciergeTrigger />
          <Link href="/how-it-works/buyers">For buyers</Link>
          <Link href="/how-it-works/sellers">For sellers</Link>
        </nav>

        <div className="gf-header-actions">
          {user ? (
            <>
              <Link href="/wishlist" className="btn btn-ghost-new gf-hide-sm">Saved</Link>
              <Link href="/dashboard" className="btn btn-ghost-new">Dashboard</Link>
              {isAdmin && <Link href="/admin" className="btn btn-ghost-new gf-hide-sm">Admin</Link>}
              <form action={signOut}>
                <button type="submit" className="btn btn-secondary">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost-new gf-hide-sm">Sign in</Link>
              <Link href="/submit" className="btn btn-primary">List your app</Link>
            </>
          )}

          <HeaderDrawer authed={!!user} isAdmin={isAdmin} />
        </div>
      </div>

      {showCategories && <CategoryBar activeSlug={activeCategory} />}

      <ConciergeModal />
    </header>
  )
}
