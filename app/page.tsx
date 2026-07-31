import Nav           from '@/components/nav'
import Hero          from '@/components/hero'
import CategoryTiles from '@/components/CategoryTiles'
import TrustStrip    from '@/components/TrustStrip'
import HowItWorks    from '@/components/how-it-works'
import ProductGrid   from '@/components/product-grid'
import DualPersona   from '@/components/dual-persona'
import FlippaStrip   from '@/components/flippa-strip'
import Pricing       from '@/components/pricing'
import CTASection    from '@/components/cta-section'
import Footer        from '@/components/footer'
import ScrollReveal  from '@/components/scroll-reveal'
import { listLiveProducts } from '@/lib/products'

export const revalidate = 60

/*
  Section order follows the marketplace/directory pattern: search hero →
  categories → featured listings → trust → seller CTA. Listings sit high on the
  page because on a directory the inventory is the pitch; the explanatory
  sections come after, for visitors who need convincing rather than browsing.

  The auto-scrolling ticker that used to sit under the hero is gone — replaced
  by TrustStrip, which makes the same four claims without moving them out of
  reach.
*/
export default async function HomePage() {
  const products = await listLiveProducts()

  return (
    <>
      <Nav />
      <main>
        <Hero totalCount={products.length} />

        <section className="gf-section" style={{ paddingBottom: 32 }}>
          <div className="gf-section-head">
            <div>
              <h2 className="gf-section-title">Browse by category</h2>
              <p className="gf-section-sub">
                Six categories of ready-to-install tools, each reviewed before publishing.
              </p>
            </div>
          </div>
          <CategoryTiles />
        </section>

        <TrustStrip />

        <ProductGrid products={products} />

        <HowItWorks />
        <DualPersona />
        <Pricing />
        <FlippaStrip />
        <CTASection />
      </main>
      <Footer />
      <ScrollReveal />
    </>
  )
}
