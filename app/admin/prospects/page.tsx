import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin'
import ProspectBatchForm from './ProspectBatchForm'
import RevokeInviteButton from './RevokeInviteButton'

export const dynamic = 'force-dynamic'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

interface InviteRow {
  id: string
  token: string
  status: string
  source: string
  prospect_email: string | null
  created_at: string
  claimed_at: string | null
  product: { title: string; slug: string | null } | { title: string; slug: string | null }[] | null
}

const STATUS_COLOR: Record<string, string> = {
  sent: 'var(--warm-muted, #8a7d69)',
  viewed: 'var(--soft-amber, #b97314)',
  claimed: '#3fa85a',
  expired: '#8a7d69',
  revoked: '#c04a1b',
}

export default async function AdminProspectsPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const db = adminDb()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

  const { data: invitesRaw } = await db
    .from('claim_invites')
    .select('id, token, status, source, prospect_email, created_at, claimed_at, product:products(title, slug)')
    .order('created_at', { ascending: false })
    .limit(200)

  const invites = (invitesRaw ?? []) as InviteRow[]
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
          {invites.map(inv => {
            const product = Array.isArray(inv.product) ? inv.product[0] : inv.product
            return (
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
                <span style={{ flex: 1, minWidth: 160 }}>{product?.title ?? '(deleted product)'}</span>
                <span style={{ color: '#6b6b6b' }}>{inv.source}</span>
                <span style={{ color: '#6b6b6b' }}>{inv.prospect_email ?? '—'}</span>
                <code style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--soft-amber, #b97314)' }}>
                  {`${appUrl}/claim/${inv.token}`}
                </code>
                {(inv.status === 'sent' || inv.status === 'viewed') && (
                  <RevokeInviteButton inviteId={inv.id} />
                )}
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
