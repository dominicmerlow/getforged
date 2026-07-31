import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { sellers } from '@/db/schema'
import ProfileForm from './ProfileForm'

export const metadata: Metadata = { title: 'Edit Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const sellerRow = await db.query.sellers.findFirst({ where: eq(sellers.userId, session.user.id) })
  if (!sellerRow) redirect('/login')

  return (
    <>
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
            display_name={sellerRow.displayName ?? ''}
            bio={sellerRow.bio ?? null}
            avatar_url={sellerRow.avatarUrl ?? null}
          />
        </div>
      </main>
    </>
  )
}
