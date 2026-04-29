import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPurchaseReceiptEmail, sendSellerSaleNotification } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Postgres unique-violation SQLSTATE.
const PG_UNIQUE_VIOLATION = '23505'

type PurchaseRow = {
  id: string
  receipt_sent_at: string | null
  seller_notified_at: string | null
}

export async function POST(request: NextRequest) {
  // ── Configuration errors are 500 (Stripe will retry; we want it to retry
  //    once we've fixed config, not give up).
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

  // ── Signature failures are permanent: 400 tells Stripe to stop retrying.
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

  // ── Event types we don't handle: 200 + ignored. Stripe stops retrying.
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: event.type })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata ?? {}
  const productId = metadata.product_id
  const purchaseType = metadata.purchase_type as 'licensed' | 'exclusive' | undefined
  const buyerId = metadata.buyer_id || null
  const productSlug = metadata.product_slug

  // ── Validation failure on event payload: permanent. 200 + ignored so Stripe
  //    stops retrying. Log to error_log so we notice if real events lack metadata.
  if (!productId || !purchaseType) {
    const supabase = await createServiceClient()
    await supabase.from('error_log').insert({
      scenario: 'stripe-webhook-bad-metadata',
      payload: { session_id: session.id, metadata } as object,
      error_message: 'missing product_id or purchase_type in session metadata',
    })
    return NextResponse.json({ received: true, ignored: 'missing metadata' })
  }

  const amountGBP = (session.amount_total ?? 0) / 100
  const buyerEmail =
    session.customer_details?.email ?? session.customer_email ?? null

  const supabase = await createServiceClient()

  // ── Idempotent INSERT. The partial unique index on stripe_payment_id makes
  //    this atomic — concurrent retries can't both succeed. On unique-violation
  //    (23505) we read the existing row to drive email idempotency.
  let purchase: PurchaseRow | null = null

  const { data: inserted, error: insertErr } = await supabase
    .from('purchases')
    .insert({
      buyer_id: buyerId || null,
      product_id: productId,
      purchase_type: purchaseType,
      amount: amountGBP,
      stripe_payment_id: session.id,
      // receipt_sent_at and seller_notified_at intentionally left NULL —
      // emails are sent below and timestamps recorded only on success.
    })
    .select('id, receipt_sent_at, seller_notified_at')
    .single()

  if (insertErr) {
    if (insertErr.code === PG_UNIQUE_VIOLATION) {
      // Duplicate retry. Read the existing row to determine which emails
      // (if any) still need to be sent.
      const { data: existing, error: selectErr } = await supabase
        .from('purchases')
        .select('id, receipt_sent_at, seller_notified_at')
        .eq('stripe_payment_id', session.id)
        .maybeSingle()

      if (selectErr || !existing) {
        // Genuinely transient — couldn't read the row we know exists. Ask Stripe to retry.
        await supabase.from('error_log').insert({
          scenario: 'stripe-webhook-duplicate-readback-failed',
          payload: { session_id: session.id } as object,
          error_message: selectErr?.message ?? 'row vanished after unique violation',
        })
        return NextResponse.json(
          { error: 'failed to read existing purchase' },
          { status: 500 }
        )
      }
      purchase = existing as PurchaseRow
    } else {
      // Real DB write failure — 500 so Stripe retries.
      await supabase.from('error_log').insert({
        scenario: 'stripe-webhook',
        payload: { session_id: session.id, metadata } as object,
        error_message: insertErr.message,
      })
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }
  } else {
    purchase = inserted as PurchaseRow
  }

  // ── Email idempotency. Each email is independently gated on its own
  //    timestamp column. A failure leaves the timestamp NULL so the next
  //    Stripe retry resends; success stamps it so we never double-send.
  //    NOTE: even if emails fail, we return 200. The purchase row exists;
  //    we won't ask Stripe to retry just for email delivery (Resend's job).
  if (buyerEmail && productSlug && purchase) {
    const needsBuyerReceipt = purchase.receipt_sent_at === null
    const needsSellerNotice = purchase.seller_notified_at === null

    if (needsBuyerReceipt || needsSellerNotice) {
      const { data: productRow } = await supabase
        .from('products')
        .select('title, price_licensed, price_exclusive, seller:sellers!inner(user_id, display_name)')
        .eq('id', productId)
        .maybeSingle()

      const title = productRow?.title ?? 'your new product'

      // ── Buyer receipt
      if (needsBuyerReceipt) {
        try {
          await sendPurchaseReceiptEmail(
            buyerEmail,
            title,
            purchaseType,
            amountGBP,
            productSlug
          )
          // Stamp only on success. If this UPDATE itself fails, we accept the
          // (rare) risk of a duplicate receipt on the next retry — better than
          // marking sent before delivery confirmed.
          const { error: stampErr } = await supabase
            .from('purchases')
            .update({ receipt_sent_at: new Date().toISOString() })
            .eq('id', purchase.id)
          if (stampErr) {
            await supabase.from('error_log').insert({
              scenario: 'stripe-webhook-receipt-stamp-failed',
              payload: { session_id: session.id, purchase_id: purchase.id } as object,
              error_message: stampErr.message,
            })
          }
        } catch (err) {
          // Email send failed — leave receipt_sent_at NULL so the next retry tries again.
          await supabase.from('error_log').insert({
            scenario: 'stripe-webhook-email',
            payload: { session_id: session.id } as object,
            error_message: err instanceof Error ? err.message : 'unknown',
          })
        }
      }

      // ── Seller notification
      if (needsSellerNotice && productRow) {
        const sellerObj = Array.isArray(productRow.seller) ? productRow.seller[0] : productRow.seller
        if (sellerObj) {
          try {
            const { data: sellerUser } = await supabase.auth.admin.getUserById(sellerObj.user_id)
            if (sellerUser?.user?.email) {
              await sendSellerSaleNotification(
                sellerUser.user.email,
                sellerObj.display_name,
                title,
                purchaseType,
                amountGBP,
                session.customer_email ?? buyerEmail,
              )
              const { error: stampErr } = await supabase
                .from('purchases')
                .update({ seller_notified_at: new Date().toISOString() })
                .eq('id', purchase.id)
              if (stampErr) {
                await supabase.from('error_log').insert({
                  scenario: 'stripe-webhook-seller-stamp-failed',
                  payload: { session_id: session.id, purchase_id: purchase.id } as object,
                  error_message: stampErr.message,
                })
              }
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
  }

  return NextResponse.json({ received: true })
}
