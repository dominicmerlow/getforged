import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Messages',
}

export const dynamic = 'force-dynamic'

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('YOUR_PROJECT') && !key.startsWith('your_')
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function MessagesPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <Nav />
        <main>
          <section className="section">
            <div className="section-tag">Messages</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
              Not connected
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16 }}>
              Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to use messages.
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
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!sellerRow) {
    return (
      <>
        <Nav />
        <main>
          <section className="section">
            <div className="section-tag">Messages</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
              No seller profile found
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16 }}>
              Your seller profile is still being created. Check back shortly.
            </p>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*, product:products(title, slug)')
    .eq('seller_id', sellerRow.id)
    .order('created_at', { ascending: false })

  const rows = messages ?? []

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Seller dashboard</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,5vw,64px)' }}>
            Messages
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginTop: 12 }}>
            {rows.length === 0
              ? 'No messages yet.'
              : `${rows.length} message${rows.length === 1 ? '' : 's'} from buyers.`}
          </p>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          {rows.length === 0 ? (
            <div className="product-card" style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--ink)' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>
                No messages yet. They&apos;ll appear here when buyers reach out.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {rows.map((msg: {
                id: string
                sender_name: string
                sender_email: string
                body: string
                created_at: string
                product: { title: string; slug: string } | null
              }) => (
                <article
                  key={msg.id}
                  className="product-card"
                  style={{ padding: 24, display: 'grid', gap: 12 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                    <div>
                      {msg.product ? (
                        <Link
                          href={`/products/${msg.product.slug}`}
                          style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--amber)', textDecoration: 'none' }}
                        >
                          {msg.product.title}
                        </Link>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: '#6b6b6b' }}>
                          (product removed)
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#6b6b6b', whiteSpace: 'nowrap' }}>
                      {formatDate(msg.created_at)}
                    </div>
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#6b6b6b' }}>
                    {msg.sender_name} &lt;{msg.sender_email}&gt;
                  </div>

                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.6, margin: 0 }}>
                    {msg.body}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
