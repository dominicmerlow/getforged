'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess, logAdminAction, ALL_ROLES, type UserRole } from '@/lib/admin'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export type UserActionResult =
  | { ok: true; user_id: string; message?: string }
  | { error: string }
  | null

async function gateOrRedirect(): Promise<{ userId: string; email: string | null; role: UserRole }> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')
  return { userId: userData.user.id, email: userData.user.email ?? null, role }
}

/**
 * Toggle the verified badge on a seller. Visible publicly on product cards.
 */
export async function adminToggleVerified(
  _prev: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  const { userId: actorId, email: actorEmail } = await gateOrRedirect()

  const sellerId = String(formData.get('seller_id') ?? '')
  const verified = String(formData.get('verified') ?? 'false').toLowerCase() === 'true'
  if (!sellerId) return { error: 'No seller_id' }

  const db = adminDb()
  const { error } = await db.from('sellers').update({ verified }).eq('id', sellerId)
  if (error) return { error: error.message }

  await logAdminAction({
    actor_id: actorId,
    actor_email: actorEmail,
    action: verified ? 'user.verify' : 'user.unverify',
    target_type: 'seller',
    target_id: sellerId,
  })

  revalidatePath('/admin/users')
  revalidatePath('/browse')
  return { ok: true, user_id: sellerId }
}

/**
 * Update a seller's display_name.
 */
export async function adminUpdateDisplayName(
  _prev: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  const { userId: actorId, email: actorEmail } = await gateOrRedirect()

  const sellerId = String(formData.get('seller_id') ?? '')
  const displayName = String(formData.get('display_name') ?? '').trim()
  if (!sellerId) return { error: 'No seller_id' }
  if (!displayName) return { error: 'Display name cannot be empty' }
  if (displayName.length > 80) return { error: 'Display name too long (max 80)' }

  const db = adminDb()
  const { data: prior } = await db.from('sellers').select('display_name').eq('id', sellerId).maybeSingle()
  const { error } = await db.from('sellers').update({ display_name: displayName }).eq('id', sellerId)
  if (error) return { error: error.message }

  await logAdminAction({
    actor_id: actorId,
    actor_email: actorEmail,
    action: 'user.update_display_name',
    target_type: 'seller',
    target_id: sellerId,
    payload: { from: prior?.display_name ?? null, to: displayName },
  })

  revalidatePath('/admin/users')
  return { ok: true, user_id: sellerId }
}

/**
 * Grant a role to a user. Idempotent — re-granting the same role is a no-op
 * thanks to the (user_id, role) primary key.
 */
export async function adminGrantRole(
  _prev: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  const { userId: actorId, email: actorEmail, role: actorRole } = await gateOrRedirect()

  // Only superadmin can grant superadmin
  const targetUserId = String(formData.get('user_id') ?? '')
  const role = String(formData.get('role') ?? '') as UserRole
  if (!targetUserId) return { error: 'No user_id' }
  if (!ALL_ROLES.includes(role)) return { error: `Invalid role: ${role}` }
  if (role === 'superadmin' && actorRole !== 'superadmin') {
    return { error: 'Only superadmins can grant superadmin' }
  }

  const db = adminDb()
  const { error } = await db.from('user_roles').upsert(
    { user_id: targetUserId, role, granted_by: actorId },
    { onConflict: 'user_id,role', ignoreDuplicates: true }
  )
  if (error) return { error: error.message }

  await logAdminAction({
    actor_id: actorId,
    actor_email: actorEmail,
    action: 'user.grant_role',
    target_type: 'user',
    target_id: targetUserId,
    payload: { role },
  })

  revalidatePath('/admin/users')
  return { ok: true, user_id: targetUserId, message: `Granted ${role}` }
}

export async function adminRevokeRole(
  _prev: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  const { userId: actorId, email: actorEmail, role: actorRole } = await gateOrRedirect()

  const targetUserId = String(formData.get('user_id') ?? '')
  const role = String(formData.get('role') ?? '') as UserRole
  if (!targetUserId) return { error: 'No user_id' }
  if (!ALL_ROLES.includes(role)) return { error: `Invalid role: ${role}` }

  // Don't let an admin revoke their own superadmin (foot-gun protection)
  if (targetUserId === actorId && role === actorRole) {
    return { error: "You can't revoke your own current role from this screen." }
  }

  const db = adminDb()
  const { error } = await db
    .from('user_roles')
    .delete()
    .eq('user_id', targetUserId)
    .eq('role', role)
  if (error) return { error: error.message }

  await logAdminAction({
    actor_id: actorId,
    actor_email: actorEmail,
    action: 'user.revoke_role',
    target_type: 'user',
    target_id: targetUserId,
    payload: { role },
  })

  revalidatePath('/admin/users')
  return { ok: true, user_id: targetUserId, message: `Revoked ${role}` }
}

/**
 * Send a fresh magic link to a user. Useful when an account is locked out
 * or hasn't received the original signup email.
 */
export async function adminSendMagicLink(
  _prev: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  const { userId: actorId, email: actorEmail } = await gateOrRedirect()

  const targetEmail = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!targetEmail) return { error: 'No email' }

  const db = adminDb()
  // Use the admin API to generate a magic link without rate limit.
  // generateLink returns the full action_link the admin can share with the
  // user out-of-band. Supabase also sends the email itself.
  try {
    const { data, error } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforged.vercel.app'}/auth/callback`,
      },
    })
    if (error) return { error: error.message }

    await logAdminAction({
      actor_id: actorId,
      actor_email: actorEmail,
      action: 'user.send_magic_link',
      target_type: 'user',
      target_id: data.user?.id ?? targetEmail,
      payload: { email: targetEmail },
    })

    return { ok: true, user_id: data.user?.id ?? targetEmail, message: 'Magic link sent' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send' }
  }
}
