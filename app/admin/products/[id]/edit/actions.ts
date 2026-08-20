'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products } from '@/db/schema'
import { checkAdminAccess, logAdminAction, roleAtLeast, type UserRole } from '@/lib/admin'

export type AdminEditState =
  | { error: string }
  | { ok: true; slug: string | null }
  | null

/** Fields the admin editor is allowed to mutate. Whitelisted to keep the diff
 *  predictable and prevent accidental writes to sellerId / slug / etc. */
const EDITABLE_FIELDS = [
  'title',
  'description',
  'price_licensed',
  'price_exclusive',
  'category',
  'status',
  'featured',
  'featured_position',
  'forge_of_the_week',
  'internal_notes',
] as const

type EditableField = (typeof EDITABLE_FIELDS)[number]

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function parseInt32(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}

function parseBool(raw: FormDataEntryValue | null): boolean {
  if (raw == null) return false
  const s = String(raw).toLowerCase()
  return s === 'on' || s === 'true' || s === '1' || s === 'yes'
}

async function gateAdminOrRedirect(
  minimum: UserRole = 'admin'
): Promise<{ userId: string; email: string | null; role: UserRole }> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!roleAtLeast(role, minimum)) redirect('/admin')
  return { userId: session.user.id, email: session.user.email ?? null, role }
}

/**
 * Compute a shallow before/after diff over a known field set. Only emits keys
 * whose values differ. Treats `null`, `undefined` and missing as equal so
 * we don't get noise from "unset → null" round-trips.
 */
function computeDiff<T extends Record<string, unknown>>(
  before: T,
  after: T,
  fields: readonly (keyof T)[]
): { before: Partial<T>; after: Partial<T>; changed: string[] } {
  const b: Partial<T> = {}
  const a: Partial<T> = {}
  const changed: string[] = []
  for (const f of fields) {
    const bv = before[f] ?? null
    const av = after[f] ?? null
    if (bv !== av) {
      b[f] = before[f]
      a[f] = after[f]
      changed.push(String(f))
    }
  }
  return { before: b, after: a, changed }
}

/**
 * Admin product edit. Bypasses seller-ownership; gated only on admin role —
 * there is no RLS backstop anymore, so `checkAdminAccess` above IS the
 * security boundary for this entire action. Every mutation lands in
 * admin_audit with a before/after diff.
 */
export async function adminEditProduct(
  productId: string,
  _prev: AdminEditState,
  formData: FormData
): Promise<AdminEditState> {
  const { userId, email } = await gateAdminOrRedirect()

  const before = await db.query.products.findFirst({ where: eq(products.id, productId) })
  if (!before) return { error: 'Product not found.' }

  // ── Read form fields ─────────────────────────────────────────
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const category = String(formData.get('category') ?? '').trim() || null
  const status = String(formData.get('status') ?? '').trim() as 'draft' | 'live' | 'archived'

  const priceLicensed = parseNumber(String(formData.get('price_licensed') ?? ''))
  const priceExclusive = parseNumber(String(formData.get('price_exclusive') ?? ''))

  const featured = parseBool(formData.get('featured'))
  const featuredPosition = parseInt32(String(formData.get('featured_position') ?? ''))
  const forgeOfTheWeek = parseBool(formData.get('forge_of_the_week'))
  const internalNotes = String(formData.get('internal_notes') ?? '').trim() || null

  if (!title) return { error: 'Title is required.' }
  if (!['draft', 'live', 'archived'].includes(status)) {
    return { error: `Invalid status: ${status}` }
  }
  if (priceLicensed === null && priceExclusive === null) {
    return { error: 'Set at least one price (licensed or exclusive).' }
  }

  const after = {
    title,
    description,
    category,
    status,
    priceLicensed,
    priceExclusive,
    featured,
    featuredPosition: featured ? (featuredPosition ?? 0) : null,
    forgeOfTheWeek,
    internalNotes,
  }

  try {
    // Forge of the Week is exclusive: clear any prior holder before setting.
    if (forgeOfTheWeek && !before.forgeOfTheWeek) {
      await db.update(products).set({ forgeOfTheWeek: false }).where(eq(products.forgeOfTheWeek, true))
    }
    await db.update(products).set(after).where(eq(products.id, productId))
  } catch (err) {
    return { error: `Update failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  // ── Compute diff for audit (snake_case keys, matching the audit log's
  // established naming convention across the rest of the app) ──────────
  const beforeSnake = {
    title: before.title,
    description: before.description,
    price_licensed: before.priceLicensed,
    price_exclusive: before.priceExclusive,
    category: before.category,
    status: before.status,
    featured: before.featured,
    featured_position: before.featuredPosition,
    forge_of_the_week: before.forgeOfTheWeek,
    internal_notes: before.internalNotes,
  }
  const afterSnake = {
    title: after.title,
    description: after.description,
    price_licensed: after.priceLicensed,
    price_exclusive: after.priceExclusive,
    category: after.category,
    status: after.status,
    featured: after.featured,
    featured_position: after.featuredPosition,
    forge_of_the_week: after.forgeOfTheWeek,
    internal_notes: after.internalNotes,
  }
  const diff = computeDiff(
    beforeSnake as Record<EditableField, unknown>,
    afterSnake as Record<EditableField, unknown>,
    EDITABLE_FIELDS
  )

  await logAdminAction({
    actor_id: userId,
    actor_email: email,
    action: 'product.admin_edit',
    target_type: 'product',
    target_id: productId,
    payload: {
      slug: before.slug,
      seller_id: before.sellerId,
      changed: diff.changed,
      before: diff.before,
      after: diff.after,
    },
  })

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}/edit`)
  revalidatePath('/dashboard')
  revalidatePath('/browse')
  revalidatePath('/', 'layout')
  if (before.slug) revalidatePath(`/products/${before.slug}`)

  return { ok: true, slug: before.slug }
}

/**
 * Force-archive convenience action — used by the "Force archive" button
 * inside the admin editor. Same gate + audit as adminEditProduct, but only
 * touches the status column so the audit entry stays tidy.
 */
export async function adminForceArchiveProduct(
  productId: string,
  _prev: AdminEditState,
  _formData: FormData
): Promise<AdminEditState> {
  const { userId, email } = await gateAdminOrRedirect()

  const before = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true, slug: true, sellerId: true, status: true },
  })
  if (!before) return { error: 'Product not found.' }
  if (before.status === 'archived') {
    return { error: 'Product is already archived.' }
  }

  try {
    await db.update(products).set({ status: 'archived' }).where(eq(products.id, productId))
  } catch (err) {
    return { error: `Archive failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  await logAdminAction({
    actor_id: userId,
    actor_email: email,
    action: 'product.admin_force_archive',
    target_type: 'product',
    target_id: productId,
    payload: {
      slug: before.slug,
      seller_id: before.sellerId,
      before: { status: before.status },
      after: { status: 'archived' },
      changed: ['status'],
    },
  })

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}/edit`)
  revalidatePath('/browse')
  revalidatePath('/', 'layout')
  if (before.slug) revalidatePath(`/products/${before.slug}`)

  return { ok: true, slug: before.slug }
}
