'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Used by WishlistButton to render the correct initial state.
export async function isBookmarked(productId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return false
  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('product_id', productId)
    .maybeSingle()
  return !!data
}

export async function getBookmarkCount(): Promise<number> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return 0
  const { count } = await supabase
    .from('bookmarks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id)
  return count ?? 0
}

export async function toggleBookmark(formData: FormData) {
  const productId = String(formData.get('product_id') ?? '')
  const returnTo = String(formData.get('return_to') ?? '/')
  if (!productId) throw new Error('missing product_id')

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    // Not signed in — send them to /login with a redirect hint.
    revalidatePath(returnTo)
    return
  }

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    await supabase.from('bookmarks').delete().eq('id', existing.id)
  } else {
    await supabase.from('bookmarks').insert({
      user_id: userData.user.id,
      product_id: productId,
    })
  }

  revalidatePath(returnTo)
  revalidatePath('/wishlist')
}
