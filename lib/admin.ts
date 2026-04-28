/**
 * Admin gate for /admin and admin server actions.
 *
 * v2: now backed by user_roles table (Phase 1 of admin suite migration).
 * The ADMIN_EMAIL env var is kept as a fallback during the migration so
 * existing admins don't get locked out before being granted DB roles.
 * The fallback is removed in Phase 5.
 *
 * Role hierarchy (descending power):
 *   superadmin  — full access including impersonation, role grants, settings
 *   admin       — most actions: users, products, content, ops
 *   moderator   — moderation queue, suspend users, archive products
 *   support     — read-only across users / products + send magic links
 *
 * isAdminEmail() is preserved as a sync helper for components that can't
 * await (e.g. the Nav). It still uses the env-var allowlist OR falls back
 * to "true" when env unset (open mode for early-stage).
 */

import { createServerClient } from '@supabase/ssr'

export type UserRole = 'superadmin' | 'admin' | 'moderator' | 'support'

export const ALL_ROLES: UserRole[] = ['superadmin', 'admin', 'moderator', 'support']

// Roles that grant /admin access — anything in user_roles except a future
// "buyer" / "seller" tier (those live on `sellers` table, not user_roles).
export const ADMIN_ROLES: UserRole[] = ['superadmin', 'admin', 'moderator', 'support']

// ── Env-var fallback (kept during Phase 1–4 migration window) ───────
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL
  if (!raw) return []
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)
}

/**
 * Sync email-based check. Used in the nav (server component but no async),
 * components that haven't been refactored to use roles yet, and as a
 * fallback when the user_roles table is empty during migration.
 *
 * Returns true if env unset (open mode for early-stage launch). Returns
 * true if email matches the allowlist. Returns false otherwise.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const allow = parseAdminEmails()
  if (allow.length === 0) return true // open mode — env unset
  if (!email) return false
  return allow.includes(email.trim().toLowerCase())
}

/** True iff the env var is unset or empty — gate is open to any signed-in user */
export const ADMIN_GATE_OPEN = (process.env.ADMIN_EMAIL ?? '').trim().length === 0

// ── DB-backed role lookups (Phase 1 onward) ─────────────────────────

/**
 * Direct service-role Supabase client for role checks. Intentionally bypasses
 * RLS because user_roles is policy-deny on public select. Caller must already
 * have authenticated via the user-session client and verified the user's
 * identity before passing user_id here.
 */
function adminDbClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

/**
 * Returns the highest-power role the user holds, or null if they hold none.
 * Used by /admin gate and the side-nav to decide which sections to show.
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  if (!userId) return null
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const db = adminDbClient()
  const { data } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (!data || data.length === 0) return null
  // Pick the highest-power role; ALL_ROLES is in descending power order.
  for (const role of ALL_ROLES) {
    if (data.some(r => r.role === role)) return role
  }
  return null
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
 *   3. Email match → treat as superadmin (during migration window)
 *
 * After all admins have been granted DB roles, the env-var fallback can
 * be removed by deleting the `if (!role && isAdminEmail(...))` block.
 */
export async function checkAdminAccess(
  userId: string,
  email: string | null | undefined
): Promise<UserRole | null> {
  const role = await getUserRole(userId)
  if (role) return role

  // Migration fallback — remove in Phase 5
  if (isAdminEmail(email)) return 'superadmin'

  return null
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
 *
 * Safe to call from any server action. No-ops if SUPABASE_SERVICE_ROLE_KEY
 * is missing (e.g. local dev without env wired).
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[admin-audit] (no service key, skipping)', entry.action, entry.target_id)
    }
    return
  }
  try {
    const db = adminDbClient()
    await db.from('admin_audit').insert({
      actor_id: entry.actor_id,
      actor_email: entry.actor_email,
      action: entry.action,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      payload: entry.payload ?? null,
    })
  } catch (err) {
    console.error('[admin-audit] insert failed:', err instanceof Error ? err.message : err)
  }
}
