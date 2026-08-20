/**
 * Add the remaining getbrian.xyz tools to the GetForged catalogue.
 *
 * getbrian.xyz advertises four tools Brian runs daily — ContentFlow, CRM,
 * DiffDoc and DealMaker. Two of them (CRM, DealMaker) are already listed here;
 * this script adds the other two, so the marketplace stops launching with a
 * catalogue that is half the size of the estate it is selling.
 *
 * Why a script instead of /submit: /submit scrapes the page and asks an LLM to
 * write the listing, which is right for a stranger's product and wrong for our
 * own — the copy below is lifted from the live product pages rather than
 * re-imagined, so nothing on a public listing is a model's guess about a
 * product we built ourselves.
 *
 * Safety properties:
 *   - Idempotent. An existing slug is skipped, never overwritten, unless
 *     --update is passed. Re-running it cannot clobber dashboard edits.
 *   - Inserts as `draft` by default. Nothing becomes publicly visible until
 *     someone reviews it and passes --status=live (or flips it in the
 *     dashboard).
 *   - Attaches to the seller that already owns `dealmaker-by-getbrian`, rather
 *     than guessing an owner. That seller's Stripe Connect account is already
 *     payouts-enabled, so the new listings are actually buyable.
 *   - --dry-run prints the plan and writes nothing.
 *
 * Usage:
 *   npx tsx scripts/add-getbrian-listings.ts --dry-run
 *   npx tsx scripts/add-getbrian-listings.ts
 *   npx tsx scripts/add-getbrian-listings.ts --status=live
 *
 * Needs DATABASE_URL (or POSTGRES_URL / the unpooled variants) in the
 * environment or .env.local — same resolution as the rest of the app.
 */
import { loadEnvConfig } from '@next/env'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { products, salesPages, sellers } from '../db/schema'
import { resolveDatabaseUrl } from '../lib/db-url'

loadEnvConfig(process.cwd())

/** The listing that tells us which seller owns the GetBrian estate. */
const ANCHOR_SLUG = 'dealmaker-by-getbrian'

interface Listing {
  slug: string
  title: string
  category: string
  /** Hero line. Stored as products.tagline and sales_pages.headline. */
  headline: string
  /** One-liner. Stored as products.description and sales_pages.subheadline. */
  subheadline: string
  problemStatement: string
  features: { title: string; description: string }[]
  useCases: { title: string; description: string }[]
  ctaPrimary: string
  ctaSecondary: string
  metaTitle: string
  metaDescription: string
  priceLicensed: number
  demoUrl: string
  sourceUrl: string
  platform: string[]
  integrations: string[]
  architecture: string | null
}

/**
 * Copy sourced from the live product pages (diffdoc.getbrian.xyz,
 * flow.getbrian.xyz) on 2026-08-20. Claims here should be traceable to those
 * pages — if a product changes, change the page first and this second.
 */
const LISTINGS: Listing[] = [
  {
    slug: 'diffdoc-by-getbrian',
    title: 'DiffDoc by GetBrian',
    category: 'Operations',
    headline: 'One clause changed. Did anyone catch it?',
    subheadline:
      'Drop in two versions of a document and see every insertion, deletion and edit marked up word by word — with a similarity score telling you how far they drifted.',
    problemStatement:
      "Contracts, leases, policies and tenders come back marked up, and the only way to be sure nothing moved is to re-read the whole thing. One changed term — twelve months to twenty-four, thirty days to forty-five — is invisible to a skim and expensive to miss. Track Changes only helps when everyone remembered to use it, which is never.",
    features: [
      { title: 'Word-level diff', description: 'Every insertion, deletion and edit marked exactly where it happened — word by word, not line by line.' },
      { title: 'Similarity score', description: 'A single number on every comparison telling you how far the two versions have drifted apart.' },
      { title: 'Risk flags', description: 'Surfaces the changes worth a second look instead of leaving you to rank two hundred of them yourself.' },
      { title: '.docx and .pdf', description: 'Both formats, up to 25 MB each, with no conversion step and no sign-up to run the first comparison.' },
      { title: 'Comment and edit', description: 'Margin comments and tracked edits on the primary document, so the review happens in one place.' },
      { title: 'Audit-ready export', description: 'One-click .docx and .pdf export of the marked-up copy for whoever has to sign it.' },
    ],
    useCases: [
      { title: 'Contract review', description: 'Check what the other side actually changed before it goes to signature.' },
      { title: 'Lease negotiation', description: 'Track a lease across half a dozen rounds without re-reading it each time.' },
      { title: 'Policy version control', description: 'Show precisely what moved between two published versions of a policy.' },
      { title: 'Tender responses', description: 'Compare a returned specification against the one you issued.' },
    ],
    ctaPrimary: 'Get a licence',
    ctaSecondary: 'Try a comparison',
    metaTitle: 'DiffDoc by GetBrian — document comparison that shows what changed',
    metaDescription:
      'Compare two .docx or .pdf documents and get a word-level marked-up diff, a similarity score and an audit-ready export. Built by Brian, licensed on GetForged.',
    priceLicensed: 49,
    demoUrl: 'https://diffdoc.getbrian.xyz',
    sourceUrl: 'https://diffdoc.getbrian.xyz',
    platform: ['Web'],
    integrations: [],
    architecture: null,
  },
  {
    slug: 'contentflow-by-getbrian',
    title: 'ContentFlow by GetBrian',
    category: 'Marketing',
    headline: 'One WordPress plugin instead of four subscriptions',
    subheadline:
      'Theme editing, AI drafting, RSS automation, AI visibility and a feedback tracker on one settings screen and one API key — the gaps between four tools, closed.',
    problemStatement:
      "Most WordPress sites run on a theme, an AI writer, an automation tool and a feedback tool. Four logins, four bills, and none of them have ever spoken to each other: the theme doesn't know what the writer published, the automation rule doesn't know which drafts still need a human, and every join between them is a Zapier job that breaks the week somebody changes a plan.",
    features: [
      { title: 'Plain-language theme editing', description: 'Describe a layout, section or colour change in the screen you are already editing. No child theme, no code, no developer ticket.' },
      { title: 'Content generator', description: 'Drafts from a topic and a few notes, with four editable presets, revision-with-feedback, and per-model cost printed on every draft.' },
      { title: 'RSS automation', description: 'Unlimited feeds, a rule per source, and GUID deduping so one story never becomes two drafts. Runs on WordPress’s own job queue.' },
      { title: 'AI visibility', description: 'A live llms.txt, schema.org structured data and a markdown REST API, so assistants can quote you properly instead of guessing.' },
      { title: 'Feedback tracker', description: 'Highlight-and-comment annotations on live articles, each with a written fix shown as a before/after diff.' },
      { title: 'Human approval throughout', description: 'Nothing reaches the live site on its own — every draft and every fix waits for a person to approve, edit or reject it.' },
    ],
    useCases: [
      { title: 'Content-led small business', description: 'Publish consistently without paying for four separate content tools.' },
      { title: 'Agencies running client sites', description: 'Tokenised review links let a client approve copy without an account.' },
      { title: 'Trade and niche publishers', description: 'Watch every competitor and trade feed that matters, and draft the moment something lands.' },
      { title: 'Sites that want to be cited', description: 'Get read and credited by AI assistants rather than published and invisible.' },
    ],
    ctaPrimary: 'Get a licence',
    ctaSecondary: 'See it running',
    metaTitle: 'ContentFlow by GetBrian — the WordPress content stack as one plugin',
    metaDescription:
      'Theme editing in plain English, AI drafting, RSS automation, llms.txt and a feedback tracker — one WordPress plugin, one settings screen, one key. Licensed on GetForged.',
    priceLicensed: 49,
    demoUrl: 'https://flow.getbrian.xyz',
    sourceUrl: 'https://flow.getbrian.xyz',
    platform: ['WordPress'],
    integrations: ['WordPress', 'OpenRouter', 'RSS'],
    architecture: 'WordPress plugin, bring-your-own OpenRouter API key',
  },
]

const argv = process.argv.slice(2)
const has = (flag: string) => argv.includes(flag)
const dryRun = has('--dry-run')
const update = has('--update')
const statusArg = argv.find(a => a.startsWith('--status='))?.split('=')[1] ?? 'draft'

if (statusArg !== 'draft' && statusArg !== 'live') {
  console.error(`[listings] --status must be "draft" or "live", got "${statusArg}"`)
  process.exit(1)
}
const status = statusArg as 'draft' | 'live'

const log = (msg: string) => console.log(`[listings] ${msg}`)

async function main() {
  const url = resolveDatabaseUrl()
  if (!url) {
    console.error('[listings] no Postgres URL in the environment (DATABASE_URL / POSTGRES_URL / *_UNPOOLED)')
    process.exit(1)
  }
  const db = drizzle(neon(url), { schema: { products, salesPages, sellers } })

  const anchor = await db
    .select({ sellerId: products.sellerId })
    .from(products)
    .where(eq(products.slug, ANCHOR_SLUG))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!anchor) {
    console.error(
      `[listings] could not find the anchor listing "${ANCHOR_SLUG}" — refusing to guess which seller should own these.`
    )
    process.exit(1)
  }

  const seller = await db
    .select({ id: sellers.id, displayName: sellers.displayName, payouts: sellers.stripePayoutsEnabled })
    .from(sellers)
    .where(eq(sellers.id, anchor.sellerId))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!seller) {
    console.error(`[listings] "${ANCHOR_SLUG}" points at seller ${anchor.sellerId}, which does not exist`)
    process.exit(1)
  }

  log(`owner: ${seller.displayName ?? seller.id} (payouts enabled: ${seller.payouts ? 'yes' : 'NO — checkout will refuse)'})`)
  log(`status for new listings: ${status}${dryRun ? '  [DRY RUN — nothing will be written]' : ''}`)

  for (const listing of LISTINGS) {
    const existing = await db
      .select({ id: products.id, status: products.status })
      .from(products)
      .where(eq(products.slug, listing.slug))
      .limit(1)
      .then(rows => rows[0] ?? null)

    if (existing && !update) {
      log(`skip   ${listing.slug} — already exists (status: ${existing.status}). Pass --update to overwrite its copy.`)
      continue
    }
    if (dryRun) {
      log(`${existing ? 'update' : 'insert'} ${listing.slug} — "${listing.title}", ${listing.category}, £${listing.priceLicensed}`)
      continue
    }

    const productValues = {
      sellerId: seller.id,
      title: listing.title,
      tagline: listing.headline,
      description: listing.subheadline,
      features: listing.features as unknown as Record<string, unknown>[],
      useCases: listing.useCases as unknown as Record<string, unknown>[],
      priceLicensed: listing.priceLicensed,
      slug: listing.slug,
      sourceUrl: listing.sourceUrl,
      demoUrl: listing.demoUrl,
      category: listing.category,
      platform: listing.platform,
      integrations: listing.integrations.length > 0 ? listing.integrations : null,
      architecture: listing.architecture,
      updatedAt: new Date(),
    }

    let productId: string
    if (existing) {
      // Deliberately does NOT touch `status` or `priceExclusive` — refreshing
      // copy must not silently take a listing live, pull a live one down, or
      // wipe a price somebody set in the dashboard.
      await db.update(products).set(productValues).where(eq(products.id, existing.id))
      productId = existing.id
      log(`update ${listing.slug} — copy refreshed, status left at "${existing.status}"`)
    } else {
      const [row] = await db
        .insert(products)
        .values({ ...productValues, status, priceExclusive: null })
        .returning({ id: products.id })
      productId = row.id
      log(`insert ${listing.slug} — created as "${status}"`)
    }

    const salesPageValues = {
      headline: listing.headline,
      subheadline: listing.subheadline,
      problemStatement: listing.problemStatement,
      bodyCopy: { features: listing.features, use_cases: listing.useCases },
      ctaPrimary: listing.ctaPrimary,
      ctaSecondary: listing.ctaSecondary,
      metaTitle: listing.metaTitle,
      metaDescription: listing.metaDescription,
      updatedAt: new Date(),
    }

    const existingPage = await db
      .select({ id: salesPages.id })
      .from(salesPages)
      .where(eq(salesPages.productId, productId))
      .limit(1)
      .then(rows => rows[0] ?? null)

    if (existingPage) {
      await db.update(salesPages).set(salesPageValues).where(eq(salesPages.id, existingPage.id))
    } else {
      await db.insert(salesPages).values({ productId, ...salesPageValues })
    }
    log(`       https://getforged.getbrian.xyz/products/${listing.slug}`)
  }

  log('done')
  if (status === 'draft' && !dryRun) {
    log('these are DRAFTS — publish them from the seller dashboard, or re-run with --status=live')
  }
}

main().catch((err: unknown) => {
  console.error('[listings] FAILED:', err instanceof Error ? (err.stack ?? err.message) : String(err))
  process.exit(1)
})
