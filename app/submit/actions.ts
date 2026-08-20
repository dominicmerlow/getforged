'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products, sellers, salesPages, errorLog } from '@/db/schema'
import { scrapeUrl } from '@/lib/firecrawl'
import { generateSalesPageSmart, llmConfigured } from '@/lib/llm'
import { sendDraftReadyEmail } from '@/lib/resend'
import { getSetting } from '@/lib/settings'
import { slugify } from '@/lib/utils'
import type { GeneratedSalesPage } from '@/lib/types'
import { checkRateLimit } from '@/lib/ratelimit'

export type SubmitState =
  | { error: string }
  | { ok: true; productId: string; slug: string }
  | null

function stubSalesPage(
  name: string,
  category: string,
  description: string,
  fallbackTagline: string
): GeneratedSalesPage {
  const desc =
    description.trim() ||
    fallbackTagline ||
    `${name} is an AI-built ${category.toLowerCase()} tool ready for small businesses.`
  return {
    headline: name,
    subheadline: desc.slice(0, 140),
    problem_statement:
      `Small businesses need ${category.toLowerCase()} tools without the overhead of custom dev work. ${name} ships ready to use.`,
    features: [
      { title: 'Ready to deploy', description: 'Installs in minutes, no custom dev required.' },
      { title: 'Maintained', description: 'The builder handles updates and fixes.' },
      { title: 'Transparent pricing', description: 'Pay once or licence, no surprise bills.' },
    ],
    use_cases: [
      { title: 'Solo operators', description: 'Replace manual work with automation.' },
      { title: 'Small teams', description: `Scale ${category.toLowerCase()} without hiring.` },
      { title: 'Agencies', description: 'White-label for your clients.' },
    ],
    cta_primary: 'Get a licence',
    cta_secondary: 'Ask a question',
    meta_title: `${name}: ${category} on GetForged`.slice(0, 60),
    meta_description: desc.slice(0, 155),
  }
}

async function findUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let n = 2
  // Cap at 20 attempts to avoid infinite loops in pathological cases
  for (let i = 0; i < 20; i++) {
    const existing = await db.query.products.findFirst({ where: eq(products.slug, slug) })
    if (!existing) return slug
    slug = `${baseSlug}-${n++}`
  }
  // Extremely unlikely — append random suffix
  return `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
}

export async function submitProduct(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  // ── 1. Validate inputs ───────────────────────────────────────
  const productUrl = String(formData.get('product_url') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const priceLicensedRaw = String(formData.get('price_licensed') ?? '').trim()
  const priceExclusiveRaw = String(formData.get('price_exclusive') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()
  const demo_url = String(formData.get('demo_url') ?? '').trim() || null

  if (!productUrl || !/^https?:\/\//i.test(productUrl)) {
    return { error: 'Enter a valid http(s) URL for your product.' }
  }
  if (!name) return { error: 'Enter a product name.' }
  if (!category) return { error: 'Choose a category.' }

  const priceLicensed = priceLicensedRaw ? Number(priceLicensedRaw) : null
  const priceExclusive = priceExclusiveRaw ? Number(priceExclusiveRaw) : null
  if (priceLicensed !== null && (!Number.isFinite(priceLicensed) || priceLicensed < 0)) {
    return { error: 'Licensed price must be a positive number.' }
  }
  if (priceExclusive !== null && (!Number.isFinite(priceExclusive) || priceExclusive < 0)) {
    return { error: 'Exclusive price must be a positive number.' }
  }
  if (priceLicensed === null && priceExclusive === null) {
    return { error: 'Set at least one price (licensed or exclusive).' }
  }

  // ── 2. Auth check ────────────────────────────────────────────
  const session = await auth()
  if (!session?.user) return { error: 'You must be signed in to submit a product.' }

  const sellerRow = await db.query.sellers.findFirst({ where: eq(sellers.userId, session.user.id) })
  if (!sellerRow) return { error: 'Seller profile not found. Try signing out and back in.' }

  // Every call past this point costs real money: a Firecrawl scrape, then up
  // to five OpenRouter attempts falling through to paid Anthropic. Anyone can
  // register, so without a limit one account converts into unlimited spend on
  // our bill. Keyed on the user, not the IP — the IP limit is the wrong shape
  // for an authenticated, per-account cost.
  const withinSubmitLimit = await checkRateLimit({
    bucket: 'submit',
    identifier: session.user.id,
    limit: 5,
    windowSeconds: 3600,
  })
  if (!withinSubmitLimit) {
    return { error: 'You have submitted several listings in the last hour. Try again shortly.' }
  }

  // ── 2b. Submissions paused gate (admin feature flag) ─────────
  // Server-side enforcement — never trust the client. Fail-OPEN if the
  // settings read throws so a transient DB issue doesn't block sellers.
  try {
    const paused = await getSetting('site.submissions_paused')
    if (paused) {
      return { error: 'Submissions are temporarily paused. Please check back soon.' }
    }
  } catch (err) {
    console.error('[submit] submissions_paused check failed (failing open):', err)
  }

  // ── 3. Scrape URL (Firecrawl or fallback fetch) ──────────────
  let scraped
  try {
    scraped = await scrapeUrl(productUrl)
  } catch (err) {
    return {
      error: `Could not fetch that URL: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }

  // ── 4. Generate sales copy (OpenRouter free → Anthropic → stub)
  let generated: GeneratedSalesPage
  if (llmConfigured()) {
    try {
      const outcome = await generateSalesPageSmart(scraped.markdown, name, category)
      generated = outcome.page
      console.log(`[submit] Generated via ${outcome.provider} (${outcome.model})`)
    } catch (err) {
      generated = stubSalesPage(
        name,
        category,
        notes || scraped.description || '',
        scraped.title ?? name
      )
      console.error('[submit] All LLM providers failed, using stub:', err)
    }
  } else {
    generated = stubSalesPage(
      name,
      category,
      notes || scraped.description || '',
      scraped.title ?? name
    )
  }

  // ── 5. Compute unique slug ────────────────────────────────────
  const baseSlug = slugify(name) || 'product'
  const slug = await findUniqueSlug(baseSlug)

  // ── 6. Insert product (draft) ────────────────────────────────
  const screenshots = scraped.screenshot ? [scraped.screenshot] : null
  let productId: string
  try {
    const [productInsert] = await db
      .insert(products)
      .values({
        sellerId: sellerRow.id,
        title: name,
        tagline: generated.headline,
        description: generated.subheadline,
        features: generated.features as unknown as Record<string, unknown>[],
        useCases: generated.use_cases as unknown as Record<string, unknown>[],
        priceLicensed,
        priceExclusive,
        status: 'draft',
        slug,
        sourceUrl: productUrl,
        category,
        screenshots,
        demoUrl: demo_url,
      })
      .returning({ id: products.id })
    if (!productInsert) throw new Error('no id returned')
    productId = productInsert.id
  } catch (err) {
    await db.insert(errorLog).values({
      scenario: 'submit-product-insert',
      payload: { name, slug, productUrl, userId: session.user.id },
      errorMessage: err instanceof Error ? err.message : 'unknown error',
    }).catch(() => {})
    return { error: err instanceof Error ? err.message : 'Could not save product.' }
  }

  // ── 7. Insert sales_page (1:1 with product) ──────────────────
  try {
    await db.insert(salesPages).values({
      productId,
      headline: generated.headline,
      subheadline: generated.subheadline,
      problemStatement: generated.problem_statement,
      bodyCopy: { features: generated.features, use_cases: generated.use_cases },
      ctaPrimary: generated.cta_primary,
      ctaSecondary: generated.cta_secondary,
      metaTitle: generated.meta_title,
      metaDescription: generated.meta_description,
    })
  } catch (err) {
    await db.insert(errorLog).values({
      scenario: 'submit-salespage-insert',
      payload: { productId, slug },
      errorMessage: err instanceof Error ? err.message : 'unknown error',
    }).catch(() => {})
    // Non-fatal: product exists, seller can still edit/approve
  }

  // ── 8. Email seller (async, non-blocking of response) ────────
  try {
    await sendDraftReadyEmail(
      session.user.email ?? 'unknown',
      sellerRow.displayName,
      name,
      productId
    )
  } catch (err) {
    console.error('[submit] Resend email failed:', err)
  }

  // ── 9. Revalidate + return success ───────────────────────────
  revalidatePath('/dashboard')
  return { ok: true, productId, slug }
}
