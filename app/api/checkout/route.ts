import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import type { Product } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
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

  const supabase = await createClient()
  const { data: productRow, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'live')
    .maybeSingle()

  if (error || !productRow) {
    return NextResponse.json({ error: 'product not found' }, { status: 404 })
  }
  const product = productRow as Product

  const price =
    purchaseType === 'exclusive' ? product.price_exclusive : product.price_licensed
  if (!price || price <= 0) {
    return NextResponse.json(
      { error: `no ${purchaseType} price set for this product` },
      { status: 400 }
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

  const { data: userData } = await supabase.auth.getUser()
  const customerEmail = userData.user?.email

  const session = await stripe.checkout.sessions.create({
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
      buyer_id: userData.user?.id ?? '',
    },
  })

  if (!session.url) {
    return NextResponse.json({ error: 'stripe did not return a url' }, { status: 500 })
  }

  return NextResponse.redirect(session.url, { status: 303 })
}
