import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { sellers } from '@/db/schema'
import { stripeConfigured, syncSellerPayoutStatus } from '@/lib/stripe'
import { getOrigin } from '@/app/actions/auth'

/**
 * Stripe's Account Link return_url — hit after the seller finishes (or exits)
 * the hosted onboarding flow. Account status isn't guaranteed to be current
 * yet purely from this redirect (Stripe recommends re-fetching), so this
 * does a live `accounts.retrieve` rather than trusting the redirect alone.
 * The account.updated webhook (app/api/stripe/webhook) keeps it in sync
 * afterwards for any status change that happens outside this flow.
 */
export async function GET() {
  const origin = await getOrigin()
  const session = await auth()
  if (!session?.user) return NextResponse.redirect(`${origin}/login`)

  const sellerRow = await db.query.sellers.findFirst({ where: eq(sellers.userId, session.user.id) })
  if (!sellerRow?.stripeAccountId || !stripeConfigured()) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  try {
    await syncSellerPayoutStatus(sellerRow)
  } catch (err) {
    console.error('[connect-return] account status sync failed:', err instanceof Error ? err.message : err)
  }

  return NextResponse.redirect(`${origin}/dashboard?connect=1`)
}
