import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { sellers } from '@/db/schema'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import { getOrigin } from '@/app/actions/auth'

/**
 * Stripe's Account Link refresh_url — hit when a previously-issued link
 * expired or was already used. Account Links are single-use, so the fix is
 * simply to mint a fresh one and redirect straight into it rather than
 * dead-ending the seller back on the dashboard.
 */
export async function GET() {
  const origin = await getOrigin()
  const session = await auth()
  if (!session?.user) return NextResponse.redirect(`${origin}/login`)

  const sellerRow = await db.query.sellers.findFirst({ where: eq(sellers.userId, session.user.id) })
  if (!sellerRow?.stripeAccountId || !stripeConfigured()) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  const stripe = getStripe()
  const accountLink = await stripe.accountLinks.create({
    account: sellerRow.stripeAccountId,
    refresh_url: `${origin}/api/connect/refresh`,
    return_url: `${origin}/api/connect/return`,
    type: 'account_onboarding',
  })

  return NextResponse.redirect(accountLink.url)
}
