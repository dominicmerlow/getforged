'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'

export type AuthState = { error?: string; message?: string } | null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SIGNUPS_PAUSED_MSG =
  "New signups are paused right now. Please check back soon or email support@getforged.io if you're locked out."

async function getOrigin(): Promise<string> {
  const h = await headers()
  return h.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/**
 * Returns true if the magic-link request should be blocked because the
 * `site.signups_paused` setting is on AND no auth.users row exists for this
 * email (i.e. it would create a new account).
 *
 * Fail-OPEN: any error in the setting read or auth lookup returns false so
 * legitimate logins are never broken by infrastructure hiccups.
 */
async function shouldBlockNewSignup(email: string): Promise<boolean> {
  try {
    const paused = await getSetting('site.signups_paused')
    if (!paused) return false

    const service = await createServiceClient()
    // Query auth.users directly via service role. Returns null row if absent.
    const { data, error } = await service
      .schema('auth')
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      // Fail-open on lookup failure — don't break login due to infra.
      console.error('[auth] signup-pause lookup failed:', error.message)
      return false
    }
    // No row = brand new email = block when paused.
    return !data
  } catch (err) {
    console.error(
      '[auth] signup-pause check threw:',
      err instanceof Error ? err.message : err
    )
    return false
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

  const supabase = await createClient()
  const origin = await getOrigin()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
  })

  if (error) return { error: error.message }
  return { message: `Magic link sent to ${email}. Check your inbox.` }
}

/**
 * Register flow: name + email. Sends a magic-link with `data.display_name`
 * carried as `raw_user_meta_data` so the auth callback can promote it onto
 * the seller's `display_name` (otherwise the DB trigger falls back to the
 * email prefix, which is what we're trying to escape).
 *
 * Behaviour for existing users: Supabase will still send a sign-in link
 * — we don't error on "already exists" because that would leak account
 * existence. Existing users' display_name is left untouched (callback only
 * promotes if currently null/empty/email-prefix).
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

  const supabase = await createClient()
  const origin = await getOrigin()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // `data` populates raw_user_meta_data on first signup AND merges into
      // existing users' metadata on subsequent OTP requests.
      data: { display_name: name, full_name: name },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  })

  if (error) return { error: error.message }
  return {
    message: `Welcome ${name.split(/\s+/)[0]} — we&apos;ve sent a confirmation link to ${email}. Open it on this device to finish.`,
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
