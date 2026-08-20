import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { products, sellers, salesPages, reviews } from '@/db/schema'
import { SEED_PRODUCTS, findSeedBySlug, type SeedProduct } from '@/lib/seed-products'
import { reportDegraded } from '@/lib/degraded'

export interface ProductListItem {
  id: string | null  // null when it's a seed-only product (no DB row)
  slug: string
  title: string
  tagline: string
  description: string
  category: string
  tags: string[]
  priceMain: string
  priceSub: string
  type: 'Licensed' | 'Exclusive'
  thumb: string
  emoji: string
  heroImage?: string | null
  // ── Spec-sheet fields surfaced to the browse filter UI ─────────
  // These are nullable / empty arrays when the seller hasn't filled them in
  // yet. Filter UI must treat absence as "matches no filter" (i.e. hidden
  // when that filter is active), not "matches everything".
  pricePence: number | null  // raw price for range filtering (uses licensed if present, else exclusive)
  platform: string[]
  ai_models: string[]
  monthly_cost: number | null
  deploy_time: string | null
  // ── Card trust signals ─────────────────────────────────────────
  // `null` / 0 mean "unknown", and the card must render that honestly
  // (a `New` pill, no seller row) rather than substituting a default.
  sellerName: string | null
  sellerVerified: boolean
  /** Mean review score, or null when the listing has no reviews */
  rating: number | null
  ratingCount: number
}

export interface ProductDetail extends ProductListItem {
  id: string
  status: 'draft' | 'live' | 'archived'
  isPreview: boolean
  features: string[]
  use_cases: string[]
  price_licensed: number | null
  price_exclusive: number | null
  headline: string
  subheadline: string
  problem_statement: string | null
  cta_primary: string
  cta_secondary: string
  // Spec-sheet fields
  platform: string[]
  architecture: string | null
  ai_models: string[]
  integrations: string[]
  monthly_cost: number | null
  deploy_time: string | null
  demo_url: string | null
  video_url: string | null
  docs_url: string | null
  repo_url: string | null
  support_terms: string | null
  screenshots: string[]
  /**
   * Whether the seller can actually receive money. /api/checkout refuses to
   * sell for a seller without a payouts-enabled Connect account, so the page
   * needs to know before it renders a Buy button that can only fail.
   */
  sellerPayoutsEnabled: boolean
  seller?: {
    display_name: string
    email: string | null
    verified: boolean
  }
}

function seedToListItem(p: SeedProduct): ProductListItem {
  const pricePence = p.price_licensed ?? p.price_exclusive ?? null
  return {
    id: null,
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    description: p.description,
    category: p.category,
    tags: p.tags,
    priceMain: p.priceMain,
    priceSub: p.priceSub,
    type: p.type,
    thumb: p.thumb,
    emoji: p.emoji,
    pricePence,
    platform: [],
    ai_models: [],
    monthly_cost: null,
    deploy_time: null,
    // Seed data has no seller and no reviews. Cards show a `New` pill and
    // omit the seller row rather than inventing either.
    sellerName: null,
    sellerVerified: false,
    rating: null,
    ratingCount: 0,
  }
}

function seedToDetail(p: SeedProduct): ProductDetail {
  return {
    ...seedToListItem(p),
    sellerPayoutsEnabled: false,
    id: `seed-${p.slug}`,
    status: 'live',
    isPreview: false,
    features: p.features,
    use_cases: p.use_cases,
    price_licensed: p.price_licensed,
    price_exclusive: p.price_exclusive,
    headline: p.tagline,
    subheadline: p.description,
    problem_statement: null,
    cta_primary: p.type === 'Exclusive' ? 'Buy exclusive' : 'Get a licence',
    cta_secondary: 'Ask a question',
    platform: [],
    architecture: null,
    ai_models: [],
    integrations: [],
    monthly_cost: null,
    deploy_time: null,
    demo_url: null,
    video_url: null,
    docs_url: null,
    repo_url: null,
    support_terms: null,
    screenshots: [],
  }
}

/** Mean rating + count per product, keyed by product id. */
type RatingIndex = Map<string, { rating: number; count: number }>

/** Stable non-cryptographic hash so a product keeps the same placeholder
 *  gradient across renders and machines. */
function hashToIndex(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Shape shared by every row this module reads out of `products`. */
type ProductRow = typeof products.$inferSelect
type SellerRow = typeof sellers.$inferSelect
type SalesPageRow = typeof salesPages.$inferSelect

function dbToListItem(
  row: ProductRow,
  seller: Pick<SellerRow, 'displayName' | 'verified'> | null,
  ratings?: RatingIndex,
): ProductListItem {
  const priceLicensed = row.priceLicensed
  const priceExclusive = row.priceExclusive
  const type: 'Licensed' | 'Exclusive' =
    priceExclusive && !priceLicensed ? 'Exclusive' : 'Licensed'
  const priceMain =
    type === 'Exclusive' && priceExclusive
      ? `£${priceExclusive.toLocaleString('en-GB')}`
      : priceLicensed
        ? `£${priceLicensed.toLocaleString('en-GB')}`
        : 'Contact'
  const heroImage = row.screenshots && row.screenshots.length > 0 ? row.screenshots[0] : null
  const pricePence = priceLicensed ?? priceExclusive ?? null
  const agg = ratings?.get(row.id)
  // Spread the six gradient classes across the catalogue so a grid of
  // screenshot-less listings doesn't read as one flat block of the same colour.
  const thumb = `t${(hashToIndex(row.id) % 6) + 1}`
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    category: row.category ?? 'AI Automation',
    tags: row.toolTags ?? [],
    priceMain,
    priceSub: type === 'Exclusive' ? 'exclusive buy-out' : 'one-time licence',
    type,
    thumb,
    emoji: '⚡',
    heroImage,
    pricePence,
    platform: row.platform ?? [],
    ai_models: row.aiModels ?? [],
    monthly_cost: row.monthlyCost ?? null,
    deploy_time: row.deployTime ?? null,
    sellerName: seller?.displayName ?? null,
    sellerVerified: seller?.verified ?? false,
    rating: agg && agg.count > 0 ? agg.rating : null,
    ratingCount: agg?.count ?? 0,
  }
}

/**
 * Mean rating and review count for a set of products, in one round-trip.
 *
 * Unlike the old PostgREST path (which couldn't express GROUP BY and had to
 * fold rows in JS), Drizzle can push the aggregate down to Postgres directly.
 * Failure is non-fatal: an empty index means every card shows `New`, which is
 * wrong-but-harmless, whereas throwing would blank the page.
 */
async function fetchRatings(productIds: string[]): Promise<RatingIndex> {
  const index: RatingIndex = new Map()
  if (productIds.length === 0) return index
  try {
    const rows = await db
      .select({
        productId: reviews.productId,
        avgRating: sql<number>`avg(${reviews.rating})`,
        count: sql<number>`count(*)`,
      })
      .from(reviews)
      .where(inArray(reviews.productId, productIds))
      .groupBy(reviews.productId)

    for (const row of rows) {
      index.set(row.productId, { rating: Number(row.avgRating), count: Number(row.count) })
    }
  } catch (err) {
    reportDegraded({ scope: 'products.ratings', fallback: 'unrated product cards', error: err })
  }
  return index
}

/**
 * Whether the seed catalogue may stand in for real data.
 *
 * Only outside production. Seed products exist so a developer with no
 * DATABASE_URL still gets a shop to click through — that is the whole job. In
 * production they are a lie with a 200 status code: six invented listings at
 * invented prices stood in for a dead database for five days while every page
 * looked fine and nothing alerted.
 *
 * An empty or broken catalogue in production must render as empty. That is
 * ugly for as long as it lasts, and /api/health returns 503 throughout, which
 * is the point — someone finds out.
 */
function seedFallbackAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/**
 * Options for {@link listLiveProducts}.
 *
 * `fallback: false` forces the empty result even outside production. Required
 * for machine-readable surfaces (sitemap, prerender manifest, feeds): a
 * crawler told about six products that do not exist will index six phantom
 * listings as the entire catalogue, and unlike a human it never notices the
 * shop was simply empty. Leaving it unset gives the environment default.
 */
export interface ListLiveProductsOptions {
  fallback?: boolean
}

export async function listLiveProducts(
  options: ListLiveProductsOptions = {}
): Promise<ProductListItem[]> {
  const { fallback = seedFallbackAllowed() } = options
  const onFailure = () => (fallback ? SEED_PRODUCTS.map(seedToListItem) : [])

  if (!dbConfigured()) {
    return onFailure()
  }
  try {
    // Sort featured products first (by featuredPosition ascending), then by
    // createdAt descending. Postgres sorts NULLs last by default for ASC, so
    // non-featured rows naturally fall after the featured ones.
    //
    // Left join (not inner) so a listing whose seller row is somehow missing
    // still appears — the card just omits the seller line, same contract the
    // old `sellers(display_name, verified)` embed (no `!inner`) had.
    const rows = await db
      .select({ product: products, seller: sellers })
      .from(products)
      .leftJoin(sellers, eq(products.sellerId, sellers.id))
      .where(eq(products.status, 'live'))
      .orderBy(asc(products.featuredPosition), desc(products.createdAt))

    if (rows.length === 0) return onFailure()

    const ratings = await fetchRatings(rows.map(r => r.product.id))
    return rows.map(r => dbToListItem(r.product, r.seller, ratings))
  } catch (err) {
    reportDegraded({
      scope: 'products.list',
      fallback: fallback ? 'the seed catalogue' : 'an empty list',
      error: err,
    })
    return onFailure()
  }
}

/** Seed detail for `slug`, but only where the seed catalogue is permitted. */
function seedDetailIfAllowed(slug: string): ProductDetail | null {
  if (!seedFallbackAllowed()) return null
  const seed = findSeedBySlug(slug)
  return seed ? seedToDetail(seed) : null
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  if (!dbConfigured()) {
    return seedDetailIfAllowed(slug)
  }
  try {
    let row: ProductRow | null = null
    let sellerRow: SellerRow | null = null
    let salesPageRow: SalesPageRow | null = null
    let isPreview = false

    const liveRows = await db
      .select({ product: products, seller: sellers, salesPage: salesPages })
      .from(products)
      .innerJoin(sellers, eq(products.sellerId, sellers.id))
      .leftJoin(salesPages, eq(salesPages.productId, products.id))
      .where(and(eq(products.slug, slug), eq(products.status, 'live')))
      .limit(1)

    if (liveRows.length > 0) {
      row = liveRows[0].product
      sellerRow = liveRows[0].seller
      salesPageRow = liveRows[0].salesPage
    }

    if (!row) {
      // Owner preview path — a draft/archived row is only returned if the
      // current session belongs to the seller who owns it. This replaces
      // what the `products_seller_all` RLS policy used to enforce in
      // Postgres: the ownership check now happens explicitly in this WHERE
      // clause rather than being implicit in every query against the table.
      const session = await auth()
      if (session?.user?.id) {
        const ownedRows = await db
          .select({ product: products, seller: sellers, salesPage: salesPages })
          .from(products)
          .innerJoin(sellers, eq(products.sellerId, sellers.id))
          .leftJoin(salesPages, eq(salesPages.productId, products.id))
          .where(and(eq(products.slug, slug), eq(sellers.userId, session.user.id)))
          .limit(1)

        if (ownedRows.length > 0) {
          row = ownedRows[0].product
          sellerRow = ownedRows[0].seller
          salesPageRow = ownedRows[0].salesPage
          isPreview = row.status !== 'live'
        }
      }
    }

    if (!row) {
      // The database answered and has no such live listing. In production
      // that is a 404 — rendering a seed product instead publishes a
      // complete, plausible page for something nobody can buy, carrying
      // InStock structured data.
      return seedDetailIfAllowed(slug)
    }

    const list = dbToListItem(row, sellerRow)
    const features = (row.features ?? []).map((f) => {
      if (typeof f === 'string') return f
      const title = (f as { title?: unknown }).title
      return typeof title === 'string' ? title : JSON.stringify(f)
    })
    const use_cases = (row.useCases ?? []).map((u) => {
      if (typeof u === 'string') return u
      const title = (u as { title?: unknown }).title
      return typeof title === 'string' ? title : JSON.stringify(u)
    })

    return {
      ...list,
      id: row.id,
      status: row.status,
      isPreview,
      features,
      use_cases,
      price_licensed: row.priceLicensed,
      price_exclusive: row.priceExclusive,
      headline: salesPageRow?.headline ?? row.tagline ?? row.title,
      subheadline: salesPageRow?.subheadline ?? row.description ?? '',
      problem_statement: salesPageRow?.problemStatement ?? null,
      cta_primary: salesPageRow?.ctaPrimary ?? (list.type === 'Exclusive' ? 'Buy exclusive' : 'Get a licence'),
      cta_secondary: salesPageRow?.ctaSecondary ?? 'Ask a question',
      platform: row.platform ?? [],
      architecture: row.architecture ?? null,
      ai_models: row.aiModels ?? [],
      integrations: row.integrations ?? [],
      monthly_cost: row.monthlyCost ?? null,
      deploy_time: row.deployTime ?? null,
      demo_url: row.demoUrl ?? null,
      video_url: row.videoUrl ?? null,
      docs_url: row.docsUrl ?? null,
      repo_url: row.repoUrl ?? null,
      support_terms: row.supportTerms ?? null,
      screenshots: row.screenshots ?? [],
      sellerPayoutsEnabled: sellerRow?.stripePayoutsEnabled ?? false,
      seller: sellerRow
        ? { display_name: sellerRow.displayName, email: null, verified: sellerRow.verified ?? false }
        : undefined,
    }
  } catch (err) {
    reportDegraded({
      scope: 'products.detail',
      fallback: seedFallbackAllowed() ? 'a seed product or a 404' : 'a 404',
      error: err,
    })
    // A failed query is not evidence that this product exists. In production
    // the honest answer is 404, not a phantom listing.
    return seedDetailIfAllowed(slug)
  }
}

/**
 * Slugs of the live catalogue, for machine-readable surfaces only.
 *
 * Never falls back to seed data: this feeds `app/sitemap.ts` and
 * `generateStaticParams`, and both would otherwise publish phantom product
 * URLs to crawlers whenever the catalogue was empty or the query failed.
 * An empty catalogue must produce an empty product section, not a fiction.
 */
export async function listLiveProductSlugs(): Promise<string[]> {
  const items = await listLiveProducts({ fallback: false })
  return items.map(p => p.slug)
}
