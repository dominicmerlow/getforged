/**
 * Site settings (feature flags) read API.
 *
 * Mirrors lib/content.ts but with a separate cache tag and a smaller, more
 * structured registry. Values are typed via the SETTINGS_REGISTRY which
 * doubles as defaults source.
 *
 * Cache strategy: 60-sec revalidate + tag-based invalidation. Settings
 * change rarely so this is generous.
 */

import { unstable_cache } from 'next/cache'
import { db, dbConfigured } from '@/lib/db'
import { siteSettings } from '@/db/schema'
import { reportDegraded } from '@/lib/degraded'

export const SETTINGS_CACHE_TAG = 'site-settings'

export const SETTINGS_REGISTRY = {
  'site.maintenance_mode': {
    default: false,
    description: 'Maintenance mode: non-admins see a static "back soon" page',
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

const fetchAllSettings = unstable_cache(
  async (): Promise<Record<string, unknown>> => {
    if (!dbConfigured()) return {}
    try {
      const rows = await db.select({ key: siteSettings.key, value: siteSettings.valueJson }).from(siteSettings)
      const out: Record<string, unknown> = {}
      for (const row of rows) out[row.key] = row.value
      return out
    } catch (err) {
      reportDegraded({ scope: 'settings', fallback: 'default feature flags', error: err })
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
