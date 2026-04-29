'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/firecrawl'
import { generateSalesPageSmart, llmConfigured } from '@/lib/llm'
import { sendDraftReadyEmail } from '@/lib/resend'
import { getSetting } from '@/lib/settings'
import { slugify } from '@/lib/utils'
import type { GeneratedSalesPage } from '@/lib/types'

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
      { title: 'Transparent pricing', description: 'Pay once or licence — no surprise bills.' },
    ],
    use_cases: [
      { title: 'Solo operators', description: 'Replace manual work with automation.' },
      { title: 'Small teams', description: `Scale ${category.toLowerCase()} without hiring.` },
      { title: 'Agencies', description: 'White-label for your clients.' },
    ],
    cta_primary: 'Get a licence',
    cta_secondary: 'Ask a question',
    meta_title: `${name} — ${category} on FORGE`.slice(0, 60),
    meta_description: desc.slice(0, 155),
  }
}

async function findUniqueSlug(
  baseSlug: string,
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<string> {
  let slug = baseSlug
  let n = 2
  // Cap at 20 attempts to avoid infinite loops in pathological cases
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
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
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: 'You must be signed in to submit a product.' }

  const { data: sellerRow } = await supabase
    .from('sellers')
    .select('id, display_name')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (!sellerRow) return { error: 'Seller profile not found. Try signing out and back in.' }

  // ── 2b. Submissions paused gate (admin feature flag) ─────────
  // Server-side enforcement — never trust the client. Fail-OPEN if the
  // settings read throws so a transient Supabase issue doesn't block sellers.
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

  // ── 5. Compute unique slug via service role (bypasses RLS) ───
  const service = await createServiceClient()
  const baseSlug = slugify(name) || 'product'
  const slug = await findUniqueSlug(baseSlug, service)

  // ── 6. Insert product (draft) ────────────────────────────────
  const screenshots = scraped.screenshot ? [scraped.screenshot] : null
  const { data: productInsert, error: productErr } = await service
    .from('products')
    .insert({
      seller_id: sellerRow.id,
      title: name,
      tagline: generated.headline,
      description: generated.subheadline,
      features: generated.features,
      use_cases: generated.use_cases,
      price_licensed: priceLicensed,
      price_exclusive: priceExclusive,
      status: 'draft',
      slug,
      source_url: productUrl,
      category,
      screenshots,
      demo_url,
    })
    .select('id')
    .single()

  if (productErr || !productInsert) {
    await service.from('error_log').insert({
      scenario: 'submit-product-insert',
      payload: { name, slug, productUrl, userId: userData.user.id } as object,
      error_message: productErr?.message ?? 'no id returned',
    })
    return { error: productErr?.message ?? 'Could not save product.' }
  }

  const productId = productInsert.id as string

  // ── 7. Insert sales_page (1:1 with product) ──────────────────
  const { error: spErr } = await service.from('sales_pages').insert({
    product_id: productId,
    headline: generated.headline,
    subheadline: generated.subheadline,
    problem_statement: generated.problem_statement,
    body_copy: {
      features: generated.features,
      use_cases: generated.use_cases,
    } as object,
    cta_primary: generated.cta_primary,
    cta_secondary: generated.cta_secondary,
    meta_title: generated.meta_title,
    meta_description: generated.meta_description,
  })
  if (spErr) {
    await service.from('error_log').insert({
      scenario: 'submit-salespage-insert',
      payload: { productId, slug } as object,
      error_message: spErr.message,
    })
    // Non-fatal: product exists, seller can still edit/approve
  }

  // ── 8. Email seller (async, non-blocking of response) ────────
  try {
    await sendDraftReadyEmail(
      userData.user.email ?? 'unknown',
      sellerRow.display_name,
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
