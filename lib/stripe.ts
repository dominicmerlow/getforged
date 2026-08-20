import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sellers } from '@/db/schema'
import { getSetting } from '@/lib/settings'

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

const DEFAULT_COMMISSION_RATE = 0.15

/**
 * Platform commission as a fraction of the sale.
 *
 * Reads the admin setting first, then GETFORGED_COMMISSION_RATE, then 15%.
 * The setting used to be ignored entirely: `commission.rate_pct` is in
 * SETTINGS_REGISTRY and therefore rendered as an editable control on
 * /admin/settings, so an admin could change 15 to 10, watch it save, and have
 * every subsequent sale still charge the env-var rate.
 *
 * The result is clamped to [0, 1). Nothing validated it before, so
 * GETFORGED_COMMISSION_RATE=15 — the natural way to write "15%" — produced an
 * application fee fifteen times the order total, which Stripe rejects, taking
 * 100% of checkouts down over a config typo.
 */
export async function commissionRate(): Promise<number> {
  let fromSetting: number | null = null
  try {
    const pct = await getSetting('commission.rate_pct')
    if (typeof pct === 'number' && Number.isFinite(pct)) fromSetting = pct / 100
  } catch {
    // Fall through to the env var — a settings read failure must not change
    // what sellers are charged.
  }

  const raw = process.env.GETFORGED_COMMISSION_RATE
  const fromEnv = raw !== undefined ? Number(raw) : NaN

  const candidate = fromSetting ?? (Number.isFinite(fromEnv) ? fromEnv : DEFAULT_COMMISSION_RATE)
  if (!Number.isFinite(candidate) || candidate < 0 || candidate >= 1) {
    console.error(`[stripe] commission rate ${candidate} is out of range; using ${DEFAULT_COMMISSION_RATE}`)
    return DEFAULT_COMMISSION_RATE
  }
  return candidate
}

/** Platform commission in pence for a GBP price given in whole pounds. */
export async function applicationFeePence(priceGBP: number): Promise<number> {
  return Math.round(priceGBP * 100 * (await commissionRate()))
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
