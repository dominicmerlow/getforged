import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'

export default function NotFound() {
  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div className="section-tag">404</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,6vw,80px)' }}>
            Page not found.
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, maxWidth: 480, margin: 0 }}>
            This page doesn&apos;t exist — or was removed.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/" className="btn-hero-primary" style={{ padding: '14px 28px' }}>Go home</Link>
            <Link href="/browse" className="btn-hero-secondary" style={{ padding: '14px 28px' }}>Browse products</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
