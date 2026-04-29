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
import ViewTracker from '@/components/ViewTracker'
import ContactSellerButton from '@/components/ContactSellerButton'
import ReviewForm from '@/components/ReviewForm'
import ReviewReplyForm from '@/components/ReviewReplyForm'
import ProductScreenshot from '@/components/ProductScreenshot'
import BuyButton from '@/components/BuyButton'
import DemoLink from '@/components/DemoLink'
import CompareToggle from '@/components/CompareToggle'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'

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

  // Drop empty / whitespace-only features so we never render an empty section
  const cleanFeatures = product.features
    .map(f => (typeof f === 'string' ? f.trim() : ''))
    .filter(f => f.length > 0)
  const cleanUseCases = product.use_cases
    .map(u => (typeof u === 'string' ? u.trim() : ''))
    .filter(u => u.length > 0)

  // Deterministic, unambiguous primary CTA — never trust an AI-generated verb
  const buyLabel = product.type === 'Exclusive'
    ? `Buy Exclusive — ${product.priceMain}`
    : `Buy Licence — ${product.priceMain}`

  // Admin-controlled checkout pause. Fail-OPEN: settings blip must not hide
  // the buy button — server route still gates the actual transaction.
  let checkoutPaused = false
  try {
    checkoutPaused = await getSetting('site.checkout_paused')
  } catch {
    checkoutPaused = false
  }

  // Fetch reviews for this product (public read, no auth needed).
  // `seller_reply` / `seller_replied_at` are added by migration 005 — the
  // select is defensive: if those columns don't exist yet the query still
  // returns the rest, and the UI just hides the reply block.
  const supabase = await createClient()
  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('id, rating, body, seller_reply, seller_replied_at, created_at, buyer:buyer_id(email)')
    .eq('product_id', product.id)
    .order('created_at', { ascending: false })
    .limit(20)
  const reviews = (reviewsData ?? []) as unknown as {
    id: string
    rating: number
    body: string | null
    seller_reply: string | null
    seller_replied_at: string | null
    created_at: string
    buyer: { email: string } | null
  }[]
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null

  // Check if current user has purchased (to show review form) AND whether
  // they are the seller of this product (to show reply forms).
  const { data: userData } = await supabase.auth.getUser()
  let hasPurchased = false
  let isOwnerSeller = false
  if (userData.user && product.id && !product.id.startsWith('seed-')) {
    const [{ data: purchase }, { data: ownership }] = await Promise.all([
      supabase
        .from('purchases')
        .select('id')
        .eq('product_id', product.id)
        .eq('buyer_id', userData.user.id)
        .maybeSingle(),
      supabase
        .from('products')
        .select('id, seller:sellers!inner(user_id)')
        .eq('id', product.id)
        .maybeSingle(),
    ])
    hasPurchased = !!purchase
    const ownerSellerArr = ownership?.seller
    const ownerSeller = Array.isArray(ownerSellerArr) ? ownerSellerArr[0] : ownerSellerArr
    isOwnerSeller = !!ownerSeller && ownerSeller.user_id === userData.user.id
  }

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
      <ViewTracker
        productId={product.id}
        slug={product.slug}
        category={product.category}
        priceMain={product.priceMain}
      />
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
                <ProductScreenshot
                  src={heroImage}
                  title={product.title}
                  emoji={product.emoji}
                  category={product.category}
                  size="hero"
                />
                <div className="product-hero-tags" style={{ marginTop: 20 }}>
                  <span className="product-category-tag" style={{ position: 'static', display: 'inline-block' }}>{product.category}</span>
                  <span className={`product-licensed-tag${product.type === 'Exclusive' ? ' exclusive' : ''}`} style={{ position: 'static', display: 'inline-block', marginLeft: 8 }}>
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
                  {checkoutPaused ? (
                    <span
                      className="section-tag"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px solid var(--amber, #c87d1a)',
                        color: 'var(--amber, #c87d1a)',
                        padding: '10px 16px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Checkout temporarily paused — back soon
                    </span>
                  ) : (
                    <BuyButton
                      slug={product.slug}
                      productId={product.id}
                      purchaseType={product.type === 'Exclusive' ? 'exclusive' : 'licensed'}
                      category={product.category}
                      priceMain={product.priceMain}
                      label={buyLabel}
                    />
                  )}
                  {product.demo_url && (
                    <DemoLink
                      href={product.demo_url}
                      productId={product.id}
                      slug={product.slug}
                    />
                  )}
                  {!product.isPreview && (
                    <ContactSellerButton
                      productId={product.id}
                      productTitle={product.title}
                      label={product.cta_secondary || 'Talk to Builder'}
                    />
                  )}
                  {!product.isPreview && (
                    <WishlistButton productId={product.id} returnTo={`/products/${product.slug}`} />
                  )}
                  <CompareToggle
                    slug={product.slug}
                    title={product.title}
                    priceMain={product.priceMain}
                    category={product.category}
                  />
                </div>

                {/* Task 2: Refund guarantee badge */}
                <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b' }}>
                  <span style={{ color: '#3fa85a', fontSize: 16 }}>✓</span>
                  7-day money-back guarantee
                  <span style={{ margin: '0 4px' }}>·</span>
                  <span style={{ color: '#3fa85a', fontSize: 16 }}>✓</span>
                  Secure checkout via Stripe
                </div>

                {/* Task 3: Trust logo strip */}
                <div style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b6b6b' }}>Powered by</span>
                  {(['Stripe', 'Supabase', 'Claude'] as const).map(name => (
                    <span key={name} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.06em',
                      border: '1px solid rgba(42,39,32,0.2)', padding: '4px 10px', color: '#2a2217'
                    }}>{name}</span>
                  ))}
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

        {cleanFeatures.length > 0 && (
          <section className="section">
            <div className="section-tag">What it does</div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px,4vw,48px)' }}>Features</h2>
            <ul className="product-features-list" style={{ marginTop: 32, display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', listStyle: 'none', padding: 0 }}>
              {cleanFeatures.map((f, i) => (
                <li key={i} className="product-card reveal" style={{ padding: 24, display: 'grid', gap: 8 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--soft-amber, #b97314)',
                  }}>
                    Feature {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="product-desc" style={{ fontSize: 16, lineHeight: 1.5 }}>{f}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {cleanUseCases.length > 0 && (
          <section className="section">
            <div className="section-tag">Who it&apos;s for</div>
            <h2 className="section-title" style={{ fontSize: 'clamp(32px,4vw,48px)' }}>Use cases</h2>
            <ul style={{ marginTop: 32, display: 'grid', gap: 16, maxWidth: 820, listStyle: 'none', padding: 0 }}>
              {cleanUseCases.map((u, i) => (
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

        {/* Always show "What you get" — buyers need delivery clarity before paying */}
        <section className="section">
          <div className="section-tag">What you get</div>
          <div style={{
            marginTop: 24,
            maxWidth: 820,
            border: '2px solid var(--warm-ink, #2a2217)',
            padding: '28px 32px',
            display: 'grid',
            gap: 16,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b97314' }}>
              Included with purchase
            </div>
            {product.support_terms && (
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.6, margin: 0 }}>
                {product.support_terms}
              </p>
            )}
            <div style={{ display: 'grid', gap: 10, fontFamily: 'var(--font-serif)', fontSize: 17 }}>
              <div>✓ {product.type === 'Exclusive' ? 'Exclusive ownership — listing is removed from the marketplace after purchase' : 'Perpetual licence — use it forever, no recurring fees'}</div>
              {product.repo_url && <div>✓ Full source code access</div>}
              {product.docs_url && <div>✓ Setup documentation &amp; deploy guide</div>}
              {product.demo_url && <div>✓ Live working demo to inspect before you buy</div>}
              {product.deploy_time && <div>✓ Estimated time to deploy: {product.deploy_time}</div>}
              <div>✓ Direct line to the builder for questions</div>
              <div>✓ 7-day money-back guarantee, no questions asked</div>
            </div>
          </div>
        </section>

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

        <section className="section">
          <div className="section-tag">Reviews</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(28px,3.5vw,42px)' }}>
            {reviews.length > 0
              ? <>{reviews.length} review{reviews.length !== 1 ? 's' : ''}{avgRating ? ` · ${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5 - Math.round(avgRating))} ${avgRating.toFixed(1)}` : ''}</>
              : 'No reviews yet'}
          </h2>

          {reviews.length > 0 && (
            <div style={{ marginTop: 32, display: 'grid', gap: 16, maxWidth: 820 }}>
              {reviews.map(r => (
                <div key={r.id} className="product-card" style={{ padding: 24, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ color: '#b97314', fontSize: 20, letterSpacing: 2 }}>
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b' }}>
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {r.body && (
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.5, margin: 0 }}>
                      {r.body}
                    </p>
                  )}

                  {/* Builder reply (read-only render) */}
                  {r.seller_reply && (
                    <div style={{
                      marginTop: 8,
                      padding: 14,
                      background: 'rgba(185,115,20,0.06)',
                      borderLeft: '3px solid var(--soft-amber, #b97314)',
                      display: 'grid',
                      gap: 6,
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--soft-amber, #b97314)',
                      }}>
                        Builder reply
                        {product.seller?.display_name && <span style={{ textTransform: 'none', color: '#6b6b6b' }}>· {product.seller.display_name}</span>}
                        {r.seller_replied_at && (
                          <span style={{ textTransform: 'none', color: '#6b6b6b' }}>
                            · {new Date(r.seller_replied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.5, margin: 0 }}>
                        {r.seller_reply}
                      </p>
                      {isOwnerSeller && (
                        <ReviewReplyForm reviewId={r.id} productSlug={product.slug} existingReply={r.seller_reply} />
                      )}
                    </div>
                  )}

                  {/* Inline reply form when no reply exists yet (only for the seller) */}
                  {isOwnerSeller && !r.seller_reply && (
                    <ReviewReplyForm reviewId={r.id} productSlug={product.slug} existingReply={null} />
                  )}
                </div>
              ))}
            </div>
          )}

          {hasPurchased && !product.isPreview && (
            <div style={{ marginTop: 32, maxWidth: 520 }}>
              <div className="section-tag" style={{ marginBottom: 12 }}>Leave a review</div>
              <ReviewForm productId={product.id} productSlug={product.slug} />
            </div>
          )}

          {!hasPurchased && !product.isPreview && userData.user && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#6b6b6b', marginTop: 16 }}>
              Only verified buyers can leave reviews.
            </p>
          )}

          {!userData.user && reviews.length === 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#6b6b6b', marginTop: 16 }}>
              Purchase this product to leave a review.
            </p>
          )}
        </section>

        <section className="section" style={{ textAlign: 'center' }}>
          <h2 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
            Ready to <span>ship</span>?
          </h2>
          <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            {checkoutPaused ? (
              <span
                className="section-tag"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid var(--amber, #c87d1a)',
                  color: 'var(--amber, #c87d1a)',
                  padding: '16px 32px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Checkout temporarily paused — back soon
              </span>
            ) : (
              <BuyButton
                slug={product.slug}
                productId={product.id}
                purchaseType={product.type === 'Exclusive' ? 'exclusive' : 'licensed'}
                category={product.category}
                priceMain={product.priceMain}
                label={buyLabel}
                style={{ padding: '16px 48px' }}
              />
            )}
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
