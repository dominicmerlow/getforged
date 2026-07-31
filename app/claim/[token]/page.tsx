import type { Metadata } from 'next'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { db, dbConfigured } from '@/lib/db'
import { claimInvites, products } from '@/db/schema'
import ClaimForm from './ClaimForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Claim your listing',
  robots: { index: false, follow: false },
}

type FeatureLike = { title?: string; description?: string }

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const row = dbConfigured()
    ? await db
        .select({ invite: claimInvites, product: products })
        .from(claimInvites)
        .innerJoin(products, eq(products.id, claimInvites.productId))
        .where(eq(claimInvites.token, token))
        .limit(1)
        .then(rows => rows[0] ?? null)
        .catch(() => null)
    : null

  if (!row) {
    return (
      <>
        <Nav />
        <main>
          <section className="section" style={{ maxWidth: 640, textAlign: 'center' }}>
            <div className="section-tag">Claim link</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4.5vw,56px)' }}>
              We couldn&apos;t find that listing
            </h1>
            <p style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 18 }}>
              This claim link may have been mistyped, or the listing was removed.
              You can still list your app directly.
            </p>
            <Link href="/submit" className="btn-amber" style={{ display: 'inline-block', marginTop: 24, padding: '14px 32px' }}>
              List your app free →
            </Link>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  const { invite, product } = row
  const isExpired = invite.status === 'expired' || invite.expiresAt < new Date()
  const isRevoked = invite.status === 'revoked'
  const isClaimed = invite.status === 'claimed'

  if (isClaimed) {
    return (
      <>
        <Nav />
        <main>
          <section className="section" style={{ maxWidth: 640, textAlign: 'center' }}>
            <div className="section-tag">Claim link</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4.5vw,56px)' }}>
              Already claimed
            </h1>
            <p style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 18 }}>
              This listing has already been claimed. If that was you, sign in to manage it.
            </p>
            <Link href="/login" className="btn-amber" style={{ display: 'inline-block', marginTop: 24, padding: '14px 32px' }}>
              Sign in →
            </Link>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (isExpired || isRevoked) {
    return (
      <>
        <Nav />
        <main>
          <section className="section" style={{ maxWidth: 640, textAlign: 'center' }}>
            <div className="section-tag">Claim link</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4.5vw,56px)' }}>
              This link has expired
            </h1>
            <p style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 18 }}>
              No worries — you can still list your app in a couple of minutes.
            </p>
            <Link href="/submit" className="btn-amber" style={{ display: 'inline-block', marginTop: 24, padding: '14px 32px' }}>
              List your app free →
            </Link>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  // Mark viewed (first view only — don't downgrade an already-claimed row,
  // and no need to re-stamp on every reload).
  if (invite.status === 'sent') {
    await db.update(claimInvites)
      .set({ status: 'viewed', viewedAt: new Date() })
      .where(eq(claimInvites.id, invite.id))
  }

  const greetingName = invite.prospectName ? invite.prospectName.split(' ')[0] : null
  const features = ((product.features ?? []) as FeatureLike[]).filter(f => f.title)
  const screenshot = product.screenshots?.[0] ?? null

  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ maxWidth: 780 }}>
          <div className="section-tag">Your listing is ready</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(32px,5vw,60px)' }}>
            {greetingName ? `Hi ${greetingName} — ` : ''}
            <span>{product.title}</span> is ready on GetForged
          </h1>
          <p style={{ marginTop: 16, fontFamily: 'var(--font-serif)', fontSize: 19, lineHeight: 1.5, maxWidth: 640 }}>
            {product.tagline || product.description}
          </p>

          {screenshot && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={screenshot}
              alt={`${product.title} screenshot`}
              style={{ marginTop: 32, width: '100%', maxWidth: 640, border: '1px solid var(--warm-border, rgba(42,34,23,0.15))' }}
            />
          )}

          {features.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, marginTop: 32, display: 'grid', gap: 12, maxWidth: 560 }}>
              {features.slice(0, 5).map((f, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontFamily: 'var(--font-serif)', fontSize: 17 }}>
                  <span style={{ color: '#3fa85a', flexShrink: 0 }}>✓</span>
                  <span>
                    <strong>{f.title}</strong>{f.description ? ` — ${f.description}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div
            style={{
              marginTop: 40,
              maxWidth: 560,
              border: '2px solid var(--warm-ink, #2a2217)',
              padding: '32px 28px',
              display: 'grid',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-bebas, "Bebas Neue", sans-serif)', fontSize: 32 }}>
                Free forever. Commission only.
              </div>
              <p style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--warm-muted, #8a7d69)', margin: 0 }}>
                £0 to list · 15% commission only when you make a sale · No obligation
              </p>
            </div>
            <ClaimForm token={token} />
          </div>

          <p style={{ marginTop: 32, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--warm-muted, #8a7d69)', maxWidth: 560 }}>
            This preview was drafted from public information about your product
            (found via {invite.source}). It isn&apos;t published or affiliated with
            you until you claim it. Want it taken down instead? Email{' '}
            <a href="mailto:hello@getforged.io" style={{ color: 'var(--soft-amber, #b97314)' }}>hello@getforged.io</a>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
