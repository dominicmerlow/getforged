'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products, sellers, salesPages } from '@/db/schema'
import { slugify } from '@/lib/utils'
import { scrapeUrl } from '@/lib/firecrawl'
import { logAdminAction } from '@/lib/admin'

function parseCsv(raw: string): string[] | null {
  const items = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return items.length > 0 ? items : null
}

function parseLineList(raw: string): { title: string; description: string }[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const idx = line.indexOf('|')
      if (idx === -1) return { title: line, description: '' }
      return {
        title: line.slice(0, idx).trim(),
        description: line.slice(idx + 1).trim(),
      }
    })
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export type EditState =
  | { error: string }
  | { ok: true; slug: string | null }
  | null

/** Ownership lookup shared by every action below — this used to ride on RLS. */
async function loadOwnedProduct(productId: string, userId: string) {
  return db
    .select({ product: products, sellerUserId: sellers.userId })
    .from(products)
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .where(eq(products.id, productId))
    .limit(1)
    .then(rows => rows[0] ?? null)
}

export async function saveProduct(
  productId: string,
  _prev: EditState,
  formData: FormData
): Promise<EditState> {
  const session = await auth()
  if (!session?.user) return { error: 'You must be signed in.' }

  const row = await loadOwnedProduct(productId, session.user.id)
  if (!row) return { error: 'Product not found.' }
  if (row.sellerUserId !== session.user.id) {
    return { error: 'Not authorised to edit this product.' }
  }

  // ── Read form fields ─────────────────────────────────────────
  const title = String(formData.get('title') ?? '').trim()
  const tagline = String(formData.get('tagline') ?? '').trim() || null
  const description = String(formData.get('description') ?? '').trim() || null
  const category = String(formData.get('category') ?? '').trim() || null

  const priceLicensed = parseNumber(String(formData.get('price_licensed') ?? ''))
  const priceExclusive = parseNumber(String(formData.get('price_exclusive') ?? ''))

  const platform = parseCsv(String(formData.get('platform') ?? ''))
  const architecture = String(formData.get('architecture') ?? '').trim() || null
  const aiModels = parseCsv(String(formData.get('ai_models') ?? ''))
  const integrations = parseCsv(String(formData.get('integrations') ?? ''))
  const toolTags = parseCsv(String(formData.get('tool_tags') ?? ''))
  const monthlyCost = parseNumber(String(formData.get('monthly_cost') ?? ''))
  const deployTime = String(formData.get('deploy_time') ?? '').trim() || null

  const demoUrl = String(formData.get('demo_url') ?? '').trim() || null
  const videoUrl = String(formData.get('video_url') ?? '').trim() || null
  const docsUrl = String(formData.get('docs_url') ?? '').trim() || null
  const repoUrl = String(formData.get('repo_url') ?? '').trim() || null

  const supportTerms = String(formData.get('support_terms') ?? '').trim() || null
  const screenshotsRaw = String(formData.get('screenshots') ?? '').trim()
  const screenshots = screenshotsRaw
    ? screenshotsRaw.split('\n').map(s => s.trim()).filter(Boolean)
    : null

  // Sales page fields
  const headline = String(formData.get('headline') ?? '').trim() || null
  const subheadline = String(formData.get('subheadline') ?? '').trim() || null
  const problemStatement = String(formData.get('problem_statement') ?? '').trim() || null
  const ctaPrimary = String(formData.get('cta_primary') ?? '').trim() || null
  const ctaSecondary = String(formData.get('cta_secondary') ?? '').trim() || null
  const metaTitle = String(formData.get('meta_title') ?? '').trim() || null
  const metaDescription = String(formData.get('meta_description') ?? '').trim() || null

  const features = parseLineList(String(formData.get('features') ?? ''))
  const useCases = parseLineList(String(formData.get('use_cases') ?? ''))

  if (!title) return { error: 'Title is required.' }
  if (priceLicensed === null && priceExclusive === null) {
    return { error: 'Set at least one price (licensed or exclusive).' }
  }

  // Handle slug change if the seller supplied an override
  let newSlug = row.product.slug
  const slugOverride = String(formData.get('slug') ?? '').trim()
  if (slugOverride) {
    newSlug = slugify(slugOverride) || newSlug
  }

  try {
    await db.update(products).set({
      title,
      tagline,
      description,
      category,
      priceLicensed,
      priceExclusive,
      slug: newSlug,
      platform,
      architecture,
      aiModels,
      integrations,
      toolTags,
      monthlyCost,
      deployTime,
      demoUrl,
      videoUrl,
      docsUrl,
      repoUrl,
      supportTerms,
      screenshots,
      features: features.length > 0 ? features : null,
      useCases: useCases.length > 0 ? useCases : null,
    }).where(eq(products.id, productId))
  } catch (err) {
    return { error: `Update failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  try {
    await db
      .insert(salesPages)
      .values({
        productId,
        headline,
        subheadline,
        problemStatement,
        bodyCopy: { features, use_cases: useCases },
        ctaPrimary,
        ctaSecondary,
        metaTitle,
        metaDescription,
      })
      .onConflictDoUpdate({
        target: salesPages.productId,
        set: {
          headline, subheadline, problemStatement,
          bodyCopy: { features, use_cases: useCases },
          ctaPrimary, ctaSecondary, metaTitle, metaDescription,
        },
      })
  } catch (err) {
    console.error('[edit] salesPages upsert failed:', err instanceof Error ? err.message : err)
    // non-fatal; product already updated
  }

  revalidatePath('/dashboard')
  revalidatePath('/browse')
  if (newSlug) revalidatePath(`/products/${newSlug}`)

  return { ok: true, slug: newSlug }
}

export async function deleteProduct(productId: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await loadOwnedProduct(productId, session.user.id)
  if (!row) redirect('/dashboard')
  if (row.sellerUserId !== session.user.id) {
    throw new Error('Not authorised')
  }

  await db.delete(products).where(eq(products.id, productId))
  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// Re-scrape the product's source URL via Firecrawl and persist the new full-page
// screenshot as the hero image. Existing screenshots are kept (new one becomes [0]).
export type ScreenshotState =
  | { error: string }
  | { ok: true; screenshot: string }
  | null

export async function regenerateScreenshot(
  productId: string,
  _prev: ScreenshotState,
  _formData: FormData
): Promise<ScreenshotState> {
  const session = await auth()
  if (!session?.user) return { error: 'You must be signed in.' }

  const row = await loadOwnedProduct(productId, session.user.id)
  if (!row) return { error: 'Product not found.' }
  if (row.sellerUserId !== session.user.id) {
    return { error: 'Not authorised to edit this product.' }
  }
  const product = row.product
  if (!product.sourceUrl) {
    return { error: 'No source URL on file. Add one in the Source URL field first.' }
  }

  let scraped
  try {
    scraped = await scrapeUrl(product.sourceUrl)
  } catch (err) {
    return {
      error: `Could not capture screenshot: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }
  if (!scraped.screenshot) {
    return { error: 'Scraper returned no screenshot. Check the URL is publicly reachable.' }
  }

  // Prepend the new screenshot; keep prior ones as gallery thumbs (max 6).
  const existing = (product.screenshots ?? []).filter(s => s !== scraped.screenshot)
  const next = [scraped.screenshot, ...existing].slice(0, 6)

  try {
    await db.update(products).set({ screenshots: next }).where(eq(products.id, productId))
  } catch (err) {
    return { error: `Save failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  // Audit even seller self-edits — useful for spotting unusual scrape patterns,
  // and gives admins a unified history when reviewing a product.
  await logAdminAction({
    actor_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: 'product.regenerate_screenshot',
    target_type: 'product',
    target_id: productId,
    payload: { slug: product.slug, source_url: product.sourceUrl, new_screenshot: scraped.screenshot },
  })

  revalidatePath('/dashboard')
  revalidatePath('/browse')
  if (product.slug) revalidatePath(`/products/${product.slug}`)

  return { ok: true, screenshot: scraped.screenshot }
}
