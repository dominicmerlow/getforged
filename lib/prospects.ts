import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
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

async function findUniqueSlug(
  baseSlug: string,
  service: Awaited<ReturnType<typeof createServiceClient>>
): Promise<string> {
  let slug = baseSlug
  let n = 2
  for (let i = 0; i < 20; i++) {
    const { data } = await service.from('products').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    slug = `${baseSlug}-${n++}`
  }
  return `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Returns the id of the single "house" seller that owns prospect drafts
 * before they're claimed, creating it (a real auth user + its
 * trigger-created sellers row) on first use.
 */
export async function getOrCreateHouseSeller(
  service: Awaited<ReturnType<typeof createServiceClient>>
): Promise<string> {
  const { data: existing } = await service
    .from('sellers')
    .select('id')
    .eq('is_house_account', true)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error: userErr } = await service.auth.admin.createUser({
    email: HOUSE_SELLER_EMAIL,
    email_confirm: true,
    user_metadata: { display_name: HOUSE_SELLER_NAME },
  })
  if (userErr || !created.user) {
    throw new Error(`Could not create house account: ${userErr?.message ?? 'unknown error'}`)
  }

  // The on_auth_user_created trigger (schema.sql) already inserted a
  // sellers row for the new user — fetch and mark it.
  const { data: sellerRow, error: sellerErr } = await service
    .from('sellers')
    .select('id')
    .eq('user_id', created.user.id)
    .maybeSingle()
  if (sellerErr || !sellerRow) {
    throw new Error('House auth user created but no sellers row found — check on_auth_user_created trigger')
  }

  await service
    .from('sellers')
    .update({ is_house_account: true, display_name: HOUSE_SELLER_NAME })
    .eq('id', sellerRow.id)

  return sellerRow.id
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
 * with is_prospect=true, and creates a claim_invites row. Throws on
 * failure — callers (the admin CSV tool) should catch per-row so one bad
 * URL doesn't abort the whole batch.
 */
export async function createProspectDraft(
  input: CreateProspectDraftInput
): Promise<CreateProspectDraftResult> {
  const service = await createServiceClient()

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

  const houseSellerId = await getOrCreateHouseSeller(service)
  const baseSlug = slugify(input.name) || 'product'
  const slug = await findUniqueSlug(baseSlug, service)
  const screenshots = scraped.screenshot ? [scraped.screenshot] : null

  const { data: productInsert, error: productErr } = await service
    .from('products')
    .insert({
      seller_id: houseSellerId,
      title: input.name,
      tagline: generated.headline,
      description: generated.subheadline,
      features: generated.features,
      use_cases: generated.use_cases,
      status: 'draft',
      slug,
      source_url: input.productUrl,
      category: input.category,
      screenshots,
      is_prospect: true,
    })
    .select('id')
    .single()

  if (productErr || !productInsert) {
    throw new Error(productErr?.message ?? 'Could not insert prospect product')
  }
  const productId = productInsert.id as string

  await service.from('sales_pages').insert({
    product_id: productId,
    headline: generated.headline,
    subheadline: generated.subheadline,
    problem_statement: generated.problem_statement,
    body_copy: { features: generated.features, use_cases: generated.use_cases } as object,
    cta_primary: generated.cta_primary,
    cta_secondary: generated.cta_secondary,
    meta_title: generated.meta_title,
    meta_description: generated.meta_description,
  })

  const claimToken = generateClaimToken()
  const { error: inviteErr } = await service.from('claim_invites').insert({
    token: claimToken,
    product_id: productId,
    prospect_email: input.prospectEmail || null,
    prospect_name: input.prospectName || null,
    source: input.source,
    created_by: input.createdBy,
  })
  if (inviteErr) {
    throw new Error(`Product created but invite insert failed: ${inviteErr.message}`)
  }

  return { productId, slug, claimToken }
}
