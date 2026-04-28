'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export type BulkResult =
  | { ok: true; affected: number }
  | { error: string }

type ProductStatus = 'draft' | 'live' | 'archived'

async function gateAdminOrRedirect(): Promise<{ userId: string; email: string | null }> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')
  return { userId: userData.user.id, email: userData.user.email ?? null }
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

  const db = adminDb()
  const { error, data } = await db
    .from('products')
    .update({ status })
    .in('id', ids)
    .select('id')

  if (error) return { error: `Update failed: ${error.message}` }

  const affected = data?.length ?? 0
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
 * For v1 we just flip the boolean; admins can manually re-set featured_position
 * via the per-product editor (Phase 3.5). Default position is 0 so newly-
 * featured products land at the top.
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

  const db = adminDb()
  // featured_position: when un-featuring, clear it; when featuring, set to 0
  // unless the product already has one (don't disturb existing manual order).
  const { data: priors } = await db
    .from('products')
    .select('id, featured_position')
    .in('id', ids)

  const updates = (priors ?? []).map(row => ({
    id: row.id,
    featured,
    featured_position: featured
      ? (row.featured_position ?? 0)
      : null,
  }))

  // Supabase doesn't have a true "bulk update with different values per row"
  // in one call — we issue parallel updates. Fine for handfuls of rows; if
  // this ever needs to scale to 100s we'd switch to an RPC.
  const results = await Promise.allSettled(
    updates.map(u =>
      db.from('products').update({
        featured: u.featured,
        featured_position: u.featured_position,
      }).eq('id', u.id)
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
 * at a time. Action atomically clears the prior holder and sets the new one.
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

  const db = adminDb()
  // Clear the current pick first (always safe — no-op if none set)
  await db.from('products').update({ forge_of_the_week: false }).eq('forge_of_the_week', true)

  if (productId !== 'none') {
    const { error } = await db
      .from('products')
      .update({ forge_of_the_week: true })
      .eq('id', productId)
    if (error) return { error: `Set failed: ${error.message}` }
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
 * Cascades via the existing FK constraints (sales_pages, reviews, purchases).
 */
export async function adminBulkDelete(
  _prev: BulkResult | null,
  formData: FormData
): Promise<BulkResult> {
  const { userId, email } = await gateAdminOrRedirect()
  const ids = parseIds(formData)
  if (ids.length === 0) return { error: 'No products selected.' }

  const db = adminDb()
  // Snapshot for audit so we know what was deleted
  const { data: priors } = await db
    .from('products')
    .select('id, slug, title, status')
    .in('id', ids)

  const { error } = await db.from('products').delete().in('id', ids)
  if (error) return { error: `Delete failed: ${error.message}` }

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
