import Nav         from '@/components/nav'
import Hero        from '@/components/hero'
import Ticker      from '@/components/ticker'
import HowItWorks  from '@/components/how-it-works'
import ProductGrid from '@/components/product-grid'
import DualPersona from '@/components/dual-persona'
import FlippaStrip from '@/components/flippa-strip'
import Pricing     from '@/components/pricing'
import CTASection  from '@/components/cta-section'
import Footer      from '@/components/footer'
import ScrollReveal from '@/components/scroll-reveal'
import { listLiveProducts } from '@/lib/products'

export const revalidate = 60

export default async function HomePage() {
  const products = await listLiveProducts()
  const heroCards = products.slice(0, 3)

  return (
    <>
      <Nav />
      <main>
        <Hero cards={heroCards} totalCount={products.length} />
        <Ticker />
        <HowItWorks />
        <ProductGrid products={products} />
        <DualPersona />
        <FlippaStrip />
        <Pricing />
        <CTASection />
      </main>
      <Footer />
      <ScrollReveal />
    </>
  )
}
