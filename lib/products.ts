import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/lib/types'
import { SEED_PRODUCTS, findSeedBySlug, type SeedProduct } from '@/lib/seed-products'

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
  seller?: {
    display_name: string
    email: string | null
    verified: boolean
  }
}

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (
    !!url && !!key &&
    !url.includes('YOUR_PROJECT') &&
    !key.startsWith('your_')
  )
}

function seedToListItem(p: SeedProduct): ProductListItem {
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
  }
}

function seedToDetail(p: SeedProduct): ProductDetail {
  return {
    ...seedToListItem(p),
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

function dbToListItem(row: Product): ProductListItem {
  const priceLicensed = row.price_licensed
  const priceExclusive = row.price_exclusive
  const type: 'Licensed' | 'Exclusive' =
    priceExclusive && !priceLicensed ? 'Exclusive' : 'Licensed'
  const priceMain =
    type === 'Exclusive' && priceExclusive
      ? `£${priceExclusive.toLocaleString('en-GB')}`
      : priceLicensed
        ? `£${priceLicensed.toLocaleString('en-GB')}`
        : 'Contact'
  const heroImage = row.screenshots && row.screenshots.length > 0 ? row.screenshots[0] : null
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    category: row.category ?? 'AI Automation',
    tags: row.tool_tags ?? [],
    priceMain,
    priceSub: type === 'Exclusive' ? 'exclusive buy-out' : 'one-time licence',
    type,
    thumb: 't1',
    emoji: '⚡',
    heroImage,
  }
}

export async function listLiveProducts(): Promise<ProductListItem[]> {
  if (!supabaseConfigured()) {
    return SEED_PRODUCTS.map(seedToListItem)
  }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: false })
    if (error) throw error
    if (!data || data.length === 0) return SEED_PRODUCTS.map(seedToListItem)
    return (data as Product[]).map(dbToListItem)
  } catch {
    return SEED_PRODUCTS.map(seedToListItem)
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  if (!supabaseConfigured()) {
    const seed = findSeedBySlug(slug)
    return seed ? seedToDetail(seed) : null
  }
  try {
    const supabase = await createClient()

    // Try a "live" fetch first (public path). If nothing lands, fall back
    // to an owner-authorised fetch so the seller can preview their own
    // drafts at /products/[slug] before approving.
    let data: Product | null = null
    let isPreview = false

    const liveRes = await supabase
      .from('products')
      .select('*, sales_page:sales_pages(*), seller:sellers!inner(display_name, user_id, verified)')
      .eq('slug', slug)
      .eq('status', 'live')
      .maybeSingle()

    if (liveRes.error) throw liveRes.error
    data = (liveRes.data as Product | null) ?? null

    if (!data) {
      // Owner preview path — only returns a draft/archived row if the current
      // user owns it. RLS on `products` already enforces this via `products_seller_all`,
      // so we just lift the status filter.
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const ownedRes = await supabase
          .from('products')
          .select('*, sales_page:sales_pages(*), seller:sellers!inner(display_name, user_id, verified)')
          .eq('slug', slug)
          .maybeSingle()
        if (ownedRes.data) {
          data = ownedRes.data as Product
          isPreview = data.status !== 'live'
        }
      }
    }

    if (!data) {
      const seed = findSeedBySlug(slug)
      return seed ? seedToDetail(seed) : null
    }
    const row = data
    const sp = Array.isArray(row.sales_page) ? row.sales_page[0] : row.sales_page
    const sellerObj = Array.isArray(row.seller) ? row.seller[0] : row.seller
    const list = dbToListItem(row)
    const features = (row.features ?? []).map((f) => {
      if (typeof f === 'string') return f
      const title = (f as { title?: unknown }).title
      return typeof title === 'string' ? title : JSON.stringify(f)
    })
    const use_cases = (row.use_cases ?? []).map((u) => {
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
      price_licensed: row.price_licensed,
      price_exclusive: row.price_exclusive,
      headline: sp?.headline ?? row.tagline ?? row.title,
      subheadline: sp?.subheadline ?? row.description ?? '',
      problem_statement: sp?.problem_statement ?? null,
      cta_primary: sp?.cta_primary ?? (list.type === 'Exclusive' ? 'Buy exclusive' : 'Get a licence'),
      cta_secondary: sp?.cta_secondary ?? 'Ask a question',
      platform: row.platform ?? [],
      architecture: row.architecture ?? null,
      ai_models: row.ai_models ?? [],
      integrations: row.integrations ?? [],
      monthly_cost: row.monthly_cost ?? null,
      deploy_time: row.deploy_time ?? null,
      demo_url: row.demo_url ?? null,
      video_url: row.video_url ?? null,
      docs_url: row.docs_url ?? null,
      repo_url: row.repo_url ?? null,
      support_terms: row.support_terms ?? null,
      screenshots: row.screenshots ?? [],
      seller: sellerObj
        ? { display_name: sellerObj.display_name, email: null, verified: (sellerObj as { verified?: boolean }).verified ?? false }
        : undefined,
    }
  } catch {
    const seed = findSeedBySlug(slug)
    return seed ? seedToDetail(seed) : null
  }
}

export async function listLiveProductSlugs(): Promise<string[]> {
  const items = await listLiveProducts()
  return items.map(p => p.slug)
}
