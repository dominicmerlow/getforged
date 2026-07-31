import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import { db } from '@/lib/db'
import { errorLog, purchases, products, sellers, users } from '@/db/schema'
import { sendPurchaseReceiptEmail, sendSellerSaleNotification, sendReviewRequestEmail } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Postgres unique-violation SQLSTATE.
const PG_UNIQUE_VIOLATION = '23505'

type PurchaseRow = {
  id: string
  receiptSentAt: Date | null
  sellerNotifiedAt: Date | null
  reviewRequestSentAt: Date | null
}

async function logError(scenario: string, payload: object, message: string) {
  try {
    await db.insert(errorLog).values({ scenario, payload, errorMessage: message })
  } catch (err) {
    // The error log itself failing is not worth failing the request over —
    // it's already best-effort diagnostics, not a correctness path.
    console.error('[stripe-webhook] error_log insert failed:', err instanceof Error ? err.message : err)
  }
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
    await logError(
      'stripe-webhook-bad-metadata',
      { session_id: session.id, metadata },
      'missing product_id or purchase_type in session metadata'
    )
    return NextResponse.json({ received: true, ignored: 'missing metadata' })
  }

  const amountGBP = (session.amount_total ?? 0) / 100
  const buyerEmail =
    session.customer_details?.email ?? session.customer_email ?? null

  // ── Idempotent INSERT. The partial unique index on stripePaymentId makes
  //    this atomic — concurrent retries can't both succeed. On unique-violation
  //    (23505) we read the existing row to drive email idempotency.
  let purchase: PurchaseRow | null = null

  try {
    const [inserted] = await db
      .insert(purchases)
      .values({
        buyerId: buyerId || null,
        productId,
        purchaseType,
        amount: amountGBP,
        stripePaymentId: session.id,
        // receiptSentAt, sellerNotifiedAt and reviewRequestSentAt
        // intentionally left NULL — emails are sent below and timestamps
        // recorded only on success.
      })
      .returning({
        id: purchases.id,
        receiptSentAt: purchases.receiptSentAt,
        sellerNotifiedAt: purchases.sellerNotifiedAt,
        reviewRequestSentAt: purchases.reviewRequestSentAt,
      })
    purchase = inserted
  } catch (insertErr) {
    const code = insertErr && typeof insertErr === 'object' && 'code' in insertErr ? (insertErr as { code?: string }).code : undefined
    if (code === PG_UNIQUE_VIOLATION) {
      // Duplicate retry. Read the existing row to determine which emails
      // (if any) still need to be sent.
      const existing = await db.query.purchases.findFirst({
        where: eq(purchases.stripePaymentId, session.id),
        columns: { id: true, receiptSentAt: true, sellerNotifiedAt: true, reviewRequestSentAt: true },
      })

      if (!existing) {
        // Genuinely transient — couldn't read the row we know exists. Ask Stripe to retry.
        await logError(
          'stripe-webhook-duplicate-readback-failed',
          { session_id: session.id },
          'row vanished after unique violation'
        )
        return NextResponse.json(
          { error: 'failed to read existing purchase' },
          { status: 500 }
        )
      }
      purchase = existing
    } else {
      // Real DB write failure — 500 so Stripe retries.
      const msg = insertErr instanceof Error ? insertErr.message : 'unknown insert error'
      await logError('stripe-webhook', { session_id: session.id, metadata }, msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // ── Email idempotency. Each email is independently gated on its own
  //    timestamp column. A failure leaves the timestamp NULL so the next
  //    Stripe retry resends; success stamps it so we never double-send.
  //    NOTE: even if emails fail, we return 200. The purchase row exists;
  //    we won't ask Stripe to retry just for email delivery (Resend's job).
  if (buyerEmail && productSlug && purchase) {
    const needsBuyerReceipt = purchase.receiptSentAt === null
    const needsSellerNotice = purchase.sellerNotifiedAt === null
    const needsReviewRequest = purchase.reviewRequestSentAt === null

    if (needsBuyerReceipt || needsSellerNotice || needsReviewRequest) {
      const productRow = await db
        .select({ title: products.title, sellerUserId: sellers.userId, sellerDisplayName: sellers.displayName })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(eq(products.id, productId))
        .limit(1)
        .then(rows => rows[0] ?? null)

      const title = productRow?.title ?? 'your new product'

      // ── Buyer receipt
      if (needsBuyerReceipt) {
        try {
          await sendPurchaseReceiptEmail(buyerEmail, title, purchaseType, amountGBP, productSlug)
          // Stamp only on success. If this UPDATE itself fails, we accept the
          // (rare) risk of a duplicate receipt on the next retry — better than
          // marking sent before delivery confirmed.
          try {
            await db.update(purchases).set({ receiptSentAt: new Date() }).where(eq(purchases.id, purchase.id))
          } catch (stampErr) {
            await logError(
              'stripe-webhook-receipt-stamp-failed',
              { session_id: session.id, purchase_id: purchase.id },
              stampErr instanceof Error ? stampErr.message : 'unknown'
            )
          }
        } catch (err) {
          // Email send failed — leave receiptSentAt NULL so the next retry tries again.
          await logError('stripe-webhook-email', { session_id: session.id }, err instanceof Error ? err.message : 'unknown')
        }
      }

      // ── Seller notification
      if (needsSellerNotice && productRow) {
        try {
          const sellerUser = await db.query.users.findFirst({
            where: eq(users.id, productRow.sellerUserId),
            columns: { email: true },
          })
          if (sellerUser?.email) {
            await sendSellerSaleNotification(
              sellerUser.email,
              productRow.sellerDisplayName,
              title,
              purchaseType,
              amountGBP,
              session.customer_email ?? buyerEmail,
            )
            try {
              await db.update(purchases).set({ sellerNotifiedAt: new Date() }).where(eq(purchases.id, purchase.id))
            } catch (stampErr) {
              await logError(
                'stripe-webhook-seller-stamp-failed',
                { session_id: session.id, purchase_id: purchase.id },
                stampErr instanceof Error ? stampErr.message : 'unknown'
              )
            }
          }
        } catch (err) {
          await logError('stripe-webhook-seller-email', { session_id: session.id }, err instanceof Error ? err.message : 'unknown')
        }
      }

      // ── Review request. Ideally this would be delayed a few days after
      //    delivery rather than fired alongside the receipt, but there's no
      //    scheduled-job infra yet — sending immediately beats never sending
      //    at all.
      if (needsReviewRequest) {
        try {
          await sendReviewRequestEmail(buyerEmail, title, productSlug)
          try {
            await db.update(purchases).set({ reviewRequestSentAt: new Date() }).where(eq(purchases.id, purchase.id))
          } catch (stampErr) {
            await logError(
              'stripe-webhook-review-request-stamp-failed',
              { session_id: session.id, purchase_id: purchase.id },
              stampErr instanceof Error ? stampErr.message : 'unknown'
            )
          }
        } catch (err) {
          await logError('stripe-webhook-review-request-email', { session_id: session.id }, err instanceof Error ? err.message : 'unknown')
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
