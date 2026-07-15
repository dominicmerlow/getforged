'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { getOrigin, shouldBlockNewSignup } from '@/app/actions/auth'
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
  if (!allowed) return { error: 'Too many attempts — please try again later.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  const service = await createServiceClient()
  const { data: invite } = await service
    .from('claim_invites')
    .select('id, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return { error: 'This claim link is invalid.' }
  if (invite.status === 'claimed') return { error: 'This listing has already been claimed.' }
  if (invite.status === 'revoked') return { error: 'This claim link is no longer active.' }
  if (new Date(invite.expires_at) < new Date()) return { error: 'This claim link has expired.' }

  if (await shouldBlockNewSignup(email)) {
    return { error: SIGNUPS_PAUSED_MSG }
  }

  const origin = await getOrigin()
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?claim=${encodeURIComponent(token)}`,
    },
  })
  if (error) return { error: error.message }

  return { ok: true }
}
