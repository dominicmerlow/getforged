import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import type { Product, ProductStatus } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { updateProductStatus } from './actions'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your FORGE product listings.',
}

export const dynamic = 'force-dynamic'

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('YOUR_PROJECT') && !key.startsWith('your_')
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Draft',
  live: 'Live',
  archived: 'Archived',
}

const STATUS_ACTIONS: Record<ProductStatus, { next: ProductStatus; label: string }[]> = {
  draft: [
    { next: 'live', label: 'Approve → live' },
    { next: 'archived', label: 'Archive' },
  ],
  live: [
    { next: 'archived', label: 'Archive' },
    { next: 'draft', label: 'Unpublish → draft' },
  ],
  archived: [
    { next: 'draft', label: 'Restore → draft' },
  ],
}

export default async function DashboardPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <Nav />
        <main>
          <section className="section">
            <div className="section-tag">Dashboard</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
              Not connected
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16 }}>
              Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to use the dashboard.
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

  const { data: sellerRow } = await supabase
    .from('sellers')
    .select('id, display_name, verified')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!sellerRow) {
    return (
      <>
        <Nav />
        <main>
          <section className="section">
            <div className="section-tag">Dashboard</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
              Welcome, {userData.user.email}
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16 }}>
              Your seller profile is still being created. If this persists, check that the <code>on_auth_user_created</code> trigger is installed.
            </p>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  const { data: productsRaw } = await supabase
    .from('products')
    .select('*, sales_page:sales_pages(headline, subheadline, problem_statement, cta_primary, meta_description)')
    .eq('seller_id', sellerRow.id)
    .order('created_at', { ascending: false })

  const { count: messageCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerRow.id)

  const products = (productsRaw ?? []) as Product[]
  const byStatus = {
    draft: products.filter(p => p.status === 'draft'),
    live: products.filter(p => p.status === 'live'),
    archived: products.filter(p => p.status === 'archived'),
  }

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Seller dashboard</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,5vw,64px)' }}>
            Hey, <span>{sellerRow.display_name}</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginTop: 12 }}>
            {products.length === 0
              ? 'No products yet. Submit a product URL to generate your first listing.'
              : `You have ${products.length} product${products.length === 1 ? '' : 's'} — ${byStatus.live.length} live, ${byStatus.draft.length} in draft.`}
          </p>

          {products.length > 0 && (() => {
            const totalViews = (products as (Product & { views?: number })[]).reduce((s, p) => s + (p.views ?? 0), 0)
            const liveCount = byStatus.live.length
            return (
              <div style={{ display: 'flex', gap: 32, marginTop: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, letterSpacing: '0.02em', lineHeight: 1 }}>{totalViews}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total views</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 40, letterSpacing: '0.02em', lineHeight: 1 }}>{liveCount}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live listings</div>
                </div>
              </div>
            )
          })()}

          <div style={{ marginTop: 24 }}>
            <Link href="/submit" className="btn-hero-primary" style={{ padding: '14px 28px' }}>
              + Submit a product
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <Link href="/dashboard/messages" className="btn-ghost" style={{ padding: '10px 20px' }}>
              Messages {messageCount ? `(${messageCount})` : ''}
            </Link>
            <Link href="/dashboard/profile" className="btn-ghost" style={{ padding: '10px 20px' }}>
              Edit profile
            </Link>
          </div>

          <div className="product-card" style={{ padding: 20, marginTop: 24, display: 'grid', gap: 12 }}>
            <div className="section-tag">Your referral link</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#6b6b6b', margin: 0 }}>
              Share this link. If someone buys through it, you earn a 5% kickback on the platform fee.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                background: 'rgba(42,39,32,0.06)', padding: '8px 12px',
                flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforged.io'}/?ref=${sellerRow.id}`}
              </code>
            </div>
          </div>
        </section>

        {(['draft', 'live', 'archived'] as ProductStatus[]).map(status => {
          const rows = byStatus[status]
          if (rows.length === 0) return null
          return (
            <section key={status} className="section" style={{ paddingTop: 0 }}>
              <div className="section-tag">{STATUS_LABEL[status]} ({rows.length})</div>
              <div style={{ display: 'grid', gap: 16, marginTop: 24 }}>
                {rows.map(p => {
                  const sp = Array.isArray(p.sales_page) ? p.sales_page[0] : p.sales_page
                  return (
                  <article
                    key={p.id}
                    className="product-card"
                    style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, padding: 24, alignItems: 'flex-start' }}
                  >
                    <div>
                      <div className="product-title" style={{ fontSize: 22 }}>{p.title}</div>
                      {sp?.headline && (
                        <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18, marginTop: 8 }}>
                          {sp.headline}
                        </div>
                      )}
                      {p.tagline && !sp?.headline && (
                        <div className="product-desc" style={{ marginTop: 4 }}>{p.tagline}</div>
                      )}
                      {sp?.subheadline && (
                        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginTop: 8, color: '#2b2b2b', maxWidth: 560 }}>
                          {sp.subheadline}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#6b6b6b', flexWrap: 'wrap' }}>
                        {p.slug && <span>/{p.slug}</span>}
                        {p.price_licensed != null && <span>{formatPrice(p.price_licensed)} licence</span>}
                        {p.price_exclusive != null && <span>{formatPrice(p.price_exclusive)} exclusive</span>}
                        {p.category && <span>· {p.category}</span>}
                        {(p as Product & { views?: number }).views != null && (
                          <span>· {(p as Product & { views?: number }).views} view{(p as Product & { views?: number }).views === 1 ? '' : 's'}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {p.status === 'live' && p.slug && (
                        <Link href={`/products/${p.slug}`} className="btn-ghost">View</Link>
                      )}
                      <Link href={`/dashboard/products/${p.id}/edit`} className="btn-ghost">Edit</Link>
                      {STATUS_ACTIONS[p.status].map(action => (
                        <form key={action.next} action={updateProductStatus}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="next" value={action.next} />
                          <button
                            type="submit"
                            className={action.next === 'live' ? 'btn-amber' : 'btn-ghost'}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {action.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  </article>
                  )
                })}
              </div>
            </section>
          )
        })}

        {products.length === 0 && (
          <section className="section">
            <div className="product-card" style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--ink)' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>
                No listings yet. Start by submitting a product URL and we&apos;ll generate the sales page for you.
              </p>
              <Link href="/submit" className="btn-hero-primary" style={{ padding: '14px 28px', display: 'inline-block', marginTop: 24 }}>
                + Submit your first product
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
