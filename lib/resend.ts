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
