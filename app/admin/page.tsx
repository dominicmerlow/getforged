import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { formatPrice } from '@/lib/utils'
import { adminUpdateStatus } from './actions'
import AdminBatchScreenshotButton from '@/components/AdminBatchScreenshotButton'
import { checkAdminAccess } from '@/lib/admin'

type DraftProduct = {
  id: string
  title: string
  slug: string
  category: string
  created_at: string
  seller: { display_name: string } | { display_name: string }[]
}

type Purchase = {
  id: string
  amount: number
  purchase_type: string
  created_at: string
  product: { title: string; slug: string } | { title: string; slug: string }[]
}

type StatusRow = { status: string }

export const dynamic = 'force-dynamic'

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('YOUR_PROJECT') && !key.startsWith('your_')
}

function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export default async function AdminPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <Nav />
        <main>
          <section className="section">
            <div className="section-tag">Admin</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
              Not connected
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16 }}>
              Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
            </p>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const adminDb = createAdminClient()

  const [
    { data: drafts },
    { data: purchases },
    { count: sellerCount },
    { data: allStatuses },
  ] = await Promise.all([
    adminDb
      .from('products')
      .select('id, title, slug, category, created_at, seller:sellers!inner(display_name)')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(50),
    adminDb
      .from('purchases')
      .select('id, amount, purchase_type, created_at, product:products!inner(title, slug)')
      .order('created_at', { ascending: false })
      .limit(20),
    adminDb
      .from('sellers')
      .select('id', { count: 'exact', head: true }),
    adminDb
      .from('products')
      .select('status'),
  ])

  // Group product counts by status client-side
  const statusCounts = ((allStatuses ?? []) as StatusRow[]).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {})

  const recentSalesTotal = ((purchases ?? []) as Purchase[]).reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return (
    <>
      <Nav />
      <main>
        {/* Header */}
        <section className="section">
          <div className="section-tag">Admin</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,5vw,64px)' }}>
            Admin
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#6b6b6b', marginTop: 8 }}>
            {userData.user.email}
            <span style={{
              marginLeft: 12,
              padding: '2px 8px',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'var(--soft-amber, #b97314)',
              color: '#fff',
              borderRadius: 2,
            }}>
              {role}
            </span>
          </p>

          {/* Side-nav skeleton — Phase 2–5 sections will become live links as they ship */}
          <nav style={{
            marginTop: 24,
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            borderBottom: '1px solid rgba(42,39,32,0.12)',
            paddingBottom: 0,
          }}>
            {([
              { label: 'Overview', href: '/admin', active: true },
              { label: 'Users', href: '/admin/users' },
              { label: 'Products', href: '/admin/products' },
              { label: 'Content', href: '/admin/content' },
              { label: 'Audit', href: '/admin/audit' },
              { label: 'Settings', href: '/admin/settings' },
            ] as const).map(item => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  padding: '10px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: ('active' in item && item.active) ? 'var(--ink, #2a2217)' : '#6b6b6b',
                  borderBottom: ('active' in item && item.active) ? '2px solid var(--soft-amber, #b97314)' : '2px solid transparent',
                  marginBottom: -1,
                  cursor: 'pointer',
                  userSelect: 'none',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 32 }}>
            {[
              { label: 'Sellers', value: sellerCount ?? 0 },
              { label: 'Live products', value: statusCounts['live'] ?? 0 },
              { label: 'Draft products', value: statusCounts['draft'] ?? 0 },
              { label: 'Recent sales', value: formatPrice(recentSalesTotal) },
            ].map(stat => (
              <div key={stat.label} className="product-card" style={{ padding: '20px 24px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
                <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 36, marginTop: 4 }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Operational tools */}
          <div style={{ marginTop: 32, display: 'grid', gap: 12 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--soft-amber, #b97314)',
            }}>
              Operations
            </div>
            <AdminBatchScreenshotButton />
          </div>
        </section>

        {/* Moderation queue */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-tag">Moderation queue</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(24px,3vw,40px)', marginBottom: 24 }}>
            Pending review ({(drafts ?? []).length})
          </h2>

          {(drafts ?? []).length === 0 ? (
            <div className="product-card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: '#6b6b6b' }}>
                No products awaiting review.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {((drafts ?? []) as DraftProduct[]).map(draft => {
                const seller = Array.isArray(draft.seller) ? draft.seller[0] : draft.seller
                const sellerName = seller?.display_name ?? 'Unknown'
                const formattedDate = new Date(draft.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                return (
                  <article
                    key={draft.id}
                    className="product-card"
                    style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{draft.title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>
                        {sellerName} · {draft.category} · {formattedDate}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <form action={adminUpdateStatus}>
                        <input type="hidden" name="id" value={draft.id} />
                        <input type="hidden" name="status" value="live" />
                        <button type="submit" className="btn-amber" style={{ cursor: 'pointer', border: 'none' }}>
                          Approve
                        </button>
                      </form>
                      <form action={adminUpdateStatus}>
                        <input type="hidden" name="id" value={draft.id} />
                        <input type="hidden" name="status" value="archived" />
                        <button type="submit" className="btn-ghost" style={{ cursor: 'pointer' }}>
                          Reject
                        </button>
                      </form>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent sales */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-tag">Recent sales</div>
          <h2 className="section-title" style={{ fontSize: 'clamp(24px,3vw,40px)', marginBottom: 24 }}>
            Last 20 purchases
          </h2>

          {(purchases ?? []).length === 0 ? (
            <div className="product-card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: '#6b6b6b' }}>
                No purchases yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {((purchases ?? []) as Purchase[]).map(row => {
                const product = Array.isArray(row.product) ? row.product[0] : row.product
                const date = new Date(row.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                return (
                  <article
                    key={row.id}
                    className="product-card"
                    style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{product?.title ?? '—'}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>
                        {row.purchase_type} · {date}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 24 }}>
                      {formatPrice(row.amount)}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
