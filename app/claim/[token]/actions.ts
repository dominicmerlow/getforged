'use server'

import { eq } from 'drizzle-orm'
import { signIn } from '@/auth'
import { db } from '@/lib/db'
import { claimInvites } from '@/db/schema'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { shouldBlockNewSignup } from '@/lib/signup-pause'
import { SIGNUPS_PAUSED_MSG } from '@/lib/auth-constants'

export type ClaimState = { error: string } | { ok: true } | null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function claimProduct(
  token: string,
  _prev: ClaimState,
  formData: FormData
): Promise<ClaimState> {
  const ip = await getClientIp()
  const allowed = await checkRateLimit({ bucket: 'claim', identifier: ip, limit: 5, windowSeconds: 3600 })
  if (!allowed) return { error: 'Too many attempts. Please try again later.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  const invite = await db.query.claimInvites.findFirst({ where: eq(claimInvites.token, token) })

  if (!invite) return { error: 'This claim link is invalid.' }
  if (invite.status === 'claimed') return { error: 'This listing has already been claimed.' }
  if (invite.status === 'revoked') return { error: 'This claim link is no longer active.' }
  if (invite.expiresAt < new Date()) return { error: 'This claim link has expired.' }

  if (await shouldBlockNewSignup(email)) {
    return { error: SIGNUPS_PAUSED_MSG }
  }

  // The magic link's landing page IS the claim-transfer step — see
  // app/claim/[token]/finish/page.tsx. `redirectTo` survives the round trip
  // through Auth.js's Resend provider, so no custom callback route is needed
  // (Supabase's implicit-flow /auth/callback?claim=... equivalent is gone).
  try {
    await signIn('resend', { email, redirectTo: `/claim/${encodeURIComponent(token)}/finish`, redirect: false })
  } catch (err) {
    console.error('[claim] signIn failed:', err instanceof Error ? err.message : err)
    return { error: 'Could not send the sign-in link. Please try again.' }
  }

  return { ok: true }
}
