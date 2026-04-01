import Cursor      from '@/components/cursor'
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

export default function HomePage() {
  return (
    <>
      <Cursor />
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <HowItWorks />
        <ProductGrid />
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
