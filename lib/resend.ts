import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@getforged.io'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforged.io'

export async function sendDraftReadyEmail(
  sellerEmail: string,
  sellerName: string,
  productTitle: string,
  productId: string
): Promise<void> {
  const reviewUrl = `${APP_URL}/dashboard/products/${productId}`

  if (!resend) {
    // Dev fallback: just log
    console.log(`[RESEND MOCK] Draft ready email → ${sellerEmail}`, { productTitle, reviewUrl })
    return
  }

  await resend.emails.send({
    from: `GetForged <${FROM}>`,
    to: sellerEmail,
    subject: `Your listing draft is ready — ${productTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #0c0b09; color: #f8f4ee;">
        <h1 style="font-size: 32px; color: #e8920a; margin-bottom: 8px;">Your draft is ready.</h1>
        <p style="color: #b8b0a4; margin-bottom: 24px;">Hey ${sellerName}, we've generated your AI sales page for <strong style="color: #f8f4ee;">${productTitle}</strong>. Review it, make any edits, then hit publish.</p>
        <a href="${reviewUrl}" style="display: inline-block; padding: 14px 28px; background: #e8920a; color: #0c0b09; font-weight: 700; text-decoration: none; border-radius: 3px; letter-spacing: 0.1em; text-transform: uppercase; font-size: 13px;">Review Your Listing →</a>
        <p style="color: #7a7670; font-size: 12px; margin-top: 40px;">GetForged · <a href="${APP_URL}" style="color: #7a7670;">getforged.io</a></p>
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
    console.log(`[RESEND MOCK] Purchase receipt → ${buyerEmail}`, {
      productTitle,
      formattedAmount,
      label,
      productUrl,
    })
    return
  }

  await resend.emails.send({
    from: `GetForged <${FROM}>`,
    to: buyerEmail,
    subject: `You bought ${productTitle} on FORGE`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #0c0b09; color: #f8f4ee;">
        <h1 style="font-size: 32px; color: #e8920a; margin-bottom: 8px;">You're in.</h1>
        <p style="color: #b8b0a4; margin-bottom: 24px;">Thanks for buying <strong style="color: #f8f4ee;">${productTitle}</strong> (${label}, ${formattedAmount}). The seller has been notified and will be in touch with access details shortly.</p>
        <a href="${productUrl}" style="display: inline-block; padding: 14px 28px; background: #e8920a; color: #0c0b09; font-weight: 700; text-decoration: none; border-radius: 3px; letter-spacing: 0.1em; text-transform: uppercase; font-size: 13px;">View Product →</a>
        <p style="color: #7a7670; font-size: 12px; margin-top: 40px;">GetForged · <a href="${APP_URL}" style="color: #7a7670;">getforged.io</a></p>
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
    console.log(`[RESEND MOCK] Seller sale notification → ${sellerEmail}`, { productTitle, formattedAmount, buyerEmail })
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
        <p style="color: #7a7670; font-size: 12px; margin-top: 40px;">GetForged · <a href="${APP_URL}" style="color: #7a7670;">getforged.io</a></p>
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
    console.log(`[RESEND MOCK] Review request → ${buyerEmail}`, { productTitle, productUrl })
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
        <p style="color: #7a7670; font-size: 12px; margin-top: 40px;">GetForged · <a href="${APP_URL}" style="color: #7a7670;">getforged.io</a></p>
      </div>
    `,
  })
}
