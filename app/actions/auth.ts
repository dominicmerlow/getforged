'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { AuthError } from 'next-auth'
import { signIn, signOut as authSignOut } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { users, pendingDisplayNames } from '@/db/schema'
import { getSetting } from '@/lib/settings'
import { SIGNUPS_PAUSED_MSG } from '@/lib/auth-constants'

export type AuthState = { error?: string; message?: string } | null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function getOrigin(): Promise<string> {
  const h = await headers()
  return h.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/**
 * Returns true if the sign-in request should be blocked because
 * `site.signups_paused` is on AND no user row exists for this email (i.e. it
 * would create a new account).
 *
 * Fail-OPEN: any error in the setting read or user lookup returns false so
 * legitimate logins are never broken by infrastructure hiccups.
 */
export async function shouldBlockNewSignup(email: string): Promise<boolean> {
  try {
    const paused = await getSetting('site.signups_paused')
    if (!paused) return false
    if (!dbConfigured()) return false

    const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
    return !existing
  } catch (err) {
    console.error('[auth] signup-pause check threw:', err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * Wraps a `signIn()` call and converts Auth.js's thrown errors into the
 * `{error}` / `{message}` shape these forms already render. `signIn` throws
 * `NEXT_REDIRECT` on success (by design — Next's redirect mechanism is also
 * exception-based), so that specific throw must be re-thrown, not caught.
 */
async function safeSignIn(action: () => Promise<unknown>, successMessage: string): Promise<AuthState> {
  try {
    await action()
    return { message: successMessage }
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    if (err instanceof AuthError) {
      return { error: 'Sign-in failed. Please try again.' }
    }
    console.error('[auth] sign-in threw:', err instanceof Error ? err.message : err)
    return { error: 'Something went wrong. Please try again.' }
  }
}

export async function signInWithEmail(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  if (await shouldBlockNewSignup(email)) {
    return { error: SIGNUPS_PAUSED_MSG }
  }

  return safeSignIn(
    () => signIn('resend', { email, redirect: false }),
    `Magic link sent to ${email}. Check your inbox.`
  )
}

/**
 * Register flow: name + email. The name is stashed in `pendingDisplayNames`
 * so `events.createUser` in auth.ts can promote it onto the new seller row —
 * see that file's comment for why a side table replaces what used to be
 * Supabase's `raw_user_meta_data`.
 */
export async function signUpWithNameAndEmail(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!name || name.length < 2) {
    return { error: 'Enter your name (at least 2 characters).' }
  }
  if (name.length > 80) {
    return { error: 'Name is too long (max 80 characters).' }
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  if (await shouldBlockNewSignup(email)) {
    return { error: SIGNUPS_PAUSED_MSG }
  }

  if (dbConfigured()) {
    try {
      await db
        .insert(pendingDisplayNames)
        .values({ email, displayName: name })
        .onConflictDoUpdate({ target: pendingDisplayNames.email, set: { displayName: name, createdAt: new Date() } })
    } catch (err) {
      console.error('[auth] pendingDisplayNames write failed:', err instanceof Error ? err.message : err)
    }
  }

  return safeSignIn(
    () => signIn('resend', { email, redirect: false }),
    `Welcome ${name.split(/\s+/)[0]}, we've sent a confirmation link to ${email}. Open it on this device to finish.`
  )
}

/**
 * Password sign-in (Credentials provider). Rejects with a generic message on
 * any failure — wrong password and "no such account" are indistinguishable
 * on purpose, so a failed guess can't be used to enumerate registered emails.
 */
export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' }
  if (!password) return { error: 'Enter your password.' }

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    return { error: 'Incorrect email or password.' }
  }

  redirect('/dashboard')
}

/**
 * Password registration. Creates the `users` row directly (Credentials
 * sign-ins don't go through the adapter's `createUser` lifecycle the way
 * OAuth/magic-link do), then signs in immediately so the register form's
 * "Create my account" button lands the user in their dashboard in one step.
 */
export async function registerWithPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!name || name.length < 2) return { error: 'Enter your name (at least 2 characters).' }
  if (name.length > 80) return { error: 'Name is too long (max 80 characters).' }
  if (!email || !EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  if (!dbConfigured()) return { error: 'Sign-up is not available right now.' }

  if (await shouldBlockNewSignup(email)) {
    return { error: SIGNUPS_PAUSED_MSG }
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  // Same "don't leak account existence" reasoning as sign-in: a generic
  // message either way, never "that email is taken".
  if (existing) return { error: 'Could not create that account. Try signing in instead.' }

  const passwordHash = await hash(password, 12)
  await db.insert(users).values({ email, name, passwordHash })
  // The seller row this user needs is normally created by `events.createUser`
  // (auth.ts) — but that event only fires through the adapter-mediated
  // sign-in flows (OAuth, magic link), not Credentials. Insert it here so a
  // password-registered seller isn't left without one.
  const { sellers } = await import('@/db/schema')
  const created = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (created) {
    await db.insert(sellers).values({ userId: created.id, displayName: name })
  }

  try {
    await signIn('credentials', { email, password, redirect: false })
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    // Account was created but the immediate sign-in failed for some other
    // reason — send them to log in manually rather than losing the account.
    return { message: 'Account created. Please sign in.' }
  }

  redirect('/dashboard')
}

/**
 * OAuth buttons post to these directly (`<form action={signInWithGitHub}>`)
 * rather than going through `next-auth/react`'s client-side `signIn`, which
 * would require wrapping the app in a `SessionProvider` just for two buttons.
 * A server action that calls `signIn()` throws Next's redirect to the
 * provider's consent screen — no client JS needed.
 */
export async function signInWithGitHub() {
  await signIn('github', { redirectTo: '/dashboard' })
}

export async function signInWithGoogle() {
  await signIn('google', { redirectTo: '/dashboard' })
}

export async function signOut() {
  await authSignOut({ redirect: false })
  revalidatePath('/', 'layout')
  redirect('/')
}
