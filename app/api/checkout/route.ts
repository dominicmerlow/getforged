import { NextResponse, type NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products } from '@/db/schema'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import { getSetting } from '@/lib/settings'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const ip = await getClientIp()
  const allowed = await checkRateLimit({ bucket: 'checkout', identifier: ip, limit: 10, windowSeconds: 60 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests — please slow down.' }, { status: 429 })
  }

  const form = await request.formData()
  const slug = String(form.get('slug') ?? '')
  const purchaseType = String(form.get('purchase_type') ?? 'licensed') as
    | 'licensed'
    | 'exclusive'

  if (!slug) {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 })
  }
  if (!['licensed', 'exclusive'].includes(purchaseType)) {
    return NextResponse.json({ error: 'invalid purchase_type' }, { status: 400 })
  }

  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, 'live')),
  })

  if (!product) {
    return NextResponse.json({ error: 'product not found' }, { status: 404 })
  }

  const price =
    purchaseType === 'exclusive' ? product.priceExclusive : product.priceLicensed
  if (!price || price <= 0) {
    return NextResponse.json(
      { error: `no ${purchaseType} price set for this product` },
      { status: 400 }
    )
  }

  // Admin-controlled checkout pause. Fail-OPEN: a transient settings read
  // failure must not lock revenue, so on error we treat as "not paused".
  let checkoutPaused = false
  try {
    checkoutPaused = await getSetting('site.checkout_paused')
  } catch (err) {
    console.error('[checkout] settings read failed, defaulting to not-paused:', err)
    checkoutPaused = false
  }
  if (checkoutPaused) {
    return NextResponse.json(
      { error: 'checkout temporarily paused' },
      { status: 503 }
    )
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: 'STRIPE_SECRET_KEY is not configured' },
      { status: 500 }
    )
  }

  const stripe = getStripe()
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

  const session = await auth()
  const customerEmail = session?.user?.email ?? undefined

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(price * 100),
          product_data: {
            name:
              purchaseType === 'exclusive'
                ? `${product.title} — exclusive buy-out`
                : `${product.title} — licence`,
            description: product.tagline ?? undefined,
          },
        },
      },
    ],
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/products/${slug}`,
    metadata: {
      product_id: product.id,
      product_slug: slug,
      purchase_type: purchaseType,
      buyer_id: session?.user?.id ?? '',
    },
  })

  if (!checkoutSession.url) {
    return NextResponse.json({ error: 'stripe did not return a url' }, { status: 500 })
  }

  return NextResponse.redirect(checkoutSession.url, { status: 303 })
}
