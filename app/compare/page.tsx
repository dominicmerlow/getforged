import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { getProductBySlug } from '@/lib/products'
import type { ProductDetail } from '@/lib/products'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Compare Products',
}

interface Props {
  searchParams: Promise<{ slugs?: string }>
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '12px 0',
      borderBottom: '1px solid rgba(42,34,23,0.12)',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
        {value || <span style={{ opacity: 0.35 }}>—</span>}
      </div>
    </div>
  )
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const slugsRaw = params.slugs ?? ''
  const slugList = slugsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  const productResults = await Promise.all(slugList.map(s => getProductBySlug(s)))
  const products: ProductDetail[] = productResults.filter((p): p is ProductDetail => p !== null)

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <Link
              href="/browse"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--amber)',
                textDecoration: 'none',
                display: 'inline-block',
                marginBottom: 16,
              }}
            >
              ← Back to browse
            </Link>
            <div className="section-tag">Side by Side</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4.5vw,56px)' }}>
              Compare Products{products.length > 0 && <> <span>({products.length} selected)</span></>}
            </h1>
          </div>

          {/* No/insufficient products */}
          {products.length < 2 ? (
            <div style={{
              padding: '40px 32px',
              border: '1px solid var(--ink)',
              background: 'var(--paper)',
              maxWidth: 600,
            }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, marginBottom: 16 }}>
                Add at least 2 product slugs to the URL to compare.
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, opacity: 0.6 }}>
                Example: <code>/compare?slugs=invoicebot-pro,clientportal-ai</code>
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${products.length}, minmax(260px, 1fr))`,
                gap: 24,
                overflowX: 'auto',
              }}
            >
              {products.map(p => (
                <div
                  key={p.slug}
                  style={{
                    border: '1px solid var(--ink)',
                    background: 'var(--paper)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Product title block */}
                  <div style={{ padding: '24px 24px 16px' }}>
                    <span className="product-tag" style={{ marginBottom: 8, display: 'inline-block' }}>
                      {p.category}
                    </span>
                    <h2 style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 22,
                      fontWeight: 700,
                      marginBottom: 8,
                      lineHeight: 1.2,
                    }}>
                      {p.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700 }}>
                        {p.priceMain}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, opacity: 0.55 }}>
                        {p.priceSub}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, opacity: 0.7, lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                  </div>

                  {/* Spec rows */}
                  <div style={{ padding: '0 24px', flex: 1 }}>
                    <SpecRow
                      label="Platform"
                      value={p.platform?.length ? p.platform.join(', ') : null}
                    />
                    <SpecRow
                      label="Architecture"
                      value={p.architecture}
                    />
                    <SpecRow
                      label="Native AI"
                      value={p.ai_models?.length ? p.ai_models.join(', ') : null}
                    />
                    <SpecRow
                      label="Integrations"
                      value={p.integrations?.length ? p.integrations.join(', ') : null}
                    />
                    <SpecRow
                      label="Monthly cost"
                      value={p.monthly_cost != null ? `~£${p.monthly_cost}/mo` : null}
                    />
                    <SpecRow
                      label="Deploy time"
                      value={p.deploy_time}
                    />
                  </div>

                  {/* Footer actions */}
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {p.demo_url && (
                      <a
                        href={p.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          color: 'var(--amber)',
                          textDecoration: 'none',
                        }}
                      >
                        View demo →
                      </a>
                    )}
                    <Link href={`/products/${p.slug}`} className="btn-hero-primary" style={{ textAlign: 'center' }}>
                      {p.cta_primary || 'Get a licence'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          <div style={{
            marginTop: 48,
            padding: '20px 24px',
            border: '1px solid rgba(42,34,23,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            opacity: 0.65,
            maxWidth: 600,
          }}>
            Tip: add <code>?slugs=slug1,slug2</code> to compare any products. Find slugs on each product page URL.
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
