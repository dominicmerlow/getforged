'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/firecrawl'
import { isAdminEmail } from '@/lib/admin'

function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function adminUpdateStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  if (!isAdminEmail(userData.user.email)) redirect('/')

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !['live', 'archived'].includes(status)) return

  const adminDb = createAdminClient()
  await adminDb.from('products').update({ status }).eq('id', id)

  revalidatePath('/admin')
  revalidatePath('/browse')
}

// ── Batch screenshot regeneration ────────────────────────────────────────
// Re-scrapes every live product's source_url via Firecrawl and replaces the
// hero image. Called from the /admin page; gated by ADMIN_EMAIL.
//
// This is the operational counterpart to the per-seller "regenerate" button
// (in the seller dashboard PR). When the marketplace is small (10–100 products)
// running this once after wiring up Firecrawl gives every existing listing a
// real screenshot in one click.
//
// Stripe-style sequential execution with a small concurrency limit keeps us
// inside Firecrawl's rate limits and serverless function timeouts.

export type BatchScreenshotResult = {
  ok: number
  failed: number
  skipped: number
  failures: { slug: string; reason: string }[]
}

const BATCH_CONCURRENCY = 2  // Firecrawl free tier is conservative

async function scrapeWithLimit<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  async function next(): Promise<void> {
    const idx = cursor++
    if (idx >= items.length) return
    results[idx] = await worker(items[idx])
    await next()
  }
  await Promise.all(Array.from({ length: concurrency }, next))
  return results
}

export async function adminBatchRegenerateScreenshots(): Promise<BatchScreenshotResult> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  if (!isAdminEmail(userData.user.email)) redirect('/')

  const adminDb = createAdminClient()
  const { data: liveProducts, error } = await adminDb
    .from('products')
    .select('id, slug, source_url, screenshots')
    .eq('status', 'live')

  if (error || !liveProducts) {
    return { ok: 0, failed: 0, skipped: 0, failures: [{ slug: '*', reason: error?.message ?? 'no products returned' }] }
  }

  const result: BatchScreenshotResult = { ok: 0, failed: 0, skipped: 0, failures: [] }

  await scrapeWithLimit(
    liveProducts,
    async row => {
      if (!row.source_url) {
        result.skipped++
        return
      }
      try {
        const scraped = await scrapeUrl(row.source_url)
        if (!scraped.screenshot) {
          result.failed++
          result.failures.push({ slug: row.slug ?? row.id, reason: 'no screenshot returned' })
          return
        }
        const existing = (row.screenshots ?? []).filter((s: string) => s !== scraped.screenshot)
        const next = [scraped.screenshot, ...existing].slice(0, 6)
        const { error: updErr } = await adminDb
          .from('products')
          .update({ screenshots: next })
          .eq('id', row.id)
        if (updErr) {
          result.failed++
          result.failures.push({ slug: row.slug ?? row.id, reason: updErr.message })
          return
        }
        result.ok++
      } catch (err) {
        result.failed++
        result.failures.push({
          slug: row.slug ?? row.id,
          reason: err instanceof Error ? err.message : 'unknown error',
        })
      }
    },
    BATCH_CONCURRENCY
  )

  revalidatePath('/admin')
  revalidatePath('/browse')

  return result
}
