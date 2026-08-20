import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Star, Check, ChevronRight, ShieldCheck } from 'lucide-react'
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
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { reviews as reviewsTable, purchases, products, sellers } from '@/db/schema'
import { getSetting } from '@/lib/settings'
import { categoryByDbValue } from '@/lib/categories'
import { jsonLdScript } from '@/lib/jsonld'

export const dynamicParams = true
export const revalidate = 60

/* ── Small presentational helpers ──────────────────────────────────── */

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 2, padding: '12px 0', borderBottom: '1px solid var(--gf-line)' }}>
      <dt style={{ fontSize: 13, color: 'var(--gf-text-2)' }}>{label}</dt>
      <dd style={{ fontSize: 15, margin: 0, wordBreak: 'break-word', color: 'var(--gf-text)' }}>{value}</dd>
    </div>
  )
}

function ExternalLink({ href }: { href: string }) {
  let label = href
  try {
    label = new URL(href).hostname.replace(/^www\./, '')
  } catch {
    // keep the raw string when it isn't a parseable URL
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--gf-amber-ink)', textDecoration: 'underline' }}
    >
      {label} ↗
    </a>
  )
}

/** Five stars with the filled count driven by `value`. */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.round(value)
  return (
    <span style={{ display: 'inline-flex', gap: 1 }} aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          style={{
            color: 'var(--gf-star)',
            fill: i <= rounded ? 'var(--gf-star)' : 'none',
          }}
        />
      ))}
    </span>
  )
}

function InfoNotice({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 'var(--gf-radius)',
        fontSize: 14,
        textAlign: 'center',
        border: `1px solid ${tone === 'warn' ? 'var(--gf-amber)' : 'var(--gf-line)'}`,
        background: tone === 'warn' ? 'var(--gf-amber-tint)' : 'var(--gf-surface-2)',
        color: tone === 'warn' ? 'var(--gf-amber-ink)' : 'var(--gf-text-2)',
      }}
    >
      {children}
    </div>
  )
}

interface ReviewRow {
  id: string
  rating: number
  body: string | null
  seller_reply: string | null
  seller_replied_at: string | null
  created_at: string
}

interface SocialData {
  reviews: ReviewRow[]
  /** null when signed out or the database isn't configured */
  viewer: { id: string } | null
  hasPurchased: boolean
  isOwnerSeller: boolean
}

const NO_SOCIAL: SocialData = { reviews: [], viewer: null, hasPurchased: false, isOwnerSeller: false }

/**
 * Reviews plus the viewer's relationship to this listing.
 *
 * Split out of the page body so the whole block can fail soft. Without it, an
 * unconfigured or briefly unreachable database took down the entire product
 * page — including the parts served from seed data that need no database at
 * all.
 */
async function loadSocial(productId: string): Promise<SocialData> {
  if (!dbConfigured()) return NO_SOCIAL
  // Seed-fallback products (lib/seed-products.ts) use a synthetic
  // `seed-<slug>` id, not a real uuid — every table this function queries has
  // a uuid product_id column, so a query with this id doesn't just find
  // nothing, it throws a type-cast error. Short-circuit before touching the
  // database at all; a seed product can never have real reviews/purchases.
  if (productId.startsWith('seed-')) {
    const session = await auth()
    return { ...NO_SOCIAL, viewer: session?.user?.id ? { id: session.user.id } : null }
  }
  try {
    const reviewRows = await db
      .select({
        id: reviewsTable.id,
        rating: reviewsTable.rating,
        body: reviewsTable.body,
        sellerReply: reviewsTable.sellerReply,
        sellerRepliedAt: reviewsTable.sellerRepliedAt,
        createdAt: reviewsTable.createdAt,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, productId))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(20)

    const reviews: ReviewRow[] = reviewRows.map(r => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      seller_reply: r.sellerReply,
      seller_replied_at: r.sellerRepliedAt ? r.sellerRepliedAt.toISOString() : null,
      created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }))

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return { reviews, viewer: null, hasPurchased: false, isOwnerSeller: false }
    }

    const [purchaseRow, ownershipRow] = await Promise.all([
      db.query.purchases.findFirst({
        where: and(eq(purchases.productId, productId), eq(purchases.buyerId, userId)),
      }),
      db
        .select({ sellerUserId: sellers.userId })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(eq(products.id, productId))
        .limit(1)
        .then(rows => rows[0] ?? null),
    ])

    return {
      reviews,
      viewer: { id: userId },
      hasPurchased: !!purchaseRow,
      isOwnerSeller: !!ownershipRow && ownershipRow.sellerUserId === userId,
    }
  } catch (err) {
    console.error('[product page] loadSocial failed:', err instanceof Error ? err.message : err)
    return NO_SOCIAL
  }
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

/**
 * Product detail, laid out as a marketplace listing page: media and narrative
 * on the left, a sticky purchase panel on the right.
 *
 * The panel is the important part of the redesign. Previously the Buy button
 * lived once, in the hero, and scrolled away — a visitor who read to the bottom
 * of the spec sheet had nothing to click. The panel keeps price, inclusions and
 * CTA in view for the whole page.
 *
 * All purchase, preview and review logic is carried over unchanged: seed
 * listings stay unbuyable, the admin checkout pause still fails open, and only
 * verified purchasers can review.
 */
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

  // Drop empty / whitespace-only entries so we never render an empty section
  const cleanFeatures = product.features
    .map(f => (typeof f === 'string' ? f.trim() : ''))
    .filter(f => f.length > 0)
  const cleanUseCases = product.use_cases
    .map(u => (typeof u === 'string' ? u.trim() : ''))
    .filter(u => u.length > 0)

  // Deterministic, unambiguous primary CTA — never trust an AI-generated verb
  const buyLabel = product.type === 'Exclusive'
    ? `Buy exclusive · ${product.priceMain}`
    : `Buy licence · ${product.priceMain}`

  // Seed/placeholder products have no row in `products` and no Stripe seller
  // behind them. /api/checkout already 404s for these, but showing a live Buy
  // button that always errors is worse than showing none.
  const isSeedProduct = product.id.startsWith('seed-')

  // Admin-controlled checkout pause. Fails OPEN: a settings blip must not hide
  // the buy button — the server route still gates the actual transaction.
  let checkoutPaused = false
  try {
    checkoutPaused = await getSetting('site.checkout_paused')
  } catch {
    checkoutPaused = false
  }

  // Everything below needs Supabase. When it isn't configured — local dev
  // against seed data — the page previously threw and rendered the global error
  // boundary, while every other route degraded gracefully. Now the social
  // layer (reviews, purchase state) simply comes back empty and the listing
  // still renders.
  const { reviews, viewer, hasPurchased, isOwnerSeller } = await loadSocial(product.id)
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null

  const rawPrice = product.type === 'Exclusive'
    ? product.price_exclusive
    : product.price_licensed
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `https://getforged.getbrian.xyz/products/${product.slug}`,
    name: product.title,
    description: product.subheadline || product.tagline,
    image: heroImage ?? undefined,
    category: product.category,
    brand: { '@type': 'Organization', name: 'GetForged' },
    // A seed product has no row, no seller and no Stripe destination, so it
    // must never carry a machine-readable in-stock offer, even on the
    // non-production pages where it still renders.
    offers: rawPrice != null && !isSeedProduct ? {
      '@type': 'Offer',
      price: rawPrice,
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      url: `https://getforged.getbrian.xyz/products/${product.slug}`,
    } : undefined,
    // Only emit an aggregate rating when reviews actually exist — a fabricated
    // rating in structured data is a search-engine penalty, not just a lie.
    aggregateRating: avgRating != null ? {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      reviewCount: reviews.length,
    } : undefined,
  }

  const cat = categoryByDbValue(product.category)
  const hasSpecs =
    product.platform.length > 0 || product.architecture || product.ai_models.length > 0 ||
    product.integrations.length > 0 || product.monthly_cost != null || product.deploy_time ||
    product.tags.length > 0 || product.demo_url || product.video_url ||
    product.docs_url || product.repo_url

  /* The purchase control appears twice (sticky panel, and again on mobile at
     the end of the page). Defined once so the three states can't drift. */
  const purchaseControl = isSeedProduct ? (
    <InfoNotice>Preview listing: not yet purchasable</InfoNotice>
  ) : checkoutPaused ? (
    <InfoNotice tone="warn">Checkout temporarily paused, back soon</InfoNotice>
  ) : (
    <BuyButton
      slug={product.slug}
      productId={product.id}
      purchaseType={product.type === 'Exclusive' ? 'exclusive' : 'licensed'}
      category={product.category}
      priceMain={product.priceMain}
      label={buyLabel}
    />
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <Nav activeCategory={cat?.slug} />
      <ViewTracker
        productId={product.id}
        slug={product.slug}
        category={product.category}
        priceMain={product.priceMain}
      />

      <main>
        {product.isPreview && (
          <div style={{
            background: 'var(--gf-amber-tint)',
            borderBottom: '1px solid var(--gf-amber)',
            color: 'var(--gf-text)',
            padding: '10px 24px',
            fontSize: 14,
            textAlign: 'center',
          }}>
            Draft preview: only visible to you. Status: <strong>{product.status}</strong>.{' '}
            <Link href={`/dashboard/products/${product.id}/edit`} style={{ textDecoration: 'underline' }}>Edit</Link>
            {' · '}
            <Link href="/dashboard" style={{ textDecoration: 'underline' }}>Approve to publish</Link>
          </div>
        )}

        <div className="gf-section">
          <nav className="gf-breadcrumb" aria-label="Breadcrumb">
            <Link href="/browse">Browse</Link>
            <ChevronRight size={14} aria-hidden="true" />
            {cat
              ? <Link href={`/browse/${cat.slug}`}>{cat.label}</Link>
              : <span>{product.category}</span>}
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">{product.title}</span>
          </nav>

          <div className="gf-gig">
            {/* ── Main column ─────────────────────────────────────── */}
            <div className="gf-gig-main">
              <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 34px)', marginBottom: product.headline && product.headline !== product.title ? 6 : 14 }}>
                {product.title}
              </h1>
              {product.headline && product.headline !== product.title && (
                <p style={{ fontSize: 'clamp(17px, 2vw, 20px)', color: 'var(--gf-text-2)', margin: '0 0 14px', lineHeight: 1.4 }}>
                  {product.headline}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                {product.seller?.display_name && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span className="gf-avatar" aria-hidden="true">
                      {product.seller.display_name.trim().charAt(0).toUpperCase()}
                    </span>
                    <strong style={{ fontSize: 15 }}>{product.seller.display_name}</strong>
                    {product.seller.verified && <span className="gf-badge-level">Verified</span>}
                  </span>
                )}
                <span className="gf-rating">
                  {avgRating != null ? (
                    <>
                      <Stars value={avgRating} />
                      <span className="gf-rating-score">{avgRating.toFixed(1)}</span>
                      <span className="gf-rating-count">({reviews.length})</span>
                    </>
                  ) : (
                    <span className="gf-rating-new">New listing</span>
                  )}
                </span>
              </div>

              <div className="gf-gallery">
                <ProductScreenshot
                  src={heroImage}
                  title={product.title}
                  emoji={product.emoji}
                  category={product.category}
                  size="hero"
                />
              </div>

              {product.screenshots.length > 1 && (
                <div className="gf-gallery-thumbs">
                  {product.screenshots.slice(1).map((src, i) => (
                    <div key={i} className="gf-gallery-thumb">
                      <Image
                        src={src}
                        alt={`${product.title} screenshot ${i + 2}`}
                        fill
                        sizes="(max-width: 900px) 45vw, 220px"
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}

              <section style={{ marginTop: 40 }}>
                <h2 style={{ fontSize: 22, marginBottom: 12 }}>About this tool</h2>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--gf-text-2)' }}>
                  {product.subheadline}
                </p>
                {product.problem_statement && (
                  <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--gf-text-2)', marginTop: 14 }}>
                    {product.problem_statement}
                  </p>
                )}
                {product.tags.length > 0 && (
                  <div className="gf-card-tags" style={{ marginTop: 18 }}>
                    {product.tags.map(tag => <span key={tag} className="gf-pill">{tag}</span>)}
                  </div>
                )}
              </section>

              {cleanFeatures.length > 0 && (
                <section style={{ marginTop: 40 }}>
                  <h2 style={{ fontSize: 22, marginBottom: 14 }}>What it does</h2>
                  <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
                    {cleanFeatures.map((f, i) => (
                      <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 16, color: 'var(--gf-text-2)' }}>
                        <Check size={19} strokeWidth={2.4} aria-hidden="true" style={{ color: 'var(--gf-success)', flexShrink: 0, marginTop: 3 }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {cleanUseCases.length > 0 && (
                <section style={{ marginTop: 40 }}>
                  <h2 style={{ fontSize: 22, marginBottom: 14 }}>Who it&apos;s for</h2>
                  <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
                    {cleanUseCases.map((u, i) => (
                      <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 16, color: 'var(--gf-text-2)' }}>
                        <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--gf-amber-ink)', flexShrink: 0, marginTop: 3 }} />
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasEmbed && (
                <section style={{ marginTop: 40 }}>
                  <h2 style={{ fontSize: 22, marginBottom: 14 }}>Walkthrough</h2>
                  <div style={{
                    position: 'relative', width: '100%', aspectRatio: '16 / 9',
                    background: '#000', overflow: 'hidden',
                    borderRadius: 'var(--gf-radius-lg)', border: '1px solid var(--gf-line)',
                  }}>
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

              {hasSpecs && (
                <section style={{ marginTop: 40 }}>
                  <h2 style={{ fontSize: 22, marginBottom: 6 }}>Under the hood</h2>
                  <dl className="gf-specs">
                    {product.platform.length > 0 && <SpecRow label="Platform" value={product.platform.join(' · ')} />}
                    {product.architecture && <SpecRow label="Architecture" value={product.architecture} />}
                    {product.ai_models.length > 0 && <SpecRow label="Native AI" value={product.ai_models.join(' · ')} />}
                    {product.integrations.length > 0 && <SpecRow label="Integrations" value={product.integrations.join(' · ')} />}
                    {product.tags.length > 0 && <SpecRow label="Tech stack" value={product.tags.join(' · ')} />}
                    {product.monthly_cost != null && (
                      <SpecRow label="Monthly cost to run" value={`£${product.monthly_cost.toLocaleString('en-GB')}/mo approx`} />
                    )}
                    {product.deploy_time && <SpecRow label="Time to deploy" value={product.deploy_time} />}
                    {product.demo_url && <SpecRow label="Live demo" value={<ExternalLink href={product.demo_url} />} />}
                    {product.video_url && <SpecRow label="Video walkthrough" value={<ExternalLink href={product.video_url} />} />}
                    {product.docs_url && <SpecRow label="Docs" value={<ExternalLink href={product.docs_url} />} />}
                    {product.repo_url && <SpecRow label="Repo" value={<ExternalLink href={product.repo_url} />} />}
                  </dl>
                </section>
              )}

              {product.seller?.display_name && (
                <section style={{ marginTop: 40 }}>
                  <h2 style={{ fontSize: 22, marginBottom: 14 }}>About the builder</h2>
                  <div className="gf-panel">
                    <div className="gf-panel-body" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <span className="gf-avatar" style={{ width: 48, height: 48, fontSize: 19 }} aria-hidden="true">
                        {product.seller.display_name.trim().charAt(0).toUpperCase()}
                      </span>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 17, fontWeight: 700 }}>{product.seller.display_name}</div>
                        <div style={{ fontSize: 14, color: 'var(--gf-text-2)' }}>
                          {product.seller.verified ? 'Verified builder' : 'Builder on GetForged'}
                        </div>
                      </div>
                      {!product.isPreview && (
                        <ContactSellerButton
                          productId={product.id}
                          productTitle={product.title}
                          label="Message seller"
                        />
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ── Reviews ─────────────────────────────────────── */}
              <section style={{ marginTop: 40 }}>
                <h2 style={{ fontSize: 22, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {reviews.length > 0 ? (
                    <>
                      {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                      {avgRating != null && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 17 }}>
                          <Stars value={avgRating} />
                          <span>{avgRating.toFixed(1)}</span>
                        </span>
                      )}
                    </>
                  ) : 'No reviews yet'}
                </h2>

                {reviews.length > 0 && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {reviews.map(r => (
                      <div key={r.id} className="gf-panel">
                        <div className="gf-panel-body" style={{ display: 'grid', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <Stars value={r.rating} size={15} />
                            <span style={{ fontSize: 13, color: 'var(--gf-text-2)' }}>
                              {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          {r.body && (
                            <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: 'var(--gf-text-2)' }}>{r.body}</p>
                          )}

                          {r.seller_reply && (
                            <div style={{
                              marginTop: 4, padding: 14,
                              background: 'var(--gf-surface-2)',
                              borderLeft: '3px solid var(--gf-amber)',
                              borderRadius: '0 var(--gf-radius) var(--gf-radius) 0',
                              display: 'grid', gap: 6,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gf-text-2)' }}>
                                <strong style={{ color: 'var(--gf-amber-ink)' }}>Builder reply</strong>
                                {product.seller?.display_name && <span>· {product.seller.display_name}</span>}
                                {r.seller_replied_at && (
                                  <span>· {new Date(r.seller_replied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                )}
                              </div>
                              <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: 'var(--gf-text-2)' }}>{r.seller_reply}</p>
                              {isOwnerSeller && (
                                <ReviewReplyForm reviewId={r.id} productSlug={product.slug} existingReply={r.seller_reply} />
                              )}
                            </div>
                          )}

                          {isOwnerSeller && !r.seller_reply && (
                            <ReviewReplyForm reviewId={r.id} productSlug={product.slug} existingReply={null} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasPurchased && !product.isPreview && (
                  <div style={{ marginTop: 24, maxWidth: 520 }}>
                    <h3 style={{ fontSize: 17, marginBottom: 10 }}>Leave a review</h3>
                    <ReviewForm productId={product.id} productSlug={product.slug} />
                  </div>
                )}

                {!hasPurchased && !product.isPreview && viewer && (
                  <p style={{ fontSize: 14, color: 'var(--gf-text-2)', marginTop: 14 }}>
                    Only verified buyers can leave reviews.
                  </p>
                )}

                {!viewer && reviews.length === 0 && (
                  <p style={{ fontSize: 14, color: 'var(--gf-text-2)', marginTop: 14 }}>
                    Purchase this tool to leave a review.
                  </p>
                )}
              </section>
            </div>

            {/* ── Sticky purchase panel ───────────────────────────── */}
            <aside className="gf-gig-aside">
              <div className="gf-package">
                <div className="gf-package-head">
                  <span className="gf-pill">{product.type}</span>
                  <span className="gf-package-price">{product.priceMain}</span>
                </div>
                <p className="gf-package-sub">{product.priceSub}</p>

                <ul className="gf-package-list">
                  <li>
                    <Check size={17} strokeWidth={2.4} aria-hidden="true" />
                    {product.type === 'Exclusive'
                      ? 'Exclusive ownership: delisted after purchase'
                      : 'Perpetual licence: no recurring fees'}
                  </li>
                  {product.deploy_time && (
                    <li><Check size={17} strokeWidth={2.4} aria-hidden="true" />Deploys in {product.deploy_time}</li>
                  )}
                  {product.repo_url && (
                    <li><Check size={17} strokeWidth={2.4} aria-hidden="true" />Full source code access</li>
                  )}
                  {product.docs_url && (
                    <li><Check size={17} strokeWidth={2.4} aria-hidden="true" />Setup docs and deploy guide</li>
                  )}
                  <li><Check size={17} strokeWidth={2.4} aria-hidden="true" />Direct line to the builder</li>
                  <li><Check size={17} strokeWidth={2.4} aria-hidden="true" />7-day money-back guarantee</li>
                </ul>

                {product.support_terms && (
                  <p style={{ fontSize: 14, color: 'var(--gf-text-2)', marginBottom: 16 }}>
                    {product.support_terms}
                  </p>
                )}

                <div style={{ display: 'grid', gap: 10 }}>
                  {purchaseControl}

                  {product.demo_url && (
                    <DemoLink href={product.demo_url} productId={product.id} slug={product.slug} />
                  )}
                  {!product.isPreview && (
                    <ContactSellerButton
                      productId={product.id}
                      productTitle={product.title}
                      label={product.cta_secondary || 'Ask a question'}
                    />
                  )}
                </div>

                <div className="gf-package-foot">
                  {!product.isPreview && (
                    <WishlistButton productId={product.id} returnTo={`/products/${product.slug}`} compact />
                  )}
                  <CompareToggle
                    slug={product.slug}
                    title={product.title}
                    priceMain={product.priceMain}
                    category={product.category}
                  />
                </div>

                <p style={{
                  display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center',
                  marginTop: 14, fontSize: 13, color: 'var(--gf-text-2)',
                }}>
                  <ShieldCheck size={15} aria-hidden="true" style={{ color: 'var(--gf-success)' }} />
                  Secure checkout via Stripe
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
      <ScrollReveal />
    </>
  )
}
