import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, getUserRole } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint — shows what Supabase auth knows about the current
 * session and whether the admin gate accepts it.
 *
 * Used to debug "I logged in but /admin redirects me" cases — the most
 * common cause is OAuth providers returning a different email (e.g.
 * GitHub email-privacy noreply aliases) than the user's profile email.
 *
 * Requires sign-in but NOT admin access — a locked-out user needs this page
 * precisely because they aren't recognized as admin yet. It only ever shows
 * the signed-in user's OWN session data (id/email/provider/role), never the
 * raw ADMIN_EMAIL allowlist — that's what made the pre-fix version a leak
 * (any signed-in user could read every admin's email off it).
 */
export default async function WhoAmIPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  if (!user) redirect('/login')

  const isAdmin = isAdminEmail(user.email)
  const dbRole = await getUserRole(user.id)

  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 720 }}>
          <div className="section-tag">Whoami</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(32px,4.5vw,56px)' }}>
            Session diagnostic
          </h1>

          <dl style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '12px 24px',
            fontFamily: 'var(--font-mono)',
            fontSize: 14,
            maxWidth: 640,
          }}>
            <dt style={{ color: '#6b6b6b' }}>Auth user ID</dt>
            <dd style={{ margin: 0, wordBreak: 'break-all' }}>{user.id}</dd>

            <dt style={{ color: '#6b6b6b' }}>Auth email</dt>
            <dd style={{ margin: 0, wordBreak: 'break-all', fontWeight: 600 }}>
              {user.email ?? '(none)'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>Provider</dt>
            <dd style={{ margin: 0 }}>
              {(user.app_metadata?.provider as string | undefined) ?? '(unknown)'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>All providers</dt>
            <dd style={{ margin: 0 }}>
              {((user.app_metadata?.providers as string[] | undefined) ?? []).join(', ') || '(none)'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>GitHub login</dt>
            <dd style={{ margin: 0 }}>
              {(user.user_metadata?.user_name as string | undefined) ?? (user.user_metadata?.preferred_username as string | undefined) ?? '(n/a)'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>Display name</dt>
            <dd style={{ margin: 0 }}>
              {(user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? '(n/a)'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>Email confirmed?</dt>
            <dd style={{ margin: 0 }}>
              {user.email_confirmed_at ? `✓ ${user.email_confirmed_at}` : '✗ no'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>Your email in ADMIN_EMAIL?</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {isAdmin ? '✓ Yes' : '✗ No'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>DB role (user_roles)</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {dbRole ? (
                <span style={{
                  padding: '2px 8px',
                  background: 'var(--soft-amber, #b97314)',
                  color: '#fff',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>{dbRole}</span>
              ) : (
                <span style={{ color: '#6b6b6b' }}>(none)</span>
              )}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>Admin gate result</dt>
            <dd style={{ margin: 0, fontWeight: 700, color: (isAdmin || dbRole) ? '#3fa85a' : '#c87d1a' }}>
              {(isAdmin || dbRole) ? `✓ Admin (gate passes via ${dbRole ? 'DB role' : 'ADMIN_EMAIL'})` : '✗ Not admin (gate redirects)'}
            </dd>
          </dl>

          <div style={{
            marginTop: 32,
            padding: 16,
            background: 'rgba(232,146,10,0.08)',
            border: '1px solid rgba(232,146,10,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            <strong>If gate fails:</strong> copy the &ldquo;Auth email&rdquo; value above
            and either add it to your Vercel <code>ADMIN_EMAIL</code> env var
            (comma-separated, then redeploy), or ask an existing admin to grant
            you a role from <code>/admin/users</code>.
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
