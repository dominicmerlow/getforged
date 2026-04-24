import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import ScrollReveal from '@/components/scroll-reveal'
import { getProductBySlug, listLiveProductSlugs } from '@/lib/products'
import { parseYouTubeId, parseVimeoId } from '@/lib/video'
import WishlistButton from '@/components/WishlistButton'
import ContactSellerButton from '@/components/ContactSellerButton'

export const dynamicParams = true
export const revalidate = 60

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="product-card"
      style={{
        padding: 20,
        display: 'grid',
        gap: 6,
        alignContent: 'start',
      }}
    >
      <dt
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#6b6b6b',
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 18,
          margin: 0,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </dd>
    </div>
  )
}

function ExternalLink({ href }: { href: string }) {
  let label = href
  try {
    label = new URL(href).hostname.replace(/^www\./, '')
  } catch {
    // keep as-is
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'underline', color: 'inherit' }}
    >
      {label} ↗
    </a>
  )
}

export async function generateStaticParams() {
  const slugs = await listLiveProductSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Product not found' }
  return {
    title: product.title,
    description: product.subheadline,
    openGraph: {
      title: product.title,
      description: product.subheadline,
    },
  }
}

export default async function ProductPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const heroImage = product.screenshots[0] ?? null
  const ytId = parseYouTubeId(product.video_url)
  const vimeoId = parseVimeoId(product.video_url)
  const hasEmbed = !!(ytId || vimeoId)

  const rawPrice = product.type === 'Exclusive'
    ? product.price_exclusive
    : product.price_licensed
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `https://getforged.io/products/${product.slug}`,
    name: product.title,
    description: product.subheadline || product.tagline,
    image: heroImage ?? undefined,
    category: product.category,
    brand: { '@type': 'Organization', name: 'GetForged' },
    offers: rawPrice != null ? {
      '@type': 'Offer',
      price: rawPrice,
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: `https://getforged.io/products/${product.slug}`,
    } : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main className="product-detail">
        {product.isPreview && (
          <div
            style={{
              background: 'var(--amber, #c87d1a)',
              color: 'var(--paper, #fafaf5)',
              padding: '10px 24px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              textAlign: 'center',
              letterSpacing: '0.05em',
            }}
          >
            Draft preview — only visible to you. Status: <strong>{product.status}</strong>. {' '}
            <Link href={`/dashboard/products/${product.id}/edit`} style={{ textDecoration: 'underline', color: 'inherit' }}>
              Edit
            </Link>
            {' · '}
            <Link href="/dashboard" style={{ textDecoration: 'underline', color: 'inherit' }}>
              Approve to publish
            </Link>
          </div>
        )}

        <section className="section product-hero">
          <div className="product-hero-inner">
            <Link href="/browse" className="product-back">← All products</Link>

            <div className="product-hero-grid">
              <div className="product-hero-media">
                {heroImage ? (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 10',
                      overflow: 'hidden',
                      border: '1px solid rgba(42,39,32,0.12)',
                      background: 'var(--paper, #fafaf5)',
                    }}
                  >
                    <Image
                      src={heroImage}
                      alt={product.title}
                      fill
                      sizes="(max-width: 900px) 100vw, 50vw"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className={`product-thumb-bg ${product.thumb}`} style={{ height: 440 }}>
                    <span style={{ fontSize: 96 }}>{product.emoji}</span>
                  </div>
                )}
                <div className="product-hero-tags" style={{ marginTop: 24 }}>
                  <span className="product-category-tag">{product.category}</span>
                  <span className={`product-licensed-tag${product.type === 'Exclusive' ? ' exclusive' : ''}`}>
                    {product.type}
                  </span>
                </div>
              </div>

              <div className="product-hero-copy">
                <div className="section-tag">{product.category}</div>
                <h1 className="section-title" style={{ fontSize: 'clamp(40px,5.5vw,72px)' }}>
                  {product.title}
                </h1>
                <p className="product-tagline" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, marginTop: 8 }}>
                  {product.headline}
                </p>
                <p className="product-desc" style={{ fontSize: 18, marginTop: 16 }}>
                  {product.subheadline}
                </p>

                <div className="product-tags" style={{ marginTop: 24 }}>
                  {product.tags.map(tag => (
                    <span key={tag} className="product-tag">{tag}</span>
                  ))}
                </div>

                <div className="product-price" style={{ marginTop: 32 }}>
                  <div className="product-price-main" style={{ fontSize: 48 }}>{product.priceMain}</div>
                  <div className="product-price-sub">{product.priceSub}</div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                  <form action="/api/checkout" method="post" style={{ display: 'inline' }}>
                    <input type="hidden" name="slug" value={product.slug} />
                    <input
                      type="hidden"
                      name="purchase_type"
                      value={product.type === 'Exclusive' ? 'exclusive' : 'licensed'}
                    />
                    <button type="submit" className="btn-hero-primary" style={{ cursor: 'pointer', border: 'none' }}>
                      {product.cta_primary}
                    </button>
                  </form>
                  {!product.isPreview && (
                    <ContactSellerButton
                      productId={product.id}
                      productTitle={product.title}
                      label={product.cta_secondary}
                    />
                  )}
                  {!product.isPreview && (
                    <WishlistButton productId={product.id} returnTo={`/products/${product.slug}`} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {product.problem_statement && (
          <section className="section">
            <div className="section-tag">The problem</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.4, maxWidth: 820 }}>
              {product.problem_statement}
            </p>
          </section>
        )}

        {product.features.length > 0 && (
          <section className="section">
            <div className="section-tag">What it does</div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px,4vw,48px)' }}>Features</h2>
            <ul className="product-features-list" style={{ marginTop: 32, display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', listStyle: 'none', padding: 0 }}>
              {product.features.map((f, i) => (
                <li key={i} className="product-card reveal" style={{ padding: 24 }}>
                  <div className="product-title" style={{ fontSize: 20 }}>—</div>
                  <div className="product-desc" style={{ marginTop: 8 }}>{f}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {product.use_cases.length > 0 && (
          <section className="section">
            <div className="section-tag">Who it&apos;s for</div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px,4vw,48px)' }}>Use cases</h2>
            <ul style={{ marginTop: 32, display: 'grid', gap: 16, maxWidth: 820, listStyle: 'none', padding: 0 }}>
              {product.use_cases.map((u, i) => (
                <li key={i} style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.5 }}>
                  · {u}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(product.platform.length > 0 ||
          product.architecture ||
          product.ai_models.length > 0 ||
          product.integrations.length > 0 ||
          product.monthly_cost != null ||
          product.deploy_time ||
          product.tags.length > 0 ||
          product.demo_url || product.video_url || product.docs_url || product.repo_url) && (
          <section className="section">
            <div className="section-tag">Spec sheet</div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px,4vw,48px)' }}>Under the hood</h2>
            <dl
              style={{
                marginTop: 32,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 20,
                maxWidth: 1100,
              }}
            >
              {product.platform.length > 0 && (
                <SpecRow label="Platform" value={product.platform.join(' · ')} />
              )}
              {product.architecture && (
                <SpecRow label="Architecture" value={product.architecture} />
              )}
              {product.ai_models.length > 0 && (
                <SpecRow label="Native AI" value={product.ai_models.join(' · ')} />
              )}
              {product.integrations.length > 0 && (
                <SpecRow label="Integrations" value={product.integrations.join(' · ')} />
              )}
              {product.tags.length > 0 && (
                <SpecRow label="Tech stack" value={product.tags.join(' · ')} />
              )}
              {product.monthly_cost != null && (
                <SpecRow
                  label="Monthly cost to run"
                  value={`£${product.monthly_cost.toLocaleString('en-GB')}/mo approx`}
                />
              )}
              {product.deploy_time && (
                <SpecRow label="Time to deploy" value={product.deploy_time} />
              )}
              {product.demo_url && (
                <SpecRow label="Live demo" value={<ExternalLink href={product.demo_url} />} />
              )}
              {product.video_url && (
                <SpecRow label="Video walkthrough" value={<ExternalLink href={product.video_url} />} />
              )}
              {product.docs_url && (
                <SpecRow label="Docs" value={<ExternalLink href={product.docs_url} />} />
              )}
              {product.repo_url && (
                <SpecRow label="Repo" value={<ExternalLink href={product.repo_url} />} />
              )}
            </dl>
          </section>
        )}

        {hasEmbed && (
          <section className="section">
            <div className="section-tag">Walkthrough</div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px,4vw,48px)' }}>See it in action</h2>
            <div
              style={{
                marginTop: 32,
                position: 'relative',
                width: '100%',
                maxWidth: 960,
                aspectRatio: '16 / 9',
                background: '#000',
                overflow: 'hidden',
                border: '1px solid rgba(42,39,32,0.12)',
              }}
            >
              {ytId && (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`}
                  title={`${product.title} walkthrough`}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
              )}
              {!ytId && vimeoId && (
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`}
                  title={`${product.title} walkthrough`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
              )}
            </div>
          </section>
        )}

        {product.screenshots.length > 1 && (
          <section className="section">
            <div className="section-tag">Screenshots</div>
            <div
              style={{
                marginTop: 32,
                display: 'grid',
                gap: 16,
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              }}
            >
              {product.screenshots.slice(1).map((src, i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 10',
                    overflow: 'hidden',
                    border: '1px solid rgba(42,39,32,0.12)',
                  }}
                >
                  <Image
                    src={src}
                    alt={`${product.title} screenshot ${i + 2}`}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {product.support_terms && (
          <section className="section">
            <div className="section-tag">What&apos;s included</div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.5, maxWidth: 820 }}>
              {product.support_terms}
            </p>
          </section>
        )}

        {product.seller?.display_name && (
          <section className="section">
            <div className="section-tag">Built by</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 28,
                  fontStyle: 'italic',
                }}
              >
                {product.seller.display_name}
              </div>
              {product.seller?.verified && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em',
                  textTransform: 'uppercase', background: 'var(--soft-amber, #b97314)',
                  color: '#fff', padding: '4px 10px',
                }}>
                  ✓ Verified
                </span>
              )}
              <ContactSellerButton
                productId={product.id}
                productTitle={product.title}
                label="Message seller →"
              />
            </div>
          </section>
        )}

        <section className="section" style={{ textAlign: 'center' }}>
          <h2 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
            Ready to <span>ship</span>?
          </h2>
          <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            <form action="/api/checkout" method="post" style={{ display: 'inline' }}>
              <input type="hidden" name="slug" value={product.slug} />
              <input
                type="hidden"
                name="purchase_type"
                value={product.type === 'Exclusive' ? 'exclusive' : 'licensed'}
              />
              <button type="submit" className="btn-hero-primary" style={{ padding: '16px 48px', cursor: 'pointer', border: 'none' }}>
                {product.cta_primary} — {product.priceMain}
              </button>
            </form>
            <Link href="/browse" className="btn-hero-secondary" style={{ padding: '16px 48px' }}>
              See more products
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <ScrollReveal />
    </>
  )
}
