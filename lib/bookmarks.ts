'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { bookmarks } from '@/db/schema'

// Used by WishlistButton to render the correct initial state.
export async function isBookmarked(productId: string): Promise<boolean> {
  if (!dbConfigured()) return false
  const session = await auth()
  if (!session?.user?.id) return false
  const row = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, session.user.id), eq(bookmarks.productId, productId)),
  })
  return !!row
}

/**
 * All product IDs the current user has saved, in one query.
 *
 * Grids render dozens of cards. Calling `isBookmarked` per card would fire an
 * auth lookup plus a row lookup for every tile on the page — an N+1 that grows
 * with the catalogue. Callers fetch this once and pass a lookup down.
 *
 * Returns an array rather than a Set so the value crosses the server/client
 * boundary without relying on Set serialization.
 */
export async function getBookmarkedIds(): Promise<string[]> {
  if (!dbConfigured()) return []
  const session = await auth()
  if (!session?.user?.id) return []
  const rows = await db
    .select({ productId: bookmarks.productId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, session.user.id))
  return rows.map(r => r.productId)
}

export async function getBookmarkCount(): Promise<number> {
  if (!dbConfigured()) return 0
  const session = await auth()
  if (!session?.user?.id) return 0
  const rows = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(eq(bookmarks.userId, session.user.id))
  return rows.length
}

export async function toggleBookmark(formData: FormData) {
  const productId = String(formData.get('product_id') ?? '')
  const returnTo = String(formData.get('return_to') ?? '/')
  if (!productId) throw new Error('missing product_id')

  const session = await auth()
  if (!session?.user?.id) {
    // Not signed in — send them to /login with a redirect hint.
    revalidatePath(returnTo)
    return
  }

  const existing = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, session.user.id), eq(bookmarks.productId, productId)),
  })

  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id))
  } else {
    await db.insert(bookmarks).values({ userId: session.user.id, productId })
  }

  revalidatePath(returnTo)
  revalidatePath('/wishlist')
}
