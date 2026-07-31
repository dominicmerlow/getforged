'use server'

import { updateTag, revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { siteSettings } from '@/db/schema'
import { checkAdminAccess, logAdminAction } from '@/lib/admin'
import { SETTINGS_REGISTRY, type SettingKey, ALL_SETTING_KEYS, SETTINGS_CACHE_TAG } from '@/lib/settings'

export type SettingResult =
  | { ok: true; key: string }
  | { error: string }
  | null

export async function updateSetting(
  _prev: SettingResult,
  formData: FormData
): Promise<SettingResult> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
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

  const prior = await db.query.siteSettings.findFirst({ where: eq(siteSettings.key, key) })

  try {
    await db
      .insert(siteSettings)
      .values({
        key,
        valueJson: value,
        description: def.description,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          valueJson: value,
          description: def.description,
          updatedAt: new Date(),
          updatedBy: session.user.id,
        },
      })
  } catch (err) {
    return { error: `Save failed: ${err instanceof Error ? err.message : 'unknown error'}` }
  }

  updateTag(SETTINGS_CACHE_TAG)
  revalidatePath('/', 'layout')

  await logAdminAction({
    actor_id: session.user.id,
    actor_email: session.user.email ?? null,
    action: 'setting.update',
    target_type: 'setting',
    target_id: key,
    payload: { from: prior?.valueJson ?? null, to: value },
  })

  return { ok: true, key }
}
