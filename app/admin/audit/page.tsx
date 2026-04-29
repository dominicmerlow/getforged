import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin'

export const dynamic = 'force-dynamic'

function adminDb() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

interface AuditRow {
  id: string
  actor_id: string | null
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  payload: unknown
  created_at: string
}

const PAGE_SIZE = 100

/**
 * Admin audit log viewer — Phase 5.
 *
 * Latest 100 rows from admin_audit, with filter dropdowns for actor + action.
 * Click a row to expand its JSON payload (the before/after diff).
 *
 * Server-rendered with simple search-param filters so URLs are shareable
 * (e.g. /admin/audit?actor=clifton@example.com&action=product.publish).
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; action?: string }>
}) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  const { actor, action } = await searchParams

  const db = adminDb()

  let rows: AuditRow[] = []
  let loadError: string | null = null
  try {
    let query = db
      .from('admin_audit')
      .select('id, actor_id, actor_email, action, target_type, target_id, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (actor) query = query.eq('actor_email', actor)
    if (action) query = query.eq('action', action)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    rows = (data ?? []) as AuditRow[]
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Unknown read error'
  }

  // For the filter chips, fetch distinct values across the table — bounded
  // by querying just last 500 rows worth of distinct so it stays fast.
  let actors: string[] = []
  let actions: string[] = []
  try {
    const { data: distinctRows } = await db
      .from('admin_audit')
      .select('actor_email, action')
      .order('created_at', { ascending: false })
      .limit(500)
    if (distinctRows) {
      actors = Array.from(
        new Set(distinctRows.map(r => r.actor_email).filter((e): e is string => !!e))
      ).sort()
      actions = Array.from(new Set(distinctRows.map(r => r.action))).sort()
    }
  } catch {
    /* ignore — filter chips degrade gracefully */
  }

  return (
    <>
        <section className="section">
          <div className="section-tag">Admin · Audit</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h1 className="section-title" style={{ fontSize: 'clamp(36px,4.5vw,56px)' }}>
              Audit Log
            </h1>
          </div>

          <p style={{
            marginTop: 12,
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            color: 'var(--warm-ink, #2a2217)',
            opacity: 0.85,
          }}>
            Append-only history of every admin action. Latest {PAGE_SIZE} rows shown.
            {(actor || action) && (
              <>
                {' '}Filtered by{' '}
                {actor && <code>{actor}</code>}
                {actor && action && ' + '}
                {action && <code>{action}</code>}.{' '}
                <Link href="/admin/audit" style={{ color: 'var(--soft-amber, #b97314)', textDecoration: 'underline' }}>
                  Clear filters →
                </Link>
              </>
            )}
          </p>

          {loadError && (
            <div style={{
              marginTop: 16,
              padding: 14,
              background: 'rgba(192,74,27,0.08)',
              border: '1px solid rgba(192,74,27,0.3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}>
              <strong>Couldn&apos;t load audit:</strong> {loadError}
              <br />
              Most likely cause: <code>007_admin_foundation.sql</code> migration hasn&apos;t been applied.
            </div>
          )}

          {/* Filter chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            {actors.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6b6b' }}>
                  Actor:
                </span>
                {actors.map(a => (
                  <FilterChip key={a} active={actor === a} href={buildHref({ actor: a, action })}>{a}</FilterChip>
                ))}
              </div>
            )}
            {actions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6b6b' }}>
                  Action:
                </span>
                {actions.map(a => (
                  <FilterChip key={a} active={action === a} href={buildHref({ actor, action: a })}>{a}</FilterChip>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          {rows.length === 0 ? (
            <div style={{
              padding: 32,
              border: '1px dashed rgba(42,39,32,0.2)',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: '#6b6b6b',
            }}>
              No audit entries match.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {rows.map(row => (
                <details key={row.id} style={{
                  border: '1px solid rgba(42,39,32,0.12)',
                  padding: '12px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                }}>
                  <summary style={{ cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px',
                      background: actionColour(row.action),
                      color: '#fff',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                    }}>
                      {row.action}
                    </span>
                    <span style={{ color: 'var(--warm-ink, #2a2217)' }}>{row.actor_email ?? '(no email)'}</span>
                    {row.target_type && row.target_id && (
                      <span style={{ color: '#6b6b6b' }}>
                        → <code>{row.target_type}/{row.target_id}</code>
                      </span>
                    )}
                    <span style={{ color: '#6b6b6b', marginLeft: 'auto', fontSize: 11 }}>
                      {new Date(row.created_at).toLocaleString('en-GB')}
                    </span>
                  </summary>
                  <pre style={{
                    marginTop: 12,
                    padding: 12,
                    background: 'rgba(42,39,32,0.04)',
                    fontSize: 11,
                    overflow: 'auto',
                    maxHeight: 400,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
{JSON.stringify(row.payload, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </section>
    </>
  )
}

function buildHref(params: { actor?: string; action?: string }): string {
  const sp = new URLSearchParams()
  if (params.actor) sp.set('actor', params.actor)
  if (params.action) sp.set('action', params.action)
  const qs = sp.toString()
  return qs ? `/admin/audit?${qs}` : '/admin/audit'
}

function actionColour(action: string): string {
  if (action.startsWith('product.bulk_delete') || action.includes('delete')) return '#c04a1b'
  if (action.includes('publish') || action.includes('feature')) return '#3fa85a'
  if (action.includes('archive') || action.includes('suspend')) return '#6b6b6b'
  if (action.startsWith('content.')) return '#7e22ce'
  if (action.includes('role')) return '#1d4ed8'
  return '#b97314'
}

function FilterChip({ children, href, active }: { children: React.ReactNode; href: string; active?: boolean }) {
  return (
    <Link href={href} style={{
      padding: '4px 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      background: active ? 'var(--ink, #2a2217)' : 'transparent',
      color: active ? 'var(--paper, #fafaf5)' : 'var(--warm-ink, #2a2217)',
      border: '1px solid var(--ink, #2a2217)',
      textDecoration: 'none',
    }}>
      {children}
    </Link>
  )
}
