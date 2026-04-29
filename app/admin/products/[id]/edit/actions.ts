'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'

/**
 * Service-role client used to read/write any product regardless of RLS.
 * Admin-edit page uses this so we can touch anyone's listing — the gate
 * upstream is the role check (`checkAdminAccess`), not RLS.
 */
function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export type AdminEditState =
  | { error: string }
  | { ok: true; slug: string | null }
  | null

/** Fields the admin editor is allowed to mutate. Whitelisted to keep the diff
 *  predictable and prevent ‑accidental‑ writes to seller_id / slug / etc. */
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

async function gateAdminOrRedirect(): Promise<{ userId: string; email: string | null }> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')
  return { userId: userData.user.id, email: userData.user.email ?? null }
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
 * Admin product edit. Bypasses seller-ownership; gated only on admin role.
 * Every mutation lands in admin_audit with a before/after diff.
 */
export async function adminEditProduct(
  productId: string,
  _prev: AdminEditState,
  formData: FormData
): Promise<AdminEditState> {
  const { userId, email } = await gateAdminOrRedirect()

  const db = adminDb()

  // Load existing row — service-role bypasses RLS, so this finds any product.
  const { data: before, error: fetchErr } = await db
    .from('products')
    .select(
      'id, slug, seller_id, title, description, price_licensed, price_exclusive, category, status, featured, featured_position, forge_of_the_week, internal_notes'
    )
    .eq('id', productId)
    .maybeSingle()

  if (fetchErr) return { error: `Could not load product: ${fetchErr.message}` }
  if (!before) return { error: 'Product not found.' }

  // ── Read form fields ─────────────────────────────────────────
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const category = String(formData.get('category') ?? '').trim() || null
  const status = String(formData.get('status') ?? '').trim() as
    | 'draft'
    | 'live'
    | 'archived'

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
    price_licensed: priceLicensed,
    price_exclusive: priceExclusive,
    featured,
    featured_position: featured ? (featuredPosition ?? 0) : null,
    forge_of_the_week: forgeOfTheWeek,
    internal_notes: internalNotes,
  }

  // ── Forge of the Week is exclusive: clear any prior holder before setting ──
  if (forgeOfTheWeek && !before.forge_of_the_week) {
    await db
      .from('products')
      .update({ forge_of_the_week: false })
      .eq('forge_of_the_week', true)
  }

  // ── Apply update ─────────────────────────────────────────────
  const { error: updateErr } = await db
    .from('products')
    .update(after)
    .eq('id', productId)

  if (updateErr) return { error: `Update failed: ${updateErr.message}` }

  // ── Compute diff for audit ───────────────────────────────────
  const diff = computeDiff(
    before as Record<EditableField, unknown>,
    after as Record<EditableField, unknown>,
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
      seller_id: before.seller_id,
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
 * Force-archive convenience action — used by the "🚫 Force archive" button
 * inside the admin editor. Same gate + audit as adminEditProduct, but only
 * touches the status column so the audit entry stays tidy.
 */
export async function adminForceArchiveProduct(
  productId: string,
  _prev: AdminEditState,
  _formData: FormData
): Promise<AdminEditState> {
  const { userId, email } = await gateAdminOrRedirect()
  const db = adminDb()

  const { data: before, error: fetchErr } = await db
    .from('products')
    .select('id, slug, seller_id, status')
    .eq('id', productId)
    .maybeSingle()
  if (fetchErr) return { error: `Could not load product: ${fetchErr.message}` }
  if (!before) return { error: 'Product not found.' }
  if (before.status === 'archived') {
    return { error: 'Product is already archived.' }
  }

  const { error: updateErr } = await db
    .from('products')
    .update({ status: 'archived' })
    .eq('id', productId)
  if (updateErr) return { error: `Archive failed: ${updateErr.message}` }

  await logAdminAction({
    actor_id: userId,
    actor_email: email,
    action: 'product.admin_force_archive',
    target_type: 'product',
    target_id: productId,
    payload: {
      slug: before.slug,
      seller_id: before.seller_id,
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
