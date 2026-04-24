import type { Metadata } from 'next'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import ScrollReveal from '@/components/scroll-reveal'
import { listLiveProducts } from '@/lib/products'
import BrowseClient from '@/components/BrowseClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Browse AI-Built Apps & Tools',
  description: 'Every AI-built tool on GetForged — browse apps, automations, and websites priced for small businesses.',
}

export default async function BrowsePage() {
  const products = await listLiveProducts()

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="products-header">
            <div>
              <div className="section-tag">Catalogue</div>
              <h1 className="section-title" style={{ fontSize: 'clamp(40px,5.5vw,72px)' }}>
                All <span>{products.length}</span> products
              </h1>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginTop: 12, maxWidth: 640 }}>
                Every tool below was built by an AI developer and is ready to ship. Licence for a one-time fee or buy exclusive rights.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 48 }}>
            <BrowseClient products={products} />
          </div>
        </section>
      </main>
      <Footer />
      <ScrollReveal />
    </>
  )
}
