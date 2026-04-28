/**
 * Site settings (feature flags) read/write API.
 *
 * Mirrors lib/content.ts but with a separate cache tag and a smaller, more
 * structured registry. Values are typed via the SETTINGS_REGISTRY which
 * doubles as defaults source.
 *
 * Cache strategy: 60-sec revalidate + tag-based invalidation. Settings
 * change rarely so this is generous.
 */

import { unstable_cache } from 'next/cache'
import { createServerClient } from '@supabase/ssr'

export const SETTINGS_CACHE_TAG = 'site-settings'

export const SETTINGS_REGISTRY = {
  'site.maintenance_mode': {
    default: false,
    description: 'Maintenance mode — non-admins see a static "back soon" page',
    kind: 'boolean' as const,
  },
  'site.signups_paused': {
    default: false,
    description: 'Pause new account registration (existing users unaffected)',
    kind: 'boolean' as const,
  },
  'site.submissions_paused': {
    default: false,
    description: 'Pause new product submissions (sellers can still edit existing)',
    kind: 'boolean' as const,
  },
  'site.checkout_paused': {
    default: false,
    description: 'Pause new checkouts (browsing still works; "Buy" buttons hide)',
    kind: 'boolean' as const,
  },
  'commission.rate_pct': {
    default: 15,
    description: 'Platform commission % taken on each sale',
    kind: 'number' as const,
  },
} as const

export type SettingKey = keyof typeof SETTINGS_REGISTRY
export const ALL_SETTING_KEYS = Object.keys(SETTINGS_REGISTRY) as SettingKey[]

function readClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

const fetchAllSettings = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key || url.includes('YOUR_PROJECT')) return {}
    try {
      const supabase = readClient()
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value_json')
      if (error) {
        console.error('[settings] read failed:', error.message)
        return {}
      }
      const out: Record<string, unknown> = {}
      for (const row of data ?? []) {
        out[row.key] = row.value_json
      }
      return out
    } catch (err) {
      console.error('[settings] read threw:', err instanceof Error ? err.message : err)
      return {}
    }
  },
  ['site-settings-all'],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 60 }
)

export async function getSetting<K extends SettingKey>(
  key: K
): Promise<typeof SETTINGS_REGISTRY[K]['default']> {
  const all = await fetchAllSettings()
  if (key in all) {
    return all[key] as typeof SETTINGS_REGISTRY[K]['default']
  }
  return SETTINGS_REGISTRY[key].default
}

export async function getAllSettingsForAdmin(): Promise<
  Array<{
    key: SettingKey
    value: unknown
    isOverride: boolean
    default: unknown
    description: string
    kind: 'boolean' | 'number'
  }>
> {
  const all = await fetchAllSettings()
  return ALL_SETTING_KEYS.map(key => {
    const def = SETTINGS_REGISTRY[key]
    const isOverride = key in all
    return {
      key,
      value: isOverride ? all[key] : def.default,
      isOverride,
      default: def.default,
      description: def.description,
      kind: def.kind,
    }
  })
}
