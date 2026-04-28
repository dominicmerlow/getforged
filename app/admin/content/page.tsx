import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin'
import { getAllContentForAdmin } from '@/lib/content'
import ContentEditor from './ContentEditor'

export const dynamic = 'force-dynamic'

/**
 * Admin content management screen — Phase 4 of the admin suite.
 *
 * Lists every editable content key on the site, grouped by section
 * (Homepage Hero, Pricing, Footer, etc.). Each key has:
 *   - The current value (override-or-default)
 *   - "Custom" badge if the DB has an override row
 *   - Inline save button
 *   - Reset-to-default action when an override exists
 *
 * Saves write to site_content + bust the 'site-content' cache tag, so
 * changes go live within seconds without a redeploy.
 */
export default async function AdminContentPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')
  const role = await checkAdminAccess(userData.user.id, userData.user.email)
  if (!role) redirect('/')

  // Belt-and-braces: getAllContentForAdmin already swallows DB errors and
  // returns the defaults map, but if the migration hasn't been applied yet
  // OR the unstable_cache wrapper does something unexpected, we'd rather
  // show the page with all-defaults than throw an Error Boundary.
  let allContent: Awaited<ReturnType<typeof getAllContentForAdmin>>
  let loadError: string | null = null
  try {
    allContent = await getAllContentForAdmin()
  } catch (err) {
    allContent = []
    loadError = err instanceof Error ? err.message : 'Unknown read error'
  }
  const overrideCount = allContent.filter(c => c.isOverride).length

  // Group by section in registry-declared order (Map preserves insertion order)
  const groups = new Map<string, typeof allContent>()
  for (const item of allContent) {
    if (!groups.has(item.group)) groups.set(item.group, [])
    groups.get(item.group)!.push(item)
  }

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Admin · Content</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h1 className="section-title" style={{ fontSize: 'clamp(36px,4.5vw,56px)' }}>
              Site Content
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

          <p style={{
            marginTop: 16,
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            maxWidth: 720,
            color: 'var(--warm-ink, #2a2217)',
            opacity: 0.85,
          }}>
            Edit every piece of marketing copy on the site.
            Changes go live within ~30 seconds — no redeploy required.
            {overrideCount > 0 && (
              <>
                {' '}
                <strong>{overrideCount}</strong> of <strong>{allContent.length}</strong> keys
                are currently overridden; the rest use hardcoded defaults.
              </>
            )}
          </p>

          <div style={{
            marginTop: 16,
            padding: 14,
            background: 'rgba(232,146,10,0.08)',
            border: '1px solid rgba(232,146,10,0.2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 1.6,
          }}>
            <strong>Tip:</strong> values marked <em>rich</em> accept HTML —
            use <code>&lt;em&gt;</code> for amber italic, <code>&lt;span&gt;</code> for amber inline,
            <code>&lt;br/&gt;</code> for line breaks, <code>&lt;strong&gt;</code> for bold.
          </div>

          {loadError && (
            <div style={{
              marginTop: 16,
              padding: 14,
              background: 'rgba(192,74,27,0.08)',
              border: '1px solid rgba(192,74,27,0.3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
            }}>
              <strong>Couldn&apos;t load overrides:</strong> {loadError}
              <br />
              Most likely cause: <code>009_site_content.sql</code> migration hasn&apos;t been applied yet. Run it in the Supabase SQL editor — the page below shows defaults until then.
            </div>
          )}
        </section>

        {Array.from(groups, ([group, items]) => (
          <section key={group} className="section" style={{ paddingTop: 0 }}>
            <h2 style={{
              fontFamily: 'var(--font-bebas, sans-serif)',
              fontSize: 32,
              letterSpacing: '0.04em',
              borderBottom: '2px solid var(--soft-amber, #b97314)',
              paddingBottom: 8,
              marginBottom: 20,
            }}>
              {group}
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {items.map(item => (
                <ContentEditor
                  key={item.key}
                  contentKey={item.key}
                  description={item.description}
                  kind={item.kind as 'text' | 'multiline' | 'rich' | 'array' | 'boolean' | 'number'}
                  currentValue={item.value}
                  defaultValue={item.default}
                  isOverride={item.isOverride}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </>
  )
}
