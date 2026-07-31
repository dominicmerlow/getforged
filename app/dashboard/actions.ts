'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products, sellers } from '@/db/schema'
import type { ProductStatus } from '@/lib/types'

const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['live', 'archived'],
  live: ['archived', 'draft'],
  archived: ['draft'],
}

export async function updateProductStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const next = String(formData.get('next') ?? '') as ProductStatus

  if (!id || !['draft', 'live', 'archived'].includes(next)) {
    throw new Error('Invalid request')
  }

  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db
    .select({ id: products.id, status: products.status, sellerUserId: sellers.userId })
    .from(products)
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .where(eq(products.id, id))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!row) throw new Error('Product not found')
  // Ownership is enforced here explicitly — this used to ride on the
  // `products_seller_all` RLS policy, which no longer exists.
  if (row.sellerUserId !== session.user.id) throw new Error('Not authorized')

  const current = row.status as ProductStatus
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`Cannot move product from ${current} to ${next}`)
  }

  await db.update(products).set({ status: next }).where(eq(products.id, id))

  revalidatePath('/dashboard')
  revalidatePath('/browse')
  revalidatePath(`/products/[slug]`, 'page')
}
