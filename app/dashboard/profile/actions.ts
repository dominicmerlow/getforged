'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ProfileState = { ok: true } | { error: string } | null

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const display_name = String(formData.get('display_name') ?? '').trim()
  const bio = String(formData.get('bio') ?? '').trim()
  const avatar_url = String(formData.get('avatar_url') ?? '').trim() || null

  if (!display_name) return { error: 'Display name is required.' }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const { error } = await supabase
    .from('sellers')
    .update({ display_name, bio: bio || null, avatar_url })
    .eq('user_id', userData.user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { ok: true }
}
