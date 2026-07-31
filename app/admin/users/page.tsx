import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { checkAdminAccess, type UserRole } from '@/lib/admin'
import { db, dbConfigured } from '@/lib/db'
import { users, sellers, userRoles, products, purchases } from '@/db/schema'
import UserRowActions from './UserRowActions'

export const dynamic = 'force-dynamic'

/**
 * Admin Users screen.
 *
 * The Supabase version had to go through the admin API to list `auth.users`,
 * since PostgREST never exposes that schema directly. With Drizzle, `users`
 * is an ordinary table this app owns — a plain `select` replaces the admin
 * API call, along with the joins against sellers, user_roles, live product
 * counts, and purchase totals.
 */
export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  let allUsers: (typeof users.$inferSelect)[] = []
  let loadError: string | null = null

  if (!dbConfigured()) {
    loadError = 'DATABASE_URL is not set.'
  } else {
    try {
      allUsers = await db.select().from(users)
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Unknown read error'
    }
  }

  const [sellerRows, liveProductRows, purchaseRows, roleRows] = dbConfigured() ? await Promise.all([
    db.select().from(sellers),
    db.select({ sellerId: products.sellerId }).from(products).where(eq(products.status, 'live')),
    db.select({ buyerId: purchases.buyerId, amount: purchases.amount }).from(purchases),
    db.select({ userId: userRoles.userId, role: userRoles.role }).from(userRoles),
  ]) : [[], [], [], []]

  // Index for O(1) joins in the render loop
  const sellerByUserId = new Map(sellerRows.map(s => [s.userId, s]))
  const rolesByUserId = roleRows.reduce<Map<string, UserRole[]>>((acc, r) => {
    const arr = acc.get(r.userId) ?? []
    arr.push(r.role)
    acc.set(r.userId, arr)
    return acc
  }, new Map())
  const productsBySellerId = liveProductRows.reduce<Map<string, number>>((acc, p) => {
    acc.set(p.sellerId, (acc.get(p.sellerId) ?? 0) + 1)
    return acc
  }, new Map())
  const salesByBuyerId = purchaseRows.reduce<Map<string, number>>((acc, p) => {
    if (!p.buyerId) return acc
    acc.set(p.buyerId, (acc.get(p.buyerId) ?? 0) + (p.amount ?? 0))
    return acc
  }, new Map())

  return (
    <>
      <section className="section">
        <div className="section-tag">Admin · Users</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <h1 className="section-title" style={{ fontSize: 'clamp(36px,4.5vw,56px)' }}>
            Users
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          <span><strong>{allUsers.length}</strong> total</span>
          <span><strong>{sellerRows.length}</strong> sellers</span>
          <span><strong>{sellerRows.filter(s => s.verified).length}</strong> verified</span>
          <span><strong>{roleRows.length}</strong> role grants</span>
        </div>

        {loadError && (
          <div style={{
            marginTop: 16,
            padding: 14,
            background: 'rgba(192,74,27,0.08)',
            border: '1px solid rgba(192,74,27,0.3)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}>
            <strong>Couldn&apos;t load users:</strong> {loadError}
          </div>
        )}
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div style={{ border: '1px solid rgba(42,39,32,0.12)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(42,39,32,0.04)', borderBottom: '1px solid rgba(42,39,32,0.12)' }}>
                <th style={th}>Email</th>
                <th style={th}>Display name</th>
                <th style={th}>Roles</th>
                <th style={{ ...th, textAlign: 'right' }}>Live products</th>
                <th style={{ ...th, textAlign: 'right' }}>Purchases (£)</th>
                <th style={th}>Joined</th>
                <th style={th}>Last seen</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--muted, #6b6b6b)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                allUsers.map(u => {
                  const seller = sellerByUserId.get(u.id) ?? null
                  const roles = rolesByUserId.get(u.id) ?? []
                  const liveCount = seller ? (productsBySellerId.get(seller.id) ?? 0) : 0
                  const sales = salesByBuyerId.get(u.id) ?? 0
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(42,39,32,0.06)', verticalAlign: 'top' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{u.email ?? '—'}</div>
                        <div style={{ fontSize: 10, color: '#6b6b6b' }}>{u.id}</div>
                      </td>
                      <td style={td}>
                        {seller?.displayName ?? <span style={{ color: '#6b6b6b' }}>—</span>}
                      </td>
                      <td style={td}>
                        {roles.length === 0 ? (
                          <span style={{ color: '#6b6b6b' }}>—</span>
                        ) : (
                          <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                            {roles.map(r => (
                              <span key={r} style={{
                                padding: '1px 6px',
                                background: roleColour(r),
                                color: '#fff',
                                fontSize: 10,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                              }}>
                                {r}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {liveCount}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {sales > 0 ? `£${sales.toLocaleString('en-GB')}` : '—'}
                      </td>
                      <td style={{ ...td, color: '#6b6b6b', fontSize: 11 }}>
                        {u.createdAt ? u.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td style={{ ...td, color: '#6b6b6b', fontSize: 11 }}>
                        {u.lastSignInAt ? u.lastSignInAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : 'never'}
                      </td>
                      <td style={td}>
                        <UserRowActions
                          userId={u.id}
                          email={u.email}
                          sellerId={seller?.id ?? null}
                          sellerVerified={!!seller?.verified}
                          currentRoles={roles}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted, #6b6b6b)',
  fontWeight: 500,
}

const td: React.CSSProperties = {
  padding: '12px 12px',
  verticalAlign: 'top',
}

function roleColour(role: UserRole): string {
  switch (role) {
    case 'superadmin': return '#7e22ce'
    case 'admin': return '#1d4ed8'
    case 'moderator': return '#3fa85a'
    case 'support': return '#b97314'
  }
}
