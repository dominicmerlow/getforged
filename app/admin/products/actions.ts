'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products } from '@/db/schema'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'

export type BulkResult =
  | { ok: true; affected: number }
  | { error: string }

type ProductStatus = 'draft' | 'live' | 'archived'

async function gateAdminOrRedirect(): Promise<{ userId: string; email: string | null }> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')
  return { userId: session.user.id, email: session.user.email ?? null }
}

function parseIds(formData: FormData): string[] {
  // Bulk forms post `ids` as multiple values OR a single comma-separated string
  const raw = formData.getAll('ids')
  if (raw.length > 1) return raw.map(v => String(v)).filter(Boolean)
  if (raw.length === 1) {
    return String(raw[0]).split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

/**
 * Bulk status update — used for "Publish selected" / "Archive selected" /
 * "Move to draft" buttons in the admin product list. All ids must belong
 * to existing rows; missing ids are silently skipped.
 */
export async function adminBulkUpdateStatus(
  _prev: BulkResult | null,
  formData: FormData
): Promise<BulkResult> {
  const { userId, email } = await gateAdminOrRedirect()

  const status = String(formData.get('status') ?? '') as ProductStatus
  const ids = parseIds(formData)

  if (!['draft', 'live', 'archived'].includes(status)) {
    return { error: `Invalid status: ${status}` }
  }
  if (ids.length === 0) return { error: 'No products selected.' }

  let affected = 0
  try {
    const updated = await db.update(products).set({ status }).where(inArray(products.id, ids)).returning({ id: products.id })
    affected = updated.length
  } catch (err) {
    return { error: `Update failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  await logAdminAction({
    actor_id: userId,
    actor_email: email,
    action: `product.bulk_${status === 'live' ? 'publish' : status === 'archived' ? 'archive' : 'unpublish'}`,
    target_type: 'product',
    target_id: 'bulk',
    payload: { ids, status, affected },
  })

  revalidatePath('/admin/products')
  revalidatePath('/browse')
  revalidatePath('/', 'layout')
  return { ok: true, affected }
}

/**
 * Mark or unmark products as featured. Featured products appear on the
 * homepage hero stack ahead of newest-first ordering.
 *
 * For v1 we just flip the boolean; admins can manually re-set featuredPosition
 * via the per-product editor. Default position is 0 so newly-featured
 * products land at the top.
 */
export async function adminBulkSetFeatured(
  _prev: BulkResult | null,
  formData: FormData
): Promise<BulkResult> {
  const { userId, email } = await gateAdminOrRedirect()

  const featuredRaw = String(formData.get('featured') ?? 'false').toLowerCase()
  const featured = featuredRaw === 'true' || featuredRaw === 'on' || featuredRaw === '1'
  const ids = parseIds(formData)

  if (ids.length === 0) return { error: 'No products selected.' }

  // featuredPosition: when un-featuring, clear it; when featuring, set to 0
  // unless the product already has one (don't disturb existing manual order).
  const priors = await db
    .select({ id: products.id, featuredPosition: products.featuredPosition })
    .from(products)
    .where(inArray(products.id, ids))

  const results = await Promise.allSettled(
    priors.map(row =>
      db.update(products).set({
        featured,
        featuredPosition: featured ? (row.featuredPosition ?? 0) : null,
      }).where(eq(products.id, row.id))
    )
  )
  const affected = results.filter(r => r.status === 'fulfilled').length

  await logAdminAction({
    actor_id: userId,
    actor_email: email,
    action: featured ? 'product.bulk_feature' : 'product.bulk_unfeature',
    target_type: 'product',
    target_id: 'bulk',
    payload: { ids, featured, affected },
  })

  revalidatePath('/admin/products')
  revalidatePath('/', 'layout')
  return { ok: true, affected }
}

/**
 * Set Forge of the Week — exclusive: at most one product can hold the flag
 * at a time. Action clears the prior holder and sets the new one.
 *
 * Pass `productId="none"` to clear without setting a new pick.
 */
export async function adminSetForgeOfTheWeek(
  _prev: BulkResult | null,
  formData: FormData
): Promise<BulkResult> {
  const { userId, email } = await gateAdminOrRedirect()

  const productId = String(formData.get('productId') ?? '').trim()
  if (!productId) return { error: 'No product specified.' }

  try {
    // Clear the current pick first (always safe — no-op if none set)
    await db.update(products).set({ forgeOfTheWeek: false }).where(eq(products.forgeOfTheWeek, true))

    if (productId !== 'none') {
      await db.update(products).set({ forgeOfTheWeek: true }).where(eq(products.id, productId))
    }
  } catch (err) {
    return { error: `Set failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  await logAdminAction({
    actor_id: userId,
    actor_email: email,
    action: 'product.set_forge_of_the_week',
    target_type: 'product',
    target_id: productId,
    payload: { productId },
  })

  revalidatePath('/admin/products')
  revalidatePath('/', 'layout')
  return { ok: true, affected: 1 }
}

/**
 * Hard delete — superadmin-only, gated client-side by a confirm modal.
 * Cascades via the existing FK constraints (salesPages, reviews, purchases).
 */
export async function adminBulkDelete(
  _prev: BulkResult | null,
  formData: FormData
): Promise<BulkResult> {
  const { userId, email } = await gateAdminOrRedirect()
  const ids = parseIds(formData)
  if (ids.length === 0) return { error: 'No products selected.' }

  // Snapshot for audit so we know what was deleted
  const priors = await db
    .select({ id: products.id, slug: products.slug, title: products.title, status: products.status })
    .from(products)
    .where(inArray(products.id, ids))

  try {
    await db.delete(products).where(inArray(products.id, ids))
  } catch (err) {
    return { error: `Delete failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  await logAdminAction({
    actor_id: userId,
    actor_email: email,
    action: 'product.bulk_delete',
    target_type: 'product',
    target_id: 'bulk',
    payload: { ids, snapshot: priors },
  })

  revalidatePath('/admin/products')
  revalidatePath('/browse')
  revalidatePath('/', 'layout')
  return { ok: true, affected: ids.length }
}
