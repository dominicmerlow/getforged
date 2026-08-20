'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products, purchases } from '@/db/schema'
import { scrapeUrl } from '@/lib/firecrawl'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'
import { getStripe, stripeConfigured } from '@/lib/stripe'

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

// ── Refunds ───────────────────────────────────────────────────────────────
// Triggers the Stripe-side refund only. purchases.refundedAt / refundAmount
// are stamped by the charge.refunded webhook once Stripe confirms it — same
// "stamp on confirmed event, not on request" pattern the webhook already
// uses for receipt/seller-notification emails, so a Stripe-side failure
// after this call can't leave the DB claiming a refund that didn't happen.

export async function adminRefundPurchase(formData: FormData) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  const purchaseId = String(formData.get('purchase_id') ?? '')
  if (!purchaseId) return

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    columns: { id: true, stripePaymentIntentId: true, refundedAt: true, amount: true, productId: true },
  })
  if (!purchase) return
  if (purchase.refundedAt) return // already refunded — avoid a duplicate Stripe call
  if (!purchase.stripePaymentIntentId) {
    await logAdminAction({
      actor_id: session.user.id,
      actor_email: session.user.email ?? null,
      action: 'purchase.refund_failed',
      target_type: 'purchase',
      target_id: purchaseId,
      payload: { reason: 'no stripe_payment_intent_id on this purchase (pre-Connect historical row?)' },
    })
    return
  }
  if (!stripeConfigured()) return

  try {
    const stripe = getStripe()
    await stripe.refunds.create({
      payment_intent: purchase.stripePaymentIntentId,
      // This is a destination charge (app/api/checkout/route.ts sets
      // transfer_data.destination), so the seller's share left the platform
      // balance at charge time and the platform kept application_fee_amount.
      // Refunding without these two flags pays the buyer back out of the
      // platform balance and reverses neither — every refund would cost the
      // platform the full order value while the seller keeps their 85%.
      reverse_transfer: true,
      refund_application_fee: true,
    })
  } catch (err) {
    await logAdminAction({
      actor_id: session.user.id,
      actor_email: session.user.email ?? null,
      action: 'purchase.refund_failed',
      target_type: 'purchase',
      target_id: purchaseId,
      payload: { error: err instanceof Error ? err.message : 'unknown' },
    })
    return
  }

  await logAdminAction({
    actor_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: 'purchase.refund_requested',
    target_type: 'purchase',
    target_id: purchaseId,
    payload: { amount: purchase.amount, product_id: purchase.productId },
  })

  revalidatePath('/admin')
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
