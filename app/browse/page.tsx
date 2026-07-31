import type { Metadata } from 'next'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import ScrollReveal from '@/components/scroll-reveal'
import { listLiveProducts } from '@/lib/products'
import { getBookmarkedIds } from '@/lib/bookmarks'
import { auth } from '@/auth'
import BrowseClient from '@/components/BrowseClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Browse AI-Built Apps & Tools',
  description: 'Every AI-built tool on GetForged — browse apps, automations, and websites priced for small businesses.',
}

/** One auth check + one bookmark query for the page, passed down to every card. */
async function loadSaveState(): Promise<{ authed: boolean; savedIds: string[] }> {
  try {
    const session = await auth()
    if (!session?.user) return { authed: false, savedIds: [] }
    return { authed: true, savedIds: await getBookmarkedIds() }
  } catch {
    return { authed: false, savedIds: [] }
  }
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const [products, { authed, savedIds }, params] = await Promise.all([
    listLiveProducts(),
    loadSaveState(),
    searchParams,
  ])
  const q = params.q ?? ''

  return (
    <>
      <Nav searchValue={q} />
      <main>
        <section className="gf-section">
          <div style={{ marginBottom: 28 }}>
            <h1 className="gf-section-title" style={{ marginBottom: 6 }}>
              {q ? `Results for “${q}”` : 'All listings'}
            </h1>
            <p className="gf-section-sub">
              Every tool here was built by an AI developer and is ready to ship. Licence it for a
              one-time fee, or buy exclusive rights.
            </p>
          </div>

          <BrowseClient
            products={products}
            initialSearch={q}
            savedIds={savedIds}
            authed={authed}
          />
        </section>
      </main>
      <Footer />
      <ScrollReveal />
    </>
  )
}
