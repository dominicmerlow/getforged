/**
 * Content read API. Used by every component that renders editable copy.
 *
 * Reads go through `unstable_cache` with the tag 'site-content', so:
 *   - Cold reads hit Supabase once per process and cache for the page TTL
 *   - Admin edits call revalidateTag('site-content') and the next read is fresh
 *   - No CDN purge needed; Next handles staleness via the cache tag
 *
 * Falls back to `CONTENT_REGISTRY[key].default` whenever:
 *   - The DB row doesn't exist yet (key not yet edited)
 *   - The Supabase env isn't wired (e.g. local dev, preview without DB)
 *   - Any read error (logged, never thrown)
 */

import { unstable_cache } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { CONTENT_REGISTRY, type ContentKey, ALL_CONTENT_KEYS } from './content-defaults'

export const CONTENT_CACHE_TAG = 'site-content'

interface ContentRow {
  key: string
  value_json: unknown
  description: string | null
  updated_at: string
  updated_by: string | null
}

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('YOUR_PROJECT')
}

// Use a cookie-less server client — content is public-readable, no auth needed.
function readClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

/**
 * Loads ALL content overrides in one round-trip and caches them by tag.
 * Subsequent calls (within the same render or future renders until
 * the tag invalidates) hit the cache.
 *
 * IMPORTANT: must return a plain object (Record), not a Map. Next.js
 * unstable_cache serializes return values via JSON for storage, and
 * Map → JSON drops the entries (becomes {}), so the next read can't
 * call .has() / .get() on it. Plain object survives the round-trip
 * untouched — lookups via `key in obj` and `obj[key]`.
 */
const fetchAllOverrides = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    if (!supabaseConfigured()) return {}
    try {
      const supabase = readClient()
      const { data, error } = await supabase
        .from('site_content')
        .select('key, value_json')
      if (error) {
        console.error('[content] read failed:', error.message)
        return {}
      }
      const out: Record<string, unknown> = {}
      for (const row of (data ?? []) as Pick<ContentRow, 'key' | 'value_json'>[]) {
        out[row.key] = row.value_json
      }
      return out
    } catch (err) {
      console.error('[content] read threw:', err instanceof Error ? err.message : err)
      return {}
    }
  },
  ['site-content-all'],
  { tags: [CONTENT_CACHE_TAG], revalidate: 60 }
)

/**
 * Get the override value for a single content key, falling back to the
 * hardcoded default.
 *
 * Generic typing: TypeScript infers the return type from the registry default.
 * Callers don't need to type-assert.
 */
export async function getContent<K extends ContentKey>(
  key: K
): Promise<typeof CONTENT_REGISTRY[K]['default']> {
  const overrides = await fetchAllOverrides()
  if (key in overrides) {
    return overrides[key] as typeof CONTENT_REGISTRY[K]['default']
  }
  return CONTENT_REGISTRY[key].default
}

/**
 * Batch helper. Returns an object keyed on the requested keys with
 * their resolved values (override-or-default).
 */
export async function getContentBatch<K extends ContentKey>(
  keys: K[]
): Promise<{ [key in K]: typeof CONTENT_REGISTRY[key]['default'] }> {
  const overrides = await fetchAllOverrides()
  const result = {} as { [key in K]: typeof CONTENT_REGISTRY[key]['default'] }
  for (const key of keys) {
    result[key] = (key in overrides
      ? overrides[key]
      : CONTENT_REGISTRY[key].default) as typeof CONTENT_REGISTRY[K]['default']
  }
  return result
}

/**
 * Returns every key + its current value (override-or-default) + metadata.
 * Used by /admin/content to render the edit list.
 */
export async function getAllContentForAdmin(): Promise<
  Array<{
    key: ContentKey
    value: unknown
    isOverride: boolean
    default: unknown
    description: string
    group: string
    kind: string
  }>
> {
  const overrides = await fetchAllOverrides()
  return ALL_CONTENT_KEYS.map(key => {
    const def = CONTENT_REGISTRY[key]
    const isOverride = key in overrides
    return {
      key,
      value: isOverride ? overrides[key] : def.default,
      isOverride,
      default: def.default,
      description: def.description,
      group: def.group,
      kind: def.kind,
    }
  })
}
