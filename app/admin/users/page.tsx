import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess, type UserRole } from '@/lib/admin'
import UserRowActions from './UserRowActions'

export const dynamic = 'force-dynamic'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

interface SellerRow {
  id: string
  user_id: string
  display_name: string | null
  verified: boolean | null
  created_at: string | null
}

interface RoleRow {
  user_id: string
  role: UserRole
}

interface ProductCountRow {
  seller_id: string
}

interface PurchaseRow {
  buyer_id: string | null
  amount: number | null
}

/**
 * Admin Users screen — Phase 2 of the admin suite.
 *
 * Joins auth.users (via admin API) with sellers, user_roles, products count,
 * and purchases sum. The admin API is the only way to list auth.users from
 * server code; we then enrich with the public tables.
 */
export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const db = adminDb()

  let authUsers: Array<{ id: string; email: string | null; created_at?: string; last_sign_in_at?: string | null; user_metadata?: Record<string, unknown> }> = []
  let loadError: string | null = null

  try {
    // Supabase admin API — paginated; 200 per page is the default cap
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) throw new Error(error.message)
    authUsers = (data?.users ?? []).map(u => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: u.user_metadata,
    }))
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown read error'
  }

  // Pull all the relational data in parallel. user_roles depends on
  // migration 007 — wrap in try/catch so the page degrades gracefully
  // if not yet applied.
  const [sellersRes, productsRes, purchasesRes] = await Promise.all([
    db.from('sellers').select('id, user_id, display_name, verified, created_at'),
    db.from('products').select('seller_id').eq('status', 'live'),
    db.from('purchases').select('buyer_id, amount'),
  ])

  let roles: RoleRow[] = []
  try {
    const { data, error } = await db.from('user_roles').select('user_id, role')
    if (!error && data) roles = data as RoleRow[]
  } catch {
    /* migration 007 not applied — render with empty role grants */
  }

  const sellers = (sellersRes.data ?? []) as SellerRow[]
  const products = (productsRes.data ?? []) as ProductCountRow[]
  const purchases = (purchasesRes.data ?? []) as PurchaseRow[]

  // Index for O(1) joins in the render loop
  const sellerByUserId = new Map<string, SellerRow>(sellers.map(s => [s.user_id, s]))
  const rolesByUserId = roles.reduce<Map<string, UserRole[]>>((acc, r) => {
    const arr = acc.get(r.user_id) ?? []
    arr.push(r.role)
    acc.set(r.user_id, arr)
    return acc
  }, new Map())
  const productsBySellerId = products.reduce<Map<string, number>>((acc, p) => {
    acc.set(p.seller_id, (acc.get(p.seller_id) ?? 0) + 1)
    return acc
  }, new Map())
  const salesByBuyerId = purchases.reduce<Map<string, number>>((acc, p) => {
    if (!p.buyer_id) return acc
    acc.set(p.buyer_id, (acc.get(p.buyer_id) ?? 0) + (p.amount ?? 0))
    return acc
  }, new Map())

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Admin · Users</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h1 className="section-title" style={{ fontSize: 'clamp(36px,4.5vw,56px)' }}>
              Users
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

          <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <span><strong>{authUsers.length}</strong> total</span>
            <span><strong>{sellers.length}</strong> sellers</span>
            <span><strong>{sellers.filter(s => s.verified).length}</strong> verified</span>
            <span><strong>{roles.length}</strong> role grants</span>
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
              <br />
              Most likely cause: <code>SUPABASE_SERVICE_ROLE_KEY</code> env var missing or invalid.
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
                {authUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--muted, #6b6b6b)' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  authUsers.map(u => {
                    const seller = sellerByUserId.get(u.id) ?? null
                    const userRoles = rolesByUserId.get(u.id) ?? []
                    const liveCount = seller ? (productsBySellerId.get(seller.id) ?? 0) : 0
                    const sales = salesByBuyerId.get(u.id) ?? 0
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(42,39,32,0.06)', verticalAlign: 'top' }}>
                        <td style={td}>
                          <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{u.email ?? '—'}</div>
                          <div style={{ fontSize: 10, color: '#6b6b6b' }}>{u.id}</div>
                        </td>
                        <td style={td}>
                          {seller?.display_name ?? <span style={{ color: '#6b6b6b' }}>—</span>}
                        </td>
                        <td style={td}>
                          {userRoles.length === 0 ? (
                            <span style={{ color: '#6b6b6b' }}>—</span>
                          ) : (
                            <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                              {userRoles.map(r => (
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
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                        </td>
                        <td style={{ ...td, color: '#6b6b6b', fontSize: 11 }}>
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : 'never'}
                        </td>
                        <td style={td}>
                          <UserRowActions
                            userId={u.id}
                            email={u.email}
                            sellerId={seller?.id ?? null}
                            sellerVerified={!!seller?.verified}
                            currentRoles={userRoles}
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
      </main>
      <Footer />
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
