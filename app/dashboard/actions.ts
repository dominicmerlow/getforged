'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products, sellers, errorLog } from '@/db/schema'
import type { ProductStatus } from '@/lib/types'
import { getStripe, getOrCreateConnectAccountId, stripeConfigured } from '@/lib/stripe'
import { getOrigin } from '@/app/actions/auth'

const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['live', 'archived'],
  live: ['archived', 'draft'],
  archived: ['draft'],
}

export async function updateProductStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const next = String(formData.get('next') ?? '') as ProductStatus

  if (!id || !['draft', 'live', 'archived'].includes(next)) {
    throw new Error('Invalid request')
  }

  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db
    .select({
      id: products.id,
      status: products.status,
      sellerUserId: sellers.userId,
      priceLicensed: products.priceLicensed,
      priceExclusive: products.priceExclusive,
    })
    .from(products)
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .where(eq(products.id, id))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!row) throw new Error('Product not found')
  // Ownership is enforced here explicitly — this used to ride on the
  // `products_seller_all` RLS policy, which no longer exists.
  if (row.sellerUserId !== session.user.id) throw new Error('Not authorized')

  const current = row.status as ProductStatus
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`Cannot move product from ${current} to ${next}`)
  }

  // A listing with no price renders "Buy licence - Contact", and clicking it
  // POSTs to /api/checkout which 404s with raw JSON. That is the default
  // end-state of every claimed outreach invite, because createProspectDraft
  // inserts no price and this action is reachable straight from the dashboard
  // table without opening the editor. The editor already enforces this on
  // save; publishing has to enforce it too.
  if (next === 'live' && row.priceLicensed == null && row.priceExclusive == null) {
    throw new Error('Set a licensed or exclusive price before publishing this listing.')
  }

  await db.update(products).set({ status: next }).where(eq(products.id, id))

  revalidatePath('/dashboard')
  revalidatePath('/browse')
  revalidatePath(`/products/[slug]`, 'page')
}

/**
 * Sends the seller to Stripe's hosted Connect Express onboarding. Reuses
 * their existing account if one was already created (e.g. resuming after an
 * incomplete first attempt) — Account Links are single-use and expire, so a
 * fresh one is generated every call rather than cached.
 */
export async function startStripeOnboarding() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const sellerRow = await db.query.sellers.findFirst({ where: eq(sellers.userId, session.user.id) })
  if (!sellerRow) redirect('/dashboard')
  if (!stripeConfigured()) redirect('/dashboard?connect_error=unconfigured')

  // Everything Stripe can refuse goes in here. A raw failure used to escape
  // into the global error boundary, so a seller clicking "Connect Stripe" got
  // "We hit an unexpected error" and an ID — no cause, no next step, and
  // nothing they could act on. The real message went only to the platform
  // logs, which is precisely backwards for an error the seller has to resolve.
  //
  // `redirect()` must stay OUT of the try: it signals by throwing, and a
  // catch-all around it would swallow the redirect and report success as a
  // failure.
  let onboardingUrl: string
  try {
    const accountId = await getOrCreateConnectAccountId(sellerRow.id, session.user.email)
    const stripe = getStripe()
    const origin = await getOrigin()

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/api/connect/refresh`,
      return_url: `${origin}/api/connect/return`,
      type: 'account_onboarding',
    })
    onboardingUrl = accountLink.url
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('[connect] onboarding failed:', message)
    await db.insert(errorLog).values({
      scenario: 'connect-onboarding',
      payload: { sellerId: sellerRow.id, userId: session.user.id },
      errorMessage: message,
    }).catch(() => {})
    redirect('/dashboard?connect_error=stripe')
  }

  redirect(onboardingUrl)
}
