import { redirect } from 'next/navigation'
import { eq, and, inArray } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { claimInvites, products, sellers } from '@/db/schema'

export const dynamic = 'force-dynamic'

/**
 * Lands here immediately after the claim magic link is verified — the
 * `redirectTo` passed to `signIn('resend', ...)` in ../actions.ts points at
 * this route, which is what makes it Auth.js's replacement for the old
 * Supabase `/auth/callback?claim=TOKEN` handler.
 *
 * By the time this renders, `events.createUser` in auth.ts has already run
 * (Auth.js awaits event handlers before completing the callback request), so
 * a brand-new claimant already has both a `users` row and a `sellers` row.
 * This page's only job is the transfer: reassign the prospect product to the
 * claiming user's seller row and mark the invite claimed.
 */
export default async function ClaimFinishPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const session = await auth()

  // Shouldn't normally happen — the magic link verification is what
  // establishes the session that lands here — but if it does, send them to
  // sign in and come straight back to finish the claim.
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/claim/${token}/finish`)}`)
  }

  if (!dbConfigured()) redirect('/dashboard')

  const invite = await db.query.claimInvites.findFirst({ where: eq(claimInvites.token, token) })
  const stillClaimable = invite
    && (invite.status === 'sent' || invite.status === 'viewed')
    && invite.expiresAt >= new Date()

  if (!stillClaimable || !invite) {
    redirect('/dashboard')
  }

  const sellerRow = await db.query.sellers.findFirst({ where: eq(sellers.userId, session.user.id) })
  if (!sellerRow) {
    // Seller provisioning failed at signup (see auth.ts's createUser event
    // catch block) — nothing to transfer ownership to. Land them on the
    // dashboard, which already handles a missing seller row gracefully.
    redirect('/dashboard')
  }

  // Single-use, race-safe: the conditional status filter means only one
  // concurrent request can flip 'sent'/'viewed' → 'claimed'. A second
  // request (double-click, retried tab) sees zero rows updated and no-ops.
  const claimed = await db.transaction(async (tx) => {
    const [updatedInvite] = await tx
      .update(claimInvites)
      .set({ status: 'claimed', claimedAt: new Date(), claimedBy: session.user.id })
      .where(and(eq(claimInvites.id, invite.id), inArray(claimInvites.status, ['sent', 'viewed'])))
      .returning({ id: claimInvites.id })

    if (!updatedInvite) return false

    await tx.update(products)
      .set({ sellerId: sellerRow.id, isProspect: false })
      .where(eq(products.id, invite.productId))

    return true
  })

  redirect(claimed ? '/dashboard?claimed=1' : '/dashboard')
}
