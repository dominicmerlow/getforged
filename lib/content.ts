/**
 * Content read API. Used by every component that renders editable copy.
 *
 * Reads go through `unstable_cache` with the tag 'site-content', so:
 *   - Cold reads hit Neon once per process and cache for the page TTL
 *   - Admin edits call revalidateTag('site-content') and the next read is fresh
 *   - No CDN purge needed; Next handles staleness via the cache tag
 *
 * Falls back to `CONTENT_REGISTRY[key].default` whenever:
 *   - The DB row doesn't exist yet (key not yet edited)
 *   - DATABASE_URL isn't wired (e.g. local dev, preview without DB)
 *   - Any read error (logged, never thrown)
 */

import { unstable_cache } from 'next/cache'
import { db, dbConfigured } from '@/lib/db'
import { siteContent } from '@/db/schema'
import { CONTENT_REGISTRY, type ContentKey, ALL_CONTENT_KEYS } from './content-defaults'

export const CONTENT_CACHE_TAG = 'site-content'

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
    if (!dbConfigured()) return {}
    try {
      const rows = await db.select({ key: siteContent.key, value: siteContent.valueJson }).from(siteContent)
      const out: Record<string, unknown> = {}
      for (const row of rows) out[row.key] = row.value
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
