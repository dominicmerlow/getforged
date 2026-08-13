import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sellers } from '@/db/schema'

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key.includes('sk_live_...') || key.startsWith('sk_live_...')) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(key)
}

export function stripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY
  return !!key && key !== 'sk_live_...' && !key.endsWith('...')
}

export function commissionRate(): number {
  const raw = process.env.GETFORGED_COMMISSION_RATE
  const parsed = raw ? Number(raw) : 0.15
  return Number.isFinite(parsed) ? parsed : 0.15
}

/** Platform commission in pence for a GBP price given in whole pounds. */
export function applicationFeePence(priceGBP: number): number {
  return Math.round(priceGBP * 100 * commissionRate())
}

/**
 * Returns the seller's Stripe Express account id, creating one on first use.
 * Colocated with the other Stripe helpers rather than in a separate
 * db-only module — lib/admin.ts already sets the precedent for a lib/*.ts
 * file that both wraps a third-party client and touches the DB directly.
 */
export async function getOrCreateConnectAccountId(
  sellerId: string,
  email: string | null | undefined
): Promise<string> {
  const seller = await db.query.sellers.findFirst({
    where: eq(sellers.id, sellerId),
    columns: { stripeAccountId: true },
  })
  if (seller?.stripeAccountId) return seller.stripeAccountId

  const stripe = getStripe()
  const account = await stripe.accounts.create({
    type: 'express',
    email: email ?? undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  await db.update(sellers).set({ stripeAccountId: account.id }).where(eq(sellers.id, sellerId))
  return account.id
}
