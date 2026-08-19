'use server'

import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products, sellers, users, messages } from '@/db/schema'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
// Same constraint as lib/resend.ts: the fallback has to be on the verified
// domain (apex getbrian.xyz) or Resend rejects the send with a 403.
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'getforged@getbrian.xyz'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforged.getbrian.xyz'

export type ContactState =
  | { error: string }
  | { ok: true }
  | null

export async function sendSellerMessage(
  productId: string,
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot — bots fill hidden fields eagerly, humans don't.
  const honeypot = String(formData.get('website') ?? '')
  if (honeypot.trim()) return { ok: true } // silently "succeed" — no email sent

  const ip = await getClientIp()
  const allowed = await checkRateLimit({ bucket: 'contact', identifier: ip, limit: 5, windowSeconds: 3600 })
  if (!allowed) return { error: 'Too many messages sent. Please try again later.' }

  const senderName = String(formData.get('sender_name') ?? '').trim()
  const senderEmail = String(formData.get('sender_email') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()

  if (!senderName) return { error: 'Enter your name.' }
  if (!senderEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail)) {
    return { error: 'Enter a valid email address.' }
  }
  if (body.length < 10) return { error: 'Message must be at least 10 characters.' }
  if (body.length > 4000) return { error: 'Message is too long (max 4000 characters).' }

  const row = await db
    .select({
      productId: products.id, title: products.title, slug: products.slug,
      sellerId: sellers.id, sellerUserId: sellers.userId,
    })
    .from(products)
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .where(eq(products.id, productId))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!row) return { error: 'Product not found.' }

  const sellerUser = await db.query.users.findFirst({
    where: eq(users.id, row.sellerUserId),
    columns: { email: true },
  })
  const sellerEmail = sellerUser?.email ?? null

  // Capture the (optional) authed sender's user id so sellers can see history
  const session = await auth()
  const senderUserId = session?.user?.id ?? null

  // Persist the message regardless of whether we can email — it'll show up
  // for the seller if we ever build an inbox UI.
  try {
    await db.insert(messages).values({
      productId: row.productId,
      sellerId: row.sellerId,
      senderUserId,
      senderName,
      senderEmail,
      body,
    })
  } catch (err) {
    console.error('[contact] message insert failed:', err instanceof Error ? err.message : err)
  }

  // Pipe to seller's inbox via Resend
  if (RESEND_API_KEY && sellerEmail) {
    try {
      const resend = new Resend(RESEND_API_KEY)
      const productUrl = row.slug
        ? `${APP_URL}/products/${row.slug}`
        : `${APP_URL}/products`

      await resend.emails.send({
        from: `GetForged <${RESEND_FROM}>`,
        to: sellerEmail,
        replyTo: senderEmail,
        subject: `New enquiry about ${row.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="font-size: 22px; margin: 0 0 16px;">New enquiry about <strong>${escapeHtml(row.title)}</strong></h2>
            <p style="margin: 0 0 8px; color: #444;">
              From <strong>${escapeHtml(senderName)}</strong> &lt;${escapeHtml(senderEmail)}&gt;
            </p>
            <p style="margin: 0 0 24px; color: #666; font-size: 13px;">
              Hit Reply to respond directly. Your reply goes to the sender, not to GetForged.
            </p>
            <blockquote style="margin: 0 0 24px; padding: 16px 20px; border-left: 3px solid #b97314; background: #f7f2e8; font-size: 15px; line-height: 1.5; color: #2a2217;">
              ${escapeHtml(body).replace(/\n/g, '<br />')}
            </blockquote>
            <p style="margin: 0; color: #888; font-size: 12px;">
              <a href="${productUrl}" style="color: #b97314;">View product on GetForged →</a>
            </p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[contact] Resend send failed:', err)
      // The row is already saved, so the seller will still see it if we build
      // an inbox. Don't fail the whole action for email transport errors.
    }
  }

  return { ok: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
