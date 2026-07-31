import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, sellers, products, salesPages, claimInvites } from '@/db/schema'
import { scrapeUrl } from '@/lib/firecrawl'
import { generateSalesPageSmart, llmConfigured } from '@/lib/llm'
import { slugify } from '@/lib/utils'
import type { GeneratedSalesPage } from '@/lib/types'

const HOUSE_SELLER_EMAIL = 'prospects@getforged.internal'
const HOUSE_SELLER_NAME = 'GetForged (unclaimed prospect)'

export function generateClaimToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}

function stubSalesPage(name: string, category: string, fallback: string): GeneratedSalesPage {
  const desc = fallback.trim() || `${name} is an AI-built ${category.toLowerCase()} tool.`
  return {
    headline: name,
    subheadline: desc.slice(0, 140),
    problem_statement: `Small businesses need ${category.toLowerCase()} tools without custom dev work. ${name} ships ready to use.`,
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
    meta_title: `${name} — ${category} on GetForged`.slice(0, 60),
    meta_description: desc.slice(0, 155),
  }
}

async function findUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let n = 2
  for (let i = 0; i < 20; i++) {
    const existing = await db.query.products.findFirst({ where: eq(products.slug, slug) })
    if (!existing) return slug
    slug = `${baseSlug}-${n++}`
  }
  return `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Returns the id of the single "house" seller that owns prospect drafts
 * before they're claimed, creating it (a real user row + seller row) on
 * first use.
 *
 * The Supabase version needed the admin API to create an `auth.users` row
 * (magic-link users can't be inserted directly through PostgREST). Drizzle
 * has no such restriction — `users` is an ordinary table this app owns, so
 * the house account is just a row with no `passwordHash` (nobody signs in
 * as it) and email verified, matching the "email_confirm: true" the old
 * admin-API call set.
 */
export async function getOrCreateHouseSeller(): Promise<string> {
  const existing = await db.query.sellers.findFirst({ where: eq(sellers.isHouseAccount, true) })
  if (existing) return existing.id

  const [houseUser] = await db
    .insert(users)
    .values({ email: HOUSE_SELLER_EMAIL, name: HOUSE_SELLER_NAME, emailVerified: new Date() })
    .returning({ id: users.id })

  const [houseSeller] = await db
    .insert(sellers)
    .values({ userId: houseUser.id, displayName: HOUSE_SELLER_NAME, isHouseAccount: true })
    .returning({ id: sellers.id })

  return houseSeller.id
}

export interface CreateProspectDraftInput {
  productUrl: string
  name: string
  category: string
  source: string
  prospectEmail?: string
  prospectName?: string
  createdBy: string | null
}

export interface CreateProspectDraftResult {
  productId: string
  slug: string
  claimToken: string
}

/**
 * Scrapes a prospect's product URL, generates a draft sales page (same
 * pipeline as app/submit/actions.ts), inserts it under the house seller
 * with isProspect=true, and creates a claim_invites row. Throws on failure —
 * callers (the admin CSV tool) should catch per-row so one bad URL doesn't
 * abort the whole batch.
 */
export async function createProspectDraft(
  input: CreateProspectDraftInput
): Promise<CreateProspectDraftResult> {
  const scraped = await scrapeUrl(input.productUrl)

  let generated: GeneratedSalesPage
  if (llmConfigured()) {
    try {
      const outcome = await generateSalesPageSmart(scraped.markdown, input.name, input.category)
      generated = outcome.page
    } catch (err) {
      console.error('[prospects] LLM generation failed, using stub:', err)
      generated = stubSalesPage(input.name, input.category, scraped.description ?? scraped.title ?? '')
    }
  } else {
    generated = stubSalesPage(input.name, input.category, scraped.description ?? scraped.title ?? '')
  }

  const houseSellerId = await getOrCreateHouseSeller()
  const baseSlug = slugify(input.name) || 'product'
  const slug = await findUniqueSlug(baseSlug)
  const screenshots = scraped.screenshot ? [scraped.screenshot] : null

  const [productInsert] = await db
    .insert(products)
    .values({
      sellerId: houseSellerId,
      title: input.name,
      tagline: generated.headline,
      description: generated.subheadline,
      features: generated.features as unknown as Record<string, unknown>[],
      useCases: generated.use_cases as unknown as Record<string, unknown>[],
      status: 'draft',
      slug,
      sourceUrl: input.productUrl,
      category: input.category,
      screenshots,
      isProspect: true,
    })
    .returning({ id: products.id })

  if (!productInsert) throw new Error('Could not insert prospect product')
  const productId = productInsert.id

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

  const claimToken = generateClaimToken()
  await db.insert(claimInvites).values({
    token: claimToken,
    productId,
    prospectEmail: input.prospectEmail || null,
    prospectName: input.prospectName || null,
    source: input.source,
    createdBy: input.createdBy,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days, matches migration 015's default
  })

  return { productId, slug, claimToken }
}
