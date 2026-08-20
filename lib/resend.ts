import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Fallback must sit on a domain verified in the Resend workspace the API key
// belongs to, or every send 403s — see .env.example. getforged.io is verified
// nowhere; the apex getbrian.xyz is.
const FROM = process.env.RESEND_FROM_EMAIL ?? 'getforged@getbrian.xyz'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforged.getbrian.xyz'

/**
 * What to do when RESEND_API_KEY is not set.
 *
 * Locally, log and carry on — a dev without a key should still be able to walk
 * the checkout. In production it is not a degraded mode, it is a silent
 * delivery failure that the caller then records as a success: the Stripe
 * webhook stamps `receiptSentAt` / `sellerNotifiedAt` on any non-throwing
 * return, so the buyer would get no receipt, the seller would never learn the
 * sale happened, and the purchase row would say both were delivered.
 *
 * Throwing leaves the timestamp NULL, writes an `error_log` row, and lets
 * Stripe's webhook retry re-attempt once the key is back.
 */
function mailerUnavailable(what: string, payload: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`RESEND_API_KEY is not set — cannot send ${what}`)
  }
  console.log(`[RESEND MOCK] ${what}`, payload)
}

export async function sendDraftReadyEmail(
  sellerEmail: string,
  sellerName: string,
  productTitle: string,
  productId: string
): Promise<void> {
  // /dashboard/products/[id] has no page — the editor lives at .../edit.
  // Without the suffix, the CTA in the first email every new seller receives
  // 404s.
  const reviewUrl = `${APP_URL}/dashboard/products/${productId}/edit`

  if (!resend) {
    mailerUnavailable('draft ready email', { sellerEmail, productTitle, reviewUrl })
    return
  }

  await resend.emails.send({
    from: `GetForged <${FROM}>`,
    to: sellerEmail,
    subject: `Your listing draft is ready: ${productTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #0c0b09; color: #f8f4ee;">
        <h1 style="font-size: 32px; color: #e8920a; margin-bottom: 8px;">Your draft is ready.</h1>
        <p style="color: #b8b0a4; margin-bottom: 24px;">Hey ${sellerName}, we've generated your AI sales page for <strong style="color: #f8f4ee;">${productTitle}</strong>. Review it, make any edits, then hit publish.</p>
        <a href="${reviewUrl}" style="display: inline-block; padding: 14px 28px; background: #e8920a; color: #0c0b09; font-weight: 700; text-decoration: none; border-radius: 3px; letter-spacing: 0.1em; text-transform: uppercase; font-size: 13px;">Review Your Listing →</a>
        <p style="color: #7a7670; font-size: 12px; margin-top: 40px;">GetForged · <a href="${APP_URL}" style="color: #7a7670;">getforged.getbrian.xyz</a></p>
      </div>
    `,
  })
}

export async function sendPurchaseReceiptEmail(
  buyerEmail: string,
  productTitle: string,
  purchaseType: 'licensed' | 'exclusive' | 'subscription',
  amountGBP: number,
  productSlug: string
): Promise<void> {
  const productUrl = `${APP_URL}/products/${productSlug}`
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
  }).format(amountGBP)
  const label =
    purchaseType === 'exclusive'
      ? 'exclusive buy-out'
      : purchaseType === 'subscription'
        ? 'subscription'
        : 'one-time licence'

  if (!resend) {
    mailerUnavailable('purchase receipt', { buyerEmail, productTitle, formattedAmount, label, productUrl })
    return
  }

  await resend.emails.send({
    from: `GetForged <${FROM}>`,
    to: buyerEmail,
    subject: `You bought ${productTitle} on GetForged`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #0c0b09; color: #f8f4ee;">
        <h1 style="font-size: 32px; color: #e8920a; margin-bottom: 8px;">You're in.</h1>
        <p style="color: #b8b0a4; margin-bottom: 24px;">Thanks for buying <strong style="color: #f8f4ee;">${productTitle}</strong> (${label}, ${formattedAmount}). The seller has been notified and will be in touch with access details shortly.</p>
        <a href="${productUrl}" style="display: inline-block; padding: 14px 28px; background: #e8920a; color: #0c0b09; font-weight: 700; text-decoration: none; border-radius: 3px; letter-spacing: 0.1em; text-transform: uppercase; font-size: 13px;">View Product →</a>
        <p style="color: #7a7670; font-size: 12px; margin-top: 40px;">GetForged · <a href="${APP_URL}" style="color: #7a7670;">getforged.getbrian.xyz</a></p>
      </div>
    `,
  })
}

export async function sendSellerSaleNotification(
  sellerEmail: string,
  sellerName: string,
  productTitle: string,
  purchaseType: 'licensed' | 'exclusive' | 'subscription',
  amountGBP: number,
  buyerEmail: string,
): Promise<void> {
  const dashboardUrl = `${APP_URL}/dashboard`
  const formattedAmount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(amountGBP)
  const label = purchaseType === 'exclusive' ? 'exclusive buy-out' : purchaseType === 'subscription' ? 'subscription' : 'one-time licence'

  if (!resend) {
    mailerUnavailable('seller sale notification', { sellerEmail, productTitle, formattedAmount, buyerEmail })
    return
  }

  await resend.emails.send({
    from: `GetForged <${FROM}>`,
    to: sellerEmail,
    subject: `💰 New sale: ${productTitle} (${formattedAmount})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #0c0b09; color: #f8f4ee;">
        <h1 style="font-size: 32px; color: #e8920a; margin-bottom: 8px;">You made a sale.</h1>
        <p style="color: #b8b0a4; margin-bottom: 8px;">Hey ${sellerName}, <strong style="color: #f8f4ee;">${productTitle}</strong> was just purchased as a ${label} for <strong style="color: #e8920a;">${formattedAmount}</strong>.</p>
        <p style="color: #b8b0a4; margin-bottom: 24px;">Buyer: ${buyerEmail}. Reach out to deliver access.</p>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; background: #e8920a; color: #0c0b09; font-weight: 700; text-decoration: none; letter-spacing: 0.1em; text-transform: uppercase; font-size: 13px;">View Dashboard →</a>
        <p style="color: #7a7670; font-size: 12px; margin-top: 40px;">GetForged · <a href="${APP_URL}" style="color: #7a7670;">getforged.getbrian.xyz</a></p>
      </div>
    `,
  })
}

export async function sendReviewRequestEmail(
  buyerEmail: string,
  productTitle: string,
  productSlug: string,
): Promise<void> {
  const productUrl = `${APP_URL}/products/${productSlug}`

  if (!resend) {
    mailerUnavailable('review request', { buyerEmail, productTitle, productUrl })
    return
  }

  await resend.emails.send({
    from: `GetForged <${FROM}>`,
    to: buyerEmail,
    subject: `How's ${productTitle} working for you?`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #0c0b09; color: #f8f4ee;">
        <h1 style="font-size: 28px; color: #e8920a; margin-bottom: 8px;">Quick question.</h1>
        <p style="color: #b8b0a4; margin-bottom: 24px;">You bought <strong style="color: #f8f4ee;">${productTitle}</strong> recently. Got 30 seconds to leave a review? It helps other builders and keeps the marketplace honest.</p>
        <a href="${productUrl}#reviews" style="display: inline-block; padding: 14px 28px; background: #e8920a; color: #0c0b09; font-weight: 700; text-decoration: none; letter-spacing: 0.1em; text-transform: uppercase; font-size: 13px;">Leave a Review →</a>
        <p style="color: #7a7670; font-size: 12px; margin-top: 40px;">GetForged · <a href="${APP_URL}" style="color: #7a7670;">getforged.getbrian.xyz</a></p>
      </div>
    `,
  })
}
