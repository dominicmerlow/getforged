import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const claimToken = searchParams.get('claim')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  // Promote `display_name` from auth metadata to the seller row.
  // The DB trigger `on_auth_user_created` defaults display_name to the email
  // prefix (e.g. "dom" for dom@example.com). If the user signed up via the
  // /register form, they passed their real name as `data.display_name` in
  // the OTP options — Supabase persists that to `raw_user_meta_data`.
  // Here we one-shot promote it onto the seller row so it shows in the UI
  // from the very first dashboard visit.
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (user) {
    const desiredName =
      (user.user_metadata?.display_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      null

    if (desiredName && desiredName.trim().length > 0) {
      // Look up the current seller row. If the trigger-set display_name is
      // still the email prefix or null, replace it with the user's real name.
      const emailPrefix = user.email?.split('@')[0]?.toLowerCase() ?? ''
      const { data: sellerRow } = await supabase
        .from('sellers')
        .select('id, display_name')
        .eq('user_id', user.id)
        .maybeSingle()

      if (sellerRow) {
        const current = (sellerRow.display_name ?? '').trim().toLowerCase()
        const isStillDefault =
          current === '' ||
          current === emailPrefix ||
          current === user.email?.toLowerCase()

        if (isStillDefault) {
          await supabase
            .from('sellers')
            .update({ display_name: desiredName.trim() })
            .eq('id', sellerRow.id)
        }
      }
    }
  }

  // Claim-invite flow: reassign the prospect draft to this user's own
  // seller row (created by the on_auth_user_created trigger above) and
  // mark the invite claimed. Idempotent/single-use via the conditional
  // status update below — a re-clicked or retried link is a no-op.
  if (user && claimToken) {
    const service = await createServiceClient()
    const { data: invite } = await service
      .from('claim_invites')
      .select('id, product_id, status, expires_at')
      .eq('token', claimToken)
      .maybeSingle()

    const stillClaimable =
      invite &&
      (invite.status === 'sent' || invite.status === 'viewed') &&
      new Date(invite.expires_at) >= new Date()

    if (stillClaimable && invite) {
      const { data: sellerRow } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (sellerRow) {
        const { data: claimedInvite } = await service
          .from('claim_invites')
          .update({ status: 'claimed', claimed_at: new Date().toISOString(), claimed_by: user.id })
          .eq('id', invite.id)
          .in('status', ['sent', 'viewed'])
          .select('id')
          .maybeSingle()

        if (claimedInvite) {
          await service
            .from('products')
            .update({ seller_id: sellerRow.id, is_prospect: false })
            .eq('id', invite.product_id)

          return NextResponse.redirect(`${origin}/dashboard?claimed=1`)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
