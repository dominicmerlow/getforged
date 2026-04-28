import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint — shows what Supabase auth knows about the current
 * session and whether the admin gate accepts that email.
 *
 * Used to debug "I logged in but /admin redirects me" cases — the most
 * common cause is OAuth providers returning a different email (e.g.
 * GitHub email-privacy noreply aliases) than the user's profile email.
 *
 * No PII concerns — only the user themselves can see their own data here,
 * since the page is server-rendered against their session cookie.
 */
export default async function WhoAmIPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  const adminEmailEnv = process.env.ADMIN_EMAIL ?? '(not set)'
  const isAdmin = user ? isAdminEmail(user.email) : false

  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 720 }}>
          <div className="section-tag">Whoami</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(32px,4.5vw,56px)' }}>
            Session diagnostic
          </h1>

          {!user ? (
            <p style={{ marginTop: 24, fontFamily: 'var(--font-serif)', fontSize: 18 }}>
              No active session. <a href="/login" style={{ color: 'var(--soft-amber, #b97314)', textDecoration: 'underline' }}>Sign in →</a>
            </p>
          ) : (
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

              <dt style={{ color: '#6b6b6b' }}>ADMIN_EMAIL env</dt>
              <dd style={{ margin: 0, wordBreak: 'break-all' }}>{adminEmailEnv}</dd>

              <dt style={{ color: '#6b6b6b' }}>Admin gate result</dt>
              <dd style={{ margin: 0, fontWeight: 700, color: isAdmin ? '#3fa85a' : '#c87d1a' }}>
                {isAdmin ? '✓ Admin (gate passes)' : '✗ Not admin (gate redirects)'}
              </dd>
            </dl>
          )}

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
            and add it to your Vercel <code>ADMIN_EMAIL</code> env var
            (comma-separated). Redeploy, hard refresh, retry.
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
