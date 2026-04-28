/**
 * Admin gate for /admin and admin server actions.
 *
 * ADMIN_EMAIL env var supports either:
 *   - a single email:         dom@example.com
 *   - comma-separated list:   dom@example.com,clifton@example.com,ops@example.com
 *
 * Whitespace and case are normalised so "Dom@Example.com , clifton@…" still works.
 *
 * If the env var is unset OR empty, the gate is OPEN (any signed-in user is
 * treated as admin). This is intentional — it stops the deploy from blocking
 * before someone has wired the env, but you should set ADMIN_EMAIL before
 * launching publicly.
 */

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL
  if (!raw) return []
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)
}

/**
 * Returns true if the given email is on the admin allowlist.
 * Returns true for ANY email when no admins are configured (open mode).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const allow = parseAdminEmails()
  if (allow.length === 0) return true  // open mode — env unset
  if (!email) return false
  return allow.includes(email.trim().toLowerCase())
}

/** Convenience for client-side rendering — boolean check, no string normalisation. */
export const ADMIN_GATE_OPEN = (process.env.ADMIN_EMAIL ?? '').trim().length === 0
