'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { reviews, purchases, products, sellers } from '@/db/schema'

export type ReviewState = { ok: true } | { error: string } | null

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === '23505'
}

export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const product_id = String(formData.get('product_id') ?? '')
  const rating = Number(formData.get('rating'))
  const body = String(formData.get('body') ?? '').trim()

  if (!product_id || !rating || rating < 1 || rating > 5) return { error: 'Rating (1–5) is required.' }
  if (body.length > 1000) return { error: 'Review must be under 1000 characters.' }

  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // This used to be enforced entirely by the `reviews_buyer_insert` RLS
  // policy ("buyer_id in (select buyer_id from purchases where product_id =
  // reviews.product_id)"). With no RLS, that check has to happen here — this
  // is the one line standing between "verified buyer review" and "anyone can
  // review anything."
  const purchase = await db.query.purchases.findFirst({
    where: and(eq(purchases.productId, product_id), eq(purchases.buyerId, session.user.id)),
  })
  if (!purchase) return { error: 'Only verified buyers can leave a review.' }

  try {
    await db.insert(reviews).values({
      productId: product_id,
      buyerId: session.user.id,
      rating,
      body: body || null,
    })
  } catch (err) {
    if (isUniqueViolation(err)) return { error: 'You have already reviewed this product.' }
    return { error: err instanceof Error ? err.message : 'Could not save your review.' }
  }

  revalidatePath(`/products/${formData.get('slug')}`)
  return { ok: true }
}

/**
 * Builder reply — only the seller of the reviewed product can post one.
 * Authorisation is enforced here in code — there is no RLS backstop anymore,
 * so this ownership check IS the security boundary, not a defensive extra.
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

  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const row = await db
    .select({ reviewId: reviews.id, sellerUserId: sellers.userId })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .innerJoin(sellers, eq(sellers.id, products.sellerId))
    .where(eq(reviews.id, reviewId))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!row) return { error: 'Review not found.' }
  if (row.sellerUserId !== session.user.id) {
    return { error: 'Only the seller of this product can reply.' }
  }

  // Empty body = clear the reply
  const replyBody = rawBody.length > 0 ? rawBody : null
  const repliedAt = rawBody.length > 0 ? new Date() : null

  await db.update(reviews)
    .set({ sellerReply: replyBody, sellerRepliedAt: repliedAt })
    .where(eq(reviews.id, reviewId))

  if (productSlug) revalidatePath(`/products/${productSlug}`)
  return { ok: true }
}
