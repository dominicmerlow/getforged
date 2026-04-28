'use server'

import { updateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'
import { CONTENT_REGISTRY, type ContentKey, type ContentKind, ALL_CONTENT_KEYS } from '@/lib/content-defaults'
import { CONTENT_CACHE_TAG } from '@/lib/content'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

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
  // The registry's `as const` constraints narrow `def.kind` to the subset of
  // kinds actually in use. Cast back to the full ContentKind union so the
  // forward-looking number/array branches remain valid for future registry
  // entries without TS complaining about "unreachable" cases.
  const kind = def.kind as ContentKind

  switch (kind) {
    case 'text':
    case 'multiline':
    case 'rich':
      if (trimmed.length > 8000) return { error: 'Value too long (max 8000 chars).' }
      return { value: trimmed }

    case 'boolean':
      // Form posts come back as 'true'/'false'/'on'/'off'/'1'/'0'
      const t = trimmed.toLowerCase()
      if (['true', 'on', '1', 'yes'].includes(t)) return { value: true }
      if (['false', 'off', '0', 'no', ''].includes(t)) return { value: false }
      return { error: `Invalid boolean: "${raw}"` }

    case 'number':
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return { error: `Invalid number: "${raw}"` }
      return { value: n }

    case 'array':
      // Split by newline, drop empties — simplest editor for v1.
      // More structured array editors come in Phase 4.5 if needed.
      const items = trimmed
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
      return { value: items }

    default:
      return { error: `Unknown kind: ${kind}` }
  }
}

export async function saveContent(
  _prev: ContentSaveState,
  formData: FormData
): Promise<ContentSaveState> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const rawKey = String(formData.get('key') ?? '')
  const rawValue = String(formData.get('value') ?? '')

  // Type-narrow rawKey to a known ContentKey — anything else is rejected.
  if (!ALL_CONTENT_KEYS.includes(rawKey as ContentKey)) {
    return { error: `Unknown content key: ${rawKey}` }
  }
  const key = rawKey as ContentKey

  const coerced = coerceValue(key, rawValue)
  if ('error' in coerced) return coerced

  const def = CONTENT_REGISTRY[key]
  const db = adminDb()

  // Read the current row (if any) so the audit log captures before/after.
  const { data: prior } = await db
    .from('site_content')
    .select('value_json')
    .eq('key', key)
    .maybeSingle()

  const { error } = await db
    .from('site_content')
    .upsert(
      {
        key,
        value_json: coerced.value,
        description: def.description,
        updated_at: new Date().toISOString(),
        updated_by: userData.user.id,
      },
      { onConflict: 'key' }
    )

  if (error) return { error: `Save failed: ${error.message}` }

  // Bust the content cache so reads pick up the new value within seconds.
  // updateTag (vs revalidateTag) gives read-your-own-writes — the next read
  // in this same Server Action context sees the fresh value, not the cache.
  updateTag(CONTENT_CACHE_TAG)
  // Revalidate the root layout — content keys can render in nav/footer too,
  // so 'layout' (not 'page') ensures shared layout data refreshes.
  revalidatePath('/', 'layout')

  await logAdminAction({
    actor_id: userData.user.id,
    actor_email: userData.user.email ?? null,
    action: 'content.update',
    target_type: 'content_key',
    target_id: key,
    payload: {
      from: prior?.value_json ?? null,
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
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const rawKey = String(formData.get('key') ?? '')
  if (!ALL_CONTENT_KEYS.includes(rawKey as ContentKey)) {
    return { error: `Unknown content key: ${rawKey}` }
  }
  const key = rawKey as ContentKey
  const db = adminDb()

  const { data: prior } = await db
    .from('site_content')
    .select('value_json')
    .eq('key', key)
    .maybeSingle()

  await db.from('site_content').delete().eq('key', key)

  // updateTag (vs revalidateTag) gives read-your-own-writes — the next read
  // in this same Server Action context sees the fresh value, not the cache.
  updateTag(CONTENT_CACHE_TAG)
  revalidatePath('/', 'layout')

  await logAdminAction({
    actor_id: userData.user.id,
    actor_email: userData.user.email ?? null,
    action: 'content.reset',
    target_type: 'content_key',
    target_id: key,
    payload: { from: prior?.value_json ?? null, to: 'default' },
  })

  return { ok: true, key, reset: true }
}
