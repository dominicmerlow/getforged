'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, and } from 'drizzle-orm'
import { auth, signIn } from '@/auth'
import { db } from '@/lib/db'
import { sellers, userRoles } from '@/db/schema'
import { checkAdminAccess, logAdminAction, roleAtLeast, ALL_ROLES, type UserRole } from '@/lib/admin'

export type UserActionResult =
  | { ok: true; user_id: string; message?: string }
  | { error: string }
  | null

async function gateOrRedirect(
  minimum: UserRole = 'admin'
): Promise<{ userId: string; email: string | null; role: UserRole }> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
  // `checkAdminAccess` returning truthy only proves the caller is staff of
  // SOME tier - including `support`, which is documented read-only. Each
  // action names the tier it actually requires.
  if (!roleAtLeast(role, minimum)) redirect('/admin')
  return { userId: session.user.id, email: session.user.email ?? null, role }
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

  try {
    await db.update(sellers).set({ verified }).where(eq(sellers.id, sellerId))
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' }
  }

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
 * Update a seller's display name.
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

  const prior = await db.query.sellers.findFirst({
    where: eq(sellers.id, sellerId),
    columns: { displayName: true },
  })

  try {
    await db.update(sellers).set({ displayName }).where(eq(sellers.id, sellerId))
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' }
  }

  await logAdminAction({
    actor_id: actorId,
    actor_email: actorEmail,
    action: 'user.update_display_name',
    target_type: 'seller',
    target_id: sellerId,
    payload: { from: prior?.displayName ?? null, to: displayName },
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
  const { userId: actorId, email: actorEmail } = await gateOrRedirect('superadmin')

  const targetUserId = String(formData.get('user_id') ?? '')
  const role = String(formData.get('role') ?? '') as UserRole
  if (!targetUserId) return { error: 'No user_id' }
  if (!ALL_ROLES.includes(role)) return { error: `Invalid role: ${role}` }

  try {
    await db.insert(userRoles).values({ userId: targetUserId, role, grantedBy: actorId }).onConflictDoNothing()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Grant failed' }
  }

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
  const { userId: actorId, email: actorEmail, role: actorRole } = await gateOrRedirect('superadmin')

  const targetUserId = String(formData.get('user_id') ?? '')
  const role = String(formData.get('role') ?? '') as UserRole
  if (!targetUserId) return { error: 'No user_id' }
  if (!ALL_ROLES.includes(role)) return { error: `Invalid role: ${role}` }

  // Don't let an admin revoke their own current role from this screen (foot-gun protection)
  if (targetUserId === actorId && role === actorRole) {
    return { error: "You can't revoke your own current role from this screen." }
  }

  try {
    await db.delete(userRoles).where(and(eq(userRoles.userId, targetUserId), eq(userRoles.role, role)))
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Revoke failed' }
  }

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
 * Send a fresh magic link to a user. Useful when an account is locked out or
 * hasn't received the original signup email.
 *
 * The Supabase version used the admin API's `generateLink` to mint a link
 * without going through the normal request flow, returning the raw URL for
 * the admin to relay out-of-band. Auth.js has no equivalent admin-only link
 * generator — `signIn('resend', ...)` IS the send, there's no "generate but
 * don't send" mode. That's a strictly better outcome for this use case
 * anyway: the user gets a working email directly, and no raw auth token
 * passes through the admin's screen or the audit log.
 */
export async function adminSendMagicLink(
  _prev: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  const { userId: actorId, email: actorEmail } = await gateOrRedirect('support')

  const targetEmail = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!targetEmail) return { error: 'No email' }

  try {
    await signIn('resend', { email: targetEmail, redirect: false })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send' }
  }

  await logAdminAction({
    actor_id: actorId,
    actor_email: actorEmail,
    action: 'user.send_magic_link',
    target_type: 'user',
    target_id: targetEmail,
    payload: { email: targetEmail },
  })

  return { ok: true, user_id: targetEmail, message: 'Magic link sent' }
}
