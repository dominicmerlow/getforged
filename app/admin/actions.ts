'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products } from '@/db/schema'
import { scrapeUrl } from '@/lib/firecrawl'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'

export async function adminUpdateStatus(formData: FormData) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !['live', 'archived'].includes(status)) return

  // Snapshot prior status for the audit row so we can see the before/after diff.
  const prior = await db.query.products.findFirst({
    where: eq(products.id, id),
    columns: { status: true, title: true, slug: true },
  })

  await db.update(products).set({ status: status as 'live' | 'archived' }).where(eq(products.id, id))

  await logAdminAction({
    actor_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: status === 'live' ? 'product.publish' : 'product.archive',
    target_type: 'product',
    target_id: id,
    payload: { from: prior?.status ?? null, to: status, title: prior?.title ?? null, slug: prior?.slug ?? null },
  })

  revalidatePath('/admin')
  revalidatePath('/browse')
}

// ── Batch screenshot regeneration ────────────────────────────────────────
// Re-scrapes every live product's source_url via Firecrawl and replaces the
// hero image. Called from the /admin page; gated by an admin role.

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
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  const liveProducts = await db
    .select({ id: products.id, slug: products.slug, sourceUrl: products.sourceUrl, screenshots: products.screenshots })
    .from(products)
    .where(eq(products.status, 'live'))

  const result: BatchScreenshotResult = { ok: 0, failed: 0, skipped: 0, failures: [] }

  await scrapeWithLimit(
    liveProducts,
    async row => {
      if (!row.sourceUrl) {
        result.skipped++
        return
      }
      try {
        const scraped = await scrapeUrl(row.sourceUrl)
        if (!scraped.screenshot) {
          result.failed++
          result.failures.push({ slug: row.slug ?? row.id, reason: 'no screenshot returned' })
          return
        }
        const existing = (row.screenshots ?? []).filter((s: string) => s !== scraped.screenshot)
        const next = [scraped.screenshot, ...existing].slice(0, 6)
        await db.update(products).set({ screenshots: next }).where(eq(products.id, row.id))
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

  await logAdminAction({
    actor_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: 'screenshots.batch_regenerate',
    target_type: 'product',
    target_id: 'all_live',
    payload: {
      ok: result.ok,
      failed: result.failed,
      skipped: result.skipped,
      failure_count: result.failures.length,
      first_failures: result.failures.slice(0, 5),
    },
  })

  return result
}
