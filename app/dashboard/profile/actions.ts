'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { sellers } from '@/db/schema'

export type ProfileState = { ok: true } | { error: string } | null

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const displayName = String(formData.get('display_name') ?? '').trim()
  const bio = String(formData.get('bio') ?? '').trim()
  const avatarUrl = String(formData.get('avatar_url') ?? '').trim() || null

  if (!displayName) return { error: 'Display name is required.' }

  const session = await auth()
  if (!session?.user) redirect('/login')

  try {
    await db.update(sellers)
      .set({ displayName, bio: bio || null, avatarUrl })
      .where(eq(sellers.userId, session.user.id))
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save profile.' }
  }

  revalidatePath('/dashboard')
  return { ok: true }
}
