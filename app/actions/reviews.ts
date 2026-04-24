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
