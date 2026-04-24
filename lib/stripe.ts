import Stripe from 'stripe'

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
