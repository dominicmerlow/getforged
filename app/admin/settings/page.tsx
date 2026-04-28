import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin'
import { getAllSettingsForAdmin } from '@/lib/settings'
import SettingRow from './SettingRow'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  let settings: Awaited<ReturnType<typeof getAllSettingsForAdmin>> = []
  let loadError: string | null = null
  try {
    settings = await getAllSettingsForAdmin()
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown read error'
  }

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Admin · Settings</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h1 className="section-title" style={{ fontSize: 'clamp(36px,4.5vw,56px)' }}>
              Site Settings
            </h1>
            <Link href="/admin" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: '#6b6b6b',
              textDecoration: 'underline',
            }}>
              ← Admin overview
            </Link>
          </div>

          <p style={{
            marginTop: 12,
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            opacity: 0.85,
          }}>
            Site-wide feature flags. Changes propagate within ~30 seconds.
          </p>

          {loadError && (
            <div style={{
              marginTop: 16,
              padding: 14,
              background: 'rgba(192,74,27,0.08)',
              border: '1px solid rgba(192,74,27,0.3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}>
              <strong>Couldn&apos;t load settings:</strong> {loadError}
              <br />
              Most likely cause: <code>010_settings.sql</code> migration hasn&apos;t been applied yet.
              The page below shows defaults.
            </div>
          )}

          <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
            {settings.map(s => (
              <SettingRow
                key={s.key}
                settingKey={s.key}
                description={s.description}
                kind={s.kind}
                currentValue={s.value}
                isOverride={s.isOverride}
              />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
