import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { checkAdminAccess } from '@/lib/admin'
import { db } from '@/lib/db'
import { claimInvites, products } from '@/db/schema'
import ProspectBatchForm from './ProspectBatchForm'
import RevokeInviteButton from './RevokeInviteButton'

export const dynamic = 'force-dynamic'

const STATUS_COLOR: Record<string, string> = {
  sent: 'var(--warm-muted, #8a7d69)',
  viewed: 'var(--soft-amber, #b97314)',
  claimed: '#3fa85a',
  expired: '#8a7d69',
  revoked: '#c04a1b',
}

export default async function AdminProspectsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = await checkAdminAccess(session.user.id, session.user.email)
  if (!role) redirect('/')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

  const invites = await db
    .select({
      id: claimInvites.id, token: claimInvites.token, status: claimInvites.status,
      source: claimInvites.source, prospectEmail: claimInvites.prospectEmail,
      createdAt: claimInvites.createdAt, claimedAt: claimInvites.claimedAt,
      productTitle: products.title,
    })
    .from(claimInvites)
    .leftJoin(products, eq(products.id, claimInvites.productId))
    .orderBy(desc(claimInvites.createdAt))
    .limit(200)

  const funnel = invites.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <section className="section">
        <div className="section-tag">Developer outreach</div>
        <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
          Prospects
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, maxWidth: 720, marginTop: 12 }}>
          Paste rows scraped per the outreach playbook and this generates a pre-filled
          draft listing + a one-click claim link for each prospect. See{' '}
          <code>docs/launch/OUTREACH-PLAYBOOK.md</code> for sourcing and message templates.
        </p>

        <div style={{ display: 'flex', gap: 32, marginTop: 24, flexWrap: 'wrap' }}>
          {(['sent', 'viewed', 'claimed', 'revoked'] as const).map(status => (
            <div key={status}>
              <div style={{ fontFamily: 'var(--font-bebas)', fontSize: 36, lineHeight: 1 }}>
                {funnel[status] ?? 0}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {status}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-tag">Generate claim links</div>
        <div style={{ marginTop: 16 }}>
          <ProspectBatchForm />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-tag">All invites ({invites.length})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
          {invites.length === 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#6b6b6b' }}>
              No prospect invites yet.
            </p>
          )}
          {invites.map(inv => (
            <div
              key={inv.id}
              style={{
                padding: '12px 16px',
                border: '1px solid var(--warm-border, rgba(42,34,23,0.12))',
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                flexWrap: 'wrap',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
              }}
            >
              <span
                style={{
                  textTransform: 'uppercase',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: STATUS_COLOR[inv.status] ?? 'inherit',
                  minWidth: 70,
                }}
              >
                {inv.status}
              </span>
              <span style={{ flex: 1, minWidth: 160 }}>{inv.productTitle ?? '(deleted product)'}</span>
              <span style={{ color: '#6b6b6b' }}>{inv.source}</span>
              <span style={{ color: '#6b6b6b' }}>{inv.prospectEmail ?? '—'}</span>
              <code style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--soft-amber, #b97314)' }}>
                {`${appUrl}/claim/${inv.token}`}
              </code>
              {(inv.status === 'sent' || inv.status === 'viewed') && (
                <RevokeInviteButton inviteId={inv.id} />
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
