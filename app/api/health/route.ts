import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, dbConfigured } from '@/lib/db'
import { products, sellers, siteContent, siteSettings } from '@/db/schema'
import { recentDegradations } from '@/lib/degraded'

/**
 * Liveness/readiness probe. Returns 503 whenever the site is serving fallback
 * data, so an uptime monitor sees the outage the pages themselves hide.
 *
 * Every read path degrades rather than crashing (see lib/db.ts), which means a
 * totally disconnected database still answers `GET /` with 200 and a full-looking
 * page of seed products — a monitor watching the homepage stays green through
 * exactly the failure it exists to catch. This route is the honest signal.
 *
 * It re-runs the queries rather than trusting lib/degraded.ts's buffer: that
 * buffer is per serverless instance, so a fresh instance reports an empty
 * history no matter how broken the database is.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Check = { name: string; ok: boolean }

/**
 * The product/seller join is the check that matters most, and it is written as
 * the full row select on purpose. Postgres rejects the whole statement when any
 * one selected column is missing, so selecting everything is what makes this
 * catch schema drift — a `select 1` would have stayed green throughout the
 * outage this route was added for.
 */
const PROBES: Record<string, () => Promise<unknown>> = {
  products: () =>
    db
      .select({ product: products, seller: sellers })
      .from(products)
      .leftJoin(sellers, eq(products.sellerId, sellers.id))
      .limit(1),
  settings: () => db.select().from(siteSettings).limit(1),
  content: () => db.select().from(siteContent).limit(1),
}

export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json(
      { status: 'degraded', reason: 'no database configured', checks: [] },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    )
  }

  const checks: Check[] = await Promise.all(
    Object.entries(PROBES).map(async ([name, probe]) => {
      try {
        await probe()
        return { name, ok: true }
      } catch {
        // Swallowed on purpose: the message is already in the logs and in
        // Sentry via reportDegraded, and this response is public.
        return { name, ok: false }
      }
    })
  )

  const failed = checks.filter(c => !c.ok)
  const degradedScopes = [...new Set(recentDegradations().map(e => e.scope))]

  return NextResponse.json(
    {
      status: failed.length === 0 ? 'ok' : 'degraded',
      checks,
      // Scopes only — no error strings. Detail lives in Sentry.
      recentlyDegraded: degradedScopes,
    },
    { status: failed.length === 0 ? 200 : 503, headers: { 'cache-control': 'no-store' } }
  )
}
