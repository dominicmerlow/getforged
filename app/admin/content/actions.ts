'use server'

import { updateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { siteContent } from '@/db/schema'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'
import { CONTENT_REGISTRY, type ContentKey, type ContentKind, ALL_CONTENT_KEYS } from '@/lib/content-defaults'
import { CONTENT_CACHE_TAG } from '@/lib/content'

export type ContentSaveState =
  | { error: string }
  | { ok: true; key: string; reset?: boolean }
  | null

/**
 * Whitelist+coerce the raw form input into the shape declared by the registry.
 * Any value that fails coercion is rejected with a descriptive error so the
 * admin sees what went wrong rather than a silent miss.
 */
function coerceValue(key: ContentKey, raw: string): { value: unknown } | { error: string } {
  const def = CONTENT_REGISTRY[key]
  const trimmed = raw.trim()
  const kind = def.kind as ContentKind

  switch (kind) {
    case 'text':
    case 'multiline':
    case 'rich':
      if (trimmed.length > 8000) return { error: 'Value too long (max 8000 chars).' }
      return { value: trimmed }

    case 'boolean': {
      const t = trimmed.toLowerCase()
      if (['true', 'on', '1', 'yes'].includes(t)) return { value: true }
      if (['false', 'off', '0', 'no', ''].includes(t)) return { value: false }
      return { error: `Invalid boolean: "${raw}"` }
    }

    case 'number': {
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return { error: `Invalid number: "${raw}"` }
      return { value: n }
    }

    case 'array': {
      const items = trimmed.split('\n').map(s => s.trim()).filter(Boolean)
      return { value: items }
    }

    default:
      return { error: `Unknown kind: ${kind}` }
  }
}

export async function saveContent(
  _prev: ContentSaveState,
  formData: FormData
): Promise<ContentSaveState> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  const rawKey = String(formData.get('key') ?? '')
  if (!ALL_CONTENT_KEYS.includes(rawKey as ContentKey)) {
    return { error: `Unknown content key: ${rawKey}` }
  }
  const key = rawKey as ContentKey
  const rawValue = String(formData.get('value') ?? '')

  const coerced = coerceValue(key, rawValue)
  if ('error' in coerced) return coerced

  const def = CONTENT_REGISTRY[key]

  const prior = await db.query.siteContent.findFirst({ where: eq(siteContent.key, key) })

  try {
    await db
      .insert(siteContent)
      .values({
        key,
        valueJson: coerced.value,
        description: def.description,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: siteContent.key,
        set: {
          valueJson: coerced.value,
          description: def.description,
          updatedAt: new Date(),
          updatedBy: session.user.id,
        },
      })
  } catch (err) {
    return { error: `Save failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  // updateTag (vs revalidateTag) gives read-your-own-writes — the next read
  // in this same Server Action context sees the fresh value, not the cache.
  updateTag(CONTENT_CACHE_TAG)
  // Revalidate the root layout — content keys can render in nav/footer too,
  // so 'layout' (not 'page') ensures shared layout data refreshes.
  revalidatePath('/', 'layout')

  await logAdminAction({
    actor_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: 'content.update',
    target_type: 'content_key',
    target_id: key,
    payload: {
      from: prior?.valueJson ?? null,
      to: coerced.value,
      kind: def.kind,
    },
  })

  return { ok: true, key }
}

/**
 * Delete an override → next read falls back to the hardcoded default.
 * Useful for "revert this key" without having to know the original value.
 */
export async function resetContent(
  _prev: ContentSaveState,
  formData: FormData
): Promise<ContentSaveState> {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  const rawKey = String(formData.get('key') ?? '')
  if (!ALL_CONTENT_KEYS.includes(rawKey as ContentKey)) {
    return { error: `Unknown content key: ${rawKey}` }
  }
  const key = rawKey as ContentKey

  const prior = await db.query.siteContent.findFirst({ where: eq(siteContent.key, key) })
  await db.delete(siteContent).where(eq(siteContent.key, key))

  updateTag(CONTENT_CACHE_TAG)
  revalidatePath('/', 'layout')

  await logAdminAction({
    actor_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: 'content.reset',
    target_type: 'content_key',
    target_id: key,
    payload: { from: prior?.valueJson ?? null, to: 'default' },
  })

  return { ok: true, key, reset: true }
}
