/**
 * Admin gate for /admin and admin server actions.
 *
 * Backed by the `user_roles` table (Drizzle/Neon). The ADMIN_EMAIL env var
 * stays as a fallback so an operator can bootstrap the very first admin
 * before any DB role exists — mirrors the original Supabase-era migration
 * window, kept indefinitely here since there's no scheduled "Phase 5" to
 * remove it.
 *
 * Role hierarchy (descending power):
 *   superadmin  — full access including impersonation, role grants, settings
 *   admin       — most actions: users, products, content, ops
 *   moderator   — moderation queue, suspend users, archive products
 *   support     — read-only across users / products + send magic links
 *
 * Fail-CLOSED: an unset or empty ADMIN_EMAIL denies access rather than
 * granting it. A signed-in user gets admin only via an explicit DB role
 * in user_roles, or an explicit email match in ADMIN_EMAIL.
 */

import { eq, and } from 'drizzle-orm'
import { db, dbConfigured } from '@/lib/db'
import { userRoles, adminAudit } from '@/db/schema'
import { reportDegraded } from '@/lib/degraded'

export type UserRole = 'superadmin' | 'admin' | 'moderator' | 'support'

export const ALL_ROLES: UserRole[] = ['superadmin', 'admin', 'moderator', 'support']

// Roles that grant /admin access — anything in user_roles except a future
// "buyer" / "seller" tier (those live on `sellers` table, not user_roles).
export const ADMIN_ROLES: UserRole[] = ['superadmin', 'admin', 'moderator', 'support']

const ROLE_RANK: Record<UserRole, number> = {
  superadmin: 4,
  admin: 3,
  moderator: 2,
  support: 1,
}

/**
 * True when `role` sits at or above `minimum` in the hierarchy documented at
 * the top of this file.
 *
 * `checkAdminAccess` answers "are you staff", and every admin action used to
 * stop there — but ADMIN_ROLES contains all four tiers, so `support`
 * (documented read-only) could grant itself `admin`, revoke the owner's
 * `superadmin`, issue Stripe refunds, hard-delete products and switch on
 * maintenance mode. The gate proves you are staff; this decides which staff
 * you have to be.
 */
export function roleAtLeast(role: UserRole | null, minimum: UserRole): role is UserRole {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

// ── Env-var fallback ─────────────────────────────────────────────────
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL
  if (!raw) return []
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)
}

/**
 * Sync email-based allowlist check. Used as a fallback path in
 * checkAdminAccess() when the user holds no DB role yet.
 *
 * Fail-closed: an unset or empty ADMIN_EMAIL denies every email.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const allow = parseAdminEmails()
  if (allow.length === 0) return false
  if (!email) return false
  return allow.includes(email.trim().toLowerCase())
}

// ── DB-backed role lookups ───────────────────────────────────────────

/**
 * Returns the highest-power role the user holds, or null if they hold none.
 * Used by /admin gate and the side-nav to decide which sections to show.
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  if (!userId || !dbConfigured()) return null
  try {
    const rows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))

    if (rows.length === 0) return null
    // Pick the highest-power role; ALL_ROLES is in descending power order.
    for (const role of ALL_ROLES) {
      if (rows.some(r => r.role === role)) return role
    }
    return null
  } catch (err) {
    reportDegraded({ scope: 'admin.role', fallback: 'no admin role (admins are locked out)', error: err })
    return null
  }
}

/**
 * True if the user holds at least one of the specified roles.
 * Pass a single role or an array; defaults to "any admin role".
 */
export async function userHasRole(
  userId: string,
  roles: UserRole | UserRole[] = ADMIN_ROLES
): Promise<boolean> {
  const role = await getUserRole(userId)
  if (!role) return false
  const allowed = Array.isArray(roles) ? roles : [roles]
  return allowed.includes(role)
}

/**
 * Combined gate used by /admin/page.tsx and admin server actions.
 *
 * Returns the user's role if they pass the gate, null if they don't.
 * Pass-through logic:
 *   1. DB role check first (proper path)
 *   2. If no DB role found, fall back to ADMIN_EMAIL env var
 *   3. Email match → treat as superadmin
 */
export async function checkAdminAccess(
  userId: string,
  email: string | null | undefined
): Promise<UserRole | null> {
  const role = await getUserRole(userId)
  if (role) return role

  if (isAdminEmail(email)) return 'superadmin'

  return null
}

/**
 * Grant a role to a user. Idempotent — the (userId, role) primary key means
 * a repeat grant is a silent no-op rather than an error.
 */
export async function grantRole(userId: string, role: UserRole, grantedBy: string | null): Promise<void> {
  if (!dbConfigured()) return
  await db.insert(userRoles).values({ userId, role, grantedBy }).onConflictDoNothing()
}

export async function revokeRole(userId: string, role: UserRole): Promise<void> {
  if (!dbConfigured()) return
  await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
}

// ── Audit log ────────────────────────────────────────────────────────

interface AuditEntry {
  actor_id: string | null
  actor_email: string | null
  action: string
  target_type?: string | null
  target_id?: string | null
  payload?: object | null
}

/**
 * Append an admin-action row to admin_audit. Failure is non-fatal — we
 * never let an audit insert error block the underlying action, but we
 * do log to console so the failure shows up in Vercel logs.
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  if (!dbConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[admin-audit] (no database, skipping)', entry.action, entry.target_id)
    }
    return
  }
  try {
    await db.insert(adminAudit).values({
      actorId: entry.actor_id,
      actorEmail: entry.actor_email,
      action: entry.action,
      targetType: entry.target_type ?? null,
      targetId: entry.target_id ?? null,
      payload: entry.payload ?? null,
    })
  } catch (err) {
    reportDegraded({ scope: 'admin.audit', fallback: 'a dropped audit entry', error: err })
  }
}
