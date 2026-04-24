'use server'

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@getforged.io'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforged.vercel.app'

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

  const senderName = String(formData.get('sender_name') ?? '').trim()
  const senderEmail = String(formData.get('sender_email') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()

  if (!senderName) return { error: 'Enter your name.' }
  if (!senderEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(senderEmail)) {
    return { error: 'Enter a valid email address.' }
  }
  if (body.length < 10) return { error: 'Message must be at least 10 characters.' }
  if (body.length > 4000) return { error: 'Message is too long (max 4000 characters).' }

  // Look up product + seller (service role bypasses RLS so we can reach auth.users)
  const service = await createServiceClient()

  const { data: productRow, error: prodErr } = await service
    .from('products')
    .select('id, title, slug, seller_id, seller:sellers!inner(id, user_id, display_name)')
    .eq('id', productId)
    .maybeSingle()

  if (prodErr || !productRow) return { error: 'Product not found.' }
  type SellerJoin = { id: string; user_id: string; display_name: string }
  const seller: SellerJoin | undefined = Array.isArray(productRow.seller)
    ? productRow.seller[0]
    : productRow.seller as SellerJoin | undefined
  if (!seller) return { error: 'Seller not found.' }

  // Resolve seller's email via admin API
  let sellerEmail: string | null = null
  try {
    const { data: authUser } = await service.auth.admin.getUserById(seller.user_id)
    sellerEmail = authUser.user?.email ?? null
  } catch {
    sellerEmail = null
  }

  // Capture the (optional) authed sender user_id so sellers can see history
  const client = await createClient()
  const { data: userData } = await client.auth.getUser()
  const senderUserId = userData.user?.id ?? null

  // Persist the message regardless of whether we can email — it'll show up
  // for the seller if we ever build an inbox UI.
  const { error: insertErr } = await service.from('messages').insert({
    product_id: productRow.id,
    seller_id: seller.id,
    sender_user_id: senderUserId,
    sender_name: senderName,
    sender_email: senderEmail,
    body,
  })
  if (insertErr) {
    console.error('[contact] message insert failed:', insertErr)
  }

  // Pipe to seller's inbox via Resend
  if (RESEND_API_KEY && sellerEmail) {
    try {
      const resend = new Resend(RESEND_API_KEY)
      const productUrl = productRow.slug
        ? `${APP_URL}/products/${productRow.slug}`
        : `${APP_URL}/products`

      await resend.emails.send({
        from: `GetForged <${RESEND_FROM}>`,
        to: sellerEmail,
        replyTo: senderEmail,
        subject: `New enquiry about ${productRow.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="font-size: 22px; margin: 0 0 16px;">New enquiry about <strong>${escapeHtml(productRow.title)}</strong></h2>
            <p style="margin: 0 0 8px; color: #444;">
              From <strong>${escapeHtml(senderName)}</strong> &lt;${escapeHtml(senderEmail)}&gt;
            </p>
            <p style="margin: 0 0 24px; color: #666; font-size: 13px;">
              Hit Reply to respond directly — your reply goes to the sender, not to GetForged.
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
