'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'

function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function adminUpdateStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && userData.user.email !== adminEmail) redirect('/')

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !['live', 'archived'].includes(status)) return

  const adminDb = createAdminClient()
  await adminDb.from('products').update({ status }).eq('id', id)

  revalidatePath('/admin')
  revalidatePath('/browse')
}
