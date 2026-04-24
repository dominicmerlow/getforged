import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPurchaseReceiptEmail, sendSellerSaleNotification } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 500 })
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || secret.endsWith('...')) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not configured' },
      { status: 500 }
    )
  }

  const stripe = getStripe()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: `signature failed: ${msg}` }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: event.type })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata ?? {}
  const productId = metadata.product_id
  const purchaseType = metadata.purchase_type as 'licensed' | 'exclusive' | undefined
  const buyerId = metadata.buyer_id || null
  const productSlug = metadata.product_slug

  if (!productId || !purchaseType) {
    return NextResponse.json(
      { error: 'missing metadata', metadata },
      { status: 400 }
    )
  }

  const amountGBP = (session.amount_total ?? 0) / 100
  const buyerEmail =
    session.customer_details?.email ?? session.customer_email ?? null

  const supabase = await createServiceClient()

  const { data: existing } = await supabase
    .from('purchases')
    .select('id')
    .eq('stripe_payment_id', session.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  const { error: insertErr } = await supabase.from('purchases').insert({
    buyer_id: buyerId || null,
    product_id: productId,
    purchase_type: purchaseType,
    amount: amountGBP,
    stripe_payment_id: session.id,
  })

  if (insertErr) {
    await supabase.from('error_log').insert({
      scenario: 'stripe-webhook',
      payload: { session_id: session.id, metadata } as object,
      error_message: insertErr.message,
    })
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  if (buyerEmail && productSlug) {
    const { data: productRow } = await supabase
      .from('products')
      .select('title, price_licensed, price_exclusive, seller:sellers!inner(user_id, display_name)')
      .eq('id', productId)
      .maybeSingle()
    const title = productRow?.title ?? 'your new product'
    try {
      await sendPurchaseReceiptEmail(
        buyerEmail,
        title,
        purchaseType,
        amountGBP,
        productSlug
      )
    } catch (err) {
      await supabase.from('error_log').insert({
        scenario: 'stripe-webhook-email',
        payload: { session_id: session.id } as object,
        error_message: err instanceof Error ? err.message : 'unknown',
      })
    }

    // Notify seller of sale
    if (productRow) {
      const sellerObj = Array.isArray(productRow.seller) ? productRow.seller[0] : productRow.seller
      if (sellerObj) {
        try {
          const { data: sellerUser } = await supabase.auth.admin.getUserById(sellerObj.user_id)
          if (sellerUser?.user?.email) {
            await sendSellerSaleNotification(
              sellerUser.user.email,
              sellerObj.display_name,
              title,
              purchaseType as 'licensed' | 'exclusive',
              amountGBP,
              session.customer_email ?? buyerEmail,
            )
          }
        } catch (err) {
          await supabase.from('error_log').insert({
            scenario: 'stripe-webhook-seller-email',
            payload: { session_id: session.id } as object,
            error_message: err instanceof Error ? err.message : 'unknown',
          })
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
