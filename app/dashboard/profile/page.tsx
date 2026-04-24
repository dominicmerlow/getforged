import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import ProfileForm from './ProfileForm'

export const metadata: Metadata = { title: 'Edit Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const { data: sellerRow } = await supabase
    .from('sellers')
    .select('id, display_name, bio, avatar_url, verified, created_at')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!sellerRow) redirect('/login')

  return (
    <>
      <Nav />
      <main style={{ minHeight: '70vh', padding: 'clamp(40px,6vw,80px) clamp(20px,5vw,80px)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 32 }}>
          <div>
            <div className="section-tag">Account</div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(28px,4vw,44px)',
                margin: '8px 0 0',
                fontWeight: 700,
              }}
            >
              Edit Profile
            </h1>
            {sellerRow.verified && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: '#b97314',
                  color: '#fff',
                  padding: '4px 10px',
                }}
              >
                ✓ Verified Builder
              </span>
            )}
          </div>

          <ProfileForm
            display_name={sellerRow.display_name ?? ''}
            bio={sellerRow.bio ?? null}
            avatar_url={sellerRow.avatar_url ?? null}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
