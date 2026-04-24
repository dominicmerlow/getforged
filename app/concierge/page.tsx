import type { Metadata } from 'next'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import ConciergeForm from './ConciergeForm'

export const metadata: Metadata = {
  title: 'AI Product Concierge — GetForged',
  description: 'Describe what your business needs and our AI will find the best-matching tools from the GetForged catalogue.',
}

export default function ConciergePage() {
  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div style={{ maxWidth: 780 }}>
            <div className="section-tag">AI Concierge</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(36px,5vw,64px)' }}>
              Find your perfect tool
            </h1>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              marginTop: 12,
              marginBottom: 40,
              maxWidth: 600,
              lineHeight: 1.6,
            }}>
              Describe what your business needs in plain English. Our AI will scan the catalogue and pick the 3 best matches — no browsing required.
            </p>

            <ConciergeForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
