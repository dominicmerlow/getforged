import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { auth } from '@/auth'
import { db, dbConfigured } from '@/lib/db'
import { accounts, users } from '@/db/schema'
import { isAdminEmail, getUserRole } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint — shows what Auth.js knows about the current session
 * and whether the admin gate accepts it.
 *
 * Used to debug "I logged in but /admin redirects me" cases — the most
 * common cause is an OAuth provider returning a different email than the
 * user expects to be allowlisted.
 *
 * Requires sign-in but NOT admin access — a locked-out user needs this page
 * precisely because they aren't recognized as admin yet. It only ever shows
 * the signed-in user's OWN session data (id/email/provider/role), never the
 * raw ADMIN_EMAIL allowlist.
 */
export default async function WhoAmIPage() {
  const session = await auth()
  const user = session?.user
  if (!user?.id) redirect('/login')

  const isAdmin = isAdminEmail(user.email)
  const dbRole = await getUserRole(user.id)

  let providers: string[] = []
  let emailVerified: Date | null = null
  if (dbConfigured()) {
    const linkedAccounts = await db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, user.id))
    providers = linkedAccounts.map(a => a.provider)

    const userRow = await db.query.users.findFirst({ where: eq(users.id, user.id) })
    emailVerified = userRow?.emailVerified ?? null
  }

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
            <dt style={{ color: '#6b6b6b' }}>User ID</dt>
            <dd style={{ margin: 0, wordBreak: 'break-all' }}>{user.id}</dd>

            <dt style={{ color: '#6b6b6b' }}>Email</dt>
            <dd style={{ margin: 0, wordBreak: 'break-all', fontWeight: 600 }}>
              {user.email ?? '(none)'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>Linked providers</dt>
            <dd style={{ margin: 0 }}>
              {providers.length > 0 ? providers.join(', ') : '(password only, or none linked)'}
            </dd>

            <dt style={{ color: '#6b6b6b' }}>Display name</dt>
            <dd style={{ margin: 0 }}>{user.name ?? '(n/a)'}</dd>

            <dt style={{ color: '#6b6b6b' }}>Email verified?</dt>
            <dd style={{ margin: 0 }}>
              {emailVerified ? `✓ ${emailVerified.toISOString()}` : '✗ no'}
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
            <strong>If gate fails:</strong> copy the &ldquo;Email&rdquo; value above
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
