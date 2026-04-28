'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ReviewState = { ok: true } | { error: string } | null

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const product_id = String(formData.get('product_id') ?? '')
  const rating = Number(formData.get('rating'))
  const body = String(formData.get('body') ?? '').trim()

  if (!product_id || !rating || rating < 1 || rating > 5) return { error: 'Rating (1–5) is required.' }
  if (body.length > 1000) return { error: 'Review must be under 1000 characters.' }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const { error } = await supabase
    .from('reviews')
    .insert({ product_id, buyer_id: userData.user.id, rating, body: body || null })

  if (error) {
    if (error.code === '23505') return { error: 'You have already reviewed this product.' }
    return { error: error.message }
  }

  revalidatePath(`/products/${formData.get('slug')}`)
  return { ok: true }
}

/**
 * Builder reply — only the seller of the reviewed product can post one.
 * Authorisation is enforced both in code (defensive) and via the RLS policy
 * `reviews_seller_reply` (migration 005). Posting a reply for the second
 * time updates the existing reply and bumps `seller_replied_at`.
 *
 * Pass empty body to clear/delete the reply.
 */
export type ReplyState = { ok: true } | { error: string } | null

export async function replyToReview(
  _prev: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  const reviewId = String(formData.get('review_id') ?? '')
  const productSlug = String(formData.get('slug') ?? '')
  const rawBody = String(formData.get('body') ?? '').trim()

  if (!reviewId) return { error: 'Missing review id.' }
  if (rawBody.length > 1500) return { error: 'Reply must be under 1500 characters.' }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  // Defensive ownership check — fetch the review's product → seller chain
  // and confirm the current user owns the seller row. RLS would also block
  // unauthorised updates, but failing here gives a cleaner UX message.
  const { data: review, error: lookupErr } = await supabase
    .from('reviews')
    .select('id, product_id, product:products!inner(seller_id, seller:sellers!inner(user_id))')
    .eq('id', reviewId)
    .maybeSingle()

  if (lookupErr || !review) return { error: 'Review not found.' }

  const product = Array.isArray(review.product) ? review.product[0] : review.product
  const seller = product && (Array.isArray(product.seller) ? product.seller[0] : product.seller)
  if (!seller || seller.user_id !== userData.user.id) {
    return { error: 'Only the seller of this product can reply.' }
  }

  // Empty body = clear the reply
  const replyBody = rawBody.length > 0 ? rawBody : null
  const repliedAt = rawBody.length > 0 ? new Date().toISOString() : null

  const { error: updErr } = await supabase
    .from('reviews')
    .update({ seller_reply: replyBody, seller_replied_at: repliedAt })
    .eq('id', reviewId)

  if (updErr) {
    // The most likely failure pre-migration is "column seller_reply does not
    // exist" — surface a graceful message so the seller can keep going.
    if (updErr.message?.toLowerCase().includes('column') && updErr.message?.toLowerCase().includes('seller_reply')) {
      return { error: 'Reply storage not yet enabled — apply migration 005_review_replies.sql.' }
    }
    return { error: updErr.message }
  }

  if (productSlug) revalidatePath(`/products/${productSlug}`)
  return { ok: true }
}
