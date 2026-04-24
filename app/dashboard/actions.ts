'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('id, status, seller:sellers!inner(user_id)')
    .eq('id', id)
    .single()

  if (fetchErr || !product) throw new Error('Product not found')

  const seller = Array.isArray(product.seller) ? product.seller[0] : product.seller
  if (!seller || seller.user_id !== userData.user.id) {
    throw new Error('Not authorized')
  }

  const current = product.status as ProductStatus
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`Cannot move product from ${current} to ${next}`)
  }

  const { error } = await supabase
    .from('products')
    .update({ status: next })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/browse')
  revalidatePath(`/products/[slug]`, 'page')
}
