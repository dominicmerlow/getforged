'use server'

import { updateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'
import { SETTINGS_REGISTRY, type SettingKey, ALL_SETTING_KEYS, SETTINGS_CACHE_TAG } from '@/lib/settings'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export type SettingResult =
  | { ok: true; key: string }
  | { error: string }
  | null

export async function updateSetting(
  _prev: SettingResult,
  formData: FormData
): Promise<SettingResult> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const rawKey = String(formData.get('key') ?? '')
  if (!ALL_SETTING_KEYS.includes(rawKey as SettingKey)) {
    return { error: `Unknown setting key: ${rawKey}` }
  }
  const key = rawKey as SettingKey
  const def = SETTINGS_REGISTRY[key]

  let value: unknown
  const raw = String(formData.get('value') ?? '').trim().toLowerCase()
  if (def.kind === 'boolean') {
    value = ['true', 'on', '1', 'yes'].includes(raw)
  } else if (def.kind === 'number') {
    const n = Number(raw)
    if (!Number.isFinite(n)) return { error: `Invalid number: "${raw}"` }
    value = n
  } else {
    return { error: `Unsupported kind for ${key}` }
  }

  const db = adminDb()
  const { data: prior } = await db.from('site_settings').select('value_json').eq('key', key).maybeSingle()

  const { error } = await db
    .from('site_settings')
    .upsert(
      {
        key,
        value_json: value,
        description: def.description,
        updated_at: new Date().toISOString(),
        updated_by: userData.user.id,
      },
      { onConflict: 'key' }
    )
  if (error) return { error: `Save failed: ${error.message}` }

  updateTag(SETTINGS_CACHE_TAG)
  revalidatePath('/', 'layout')

  await logAdminAction({
    actor_id: userData.user.id,
    actor_email: userData.user.email ?? null,
    action: 'setting.update',
    target_type: 'setting',
    target_id: key,
    payload: { from: prior?.value_json ?? null, to: value },
  })

  return { ok: true, key }
}
