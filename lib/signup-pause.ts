/**
 * The "signups are paused" check.
 *
 * It lives here rather than in app/actions/auth.ts because everything
 * exported from a `'use server'` module is a directly invocable endpoint —
 * and this function returns true exactly when no account exists for the
 * address given, which makes it an account-existence oracle anybody can query
 * while a pause is on. Nothing about it needs to be a server action; both
 * callers are already server-side.
 *
 * Fail-OPEN: any error in the setting read or the user lookup returns false,
 * so legitimate sign-ins are never broken by an infrastructure hiccup.
 */
import { eq } from 'drizzle-orm'
import { db, dbConfigured } from '@/lib/db'
import { users } from '@/db/schema'
import { getSetting } from '@/lib/settings'

export async function shouldBlockNewSignup(email: string): Promise<boolean> {
  try {
    const paused = await getSetting('site.signups_paused')
    if (!paused) return false
    if (!dbConfigured()) return false

    const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
    return !existing
  } catch (err) {
    console.error('[signup-pause] check threw:', err instanceof Error ? err.message : err)
    return false
  }
}
