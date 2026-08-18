/**
 * One place to report "a database read failed, so the user is being served
 * something other than the truth".
 *
 * Every read path in lib/*.ts catches its own errors and falls back — to seed
 * products, to default copy, to default feature flags. That contract is
 * deliberate (see lib/db.ts) and it keeps local dev and preview deploys
 * working, but on its own it is indistinguishable from success: production
 * served the six hard-coded seed products to 126 real users for five days
 * while `console.error` scrolled past in a log nobody was reading.
 *
 * So a fallback now costs something. It goes to Sentry as an error grouped by
 * scope (alertable, unlike a log line), it names the fallback in the message so
 * the consequence is legible without reading the source, and it is recorded for
 * /api/health to report.
 */
import * as Sentry from '@sentry/nextjs'

export type DegradedScope =
  | 'products.list'
  | 'products.detail'
  | 'products.ratings'
  | 'content'
  | 'settings'
  | 'admin.role'
  | 'admin.audit'
  | 'ratelimit'

export type DegradedEvent = {
  scope: DegradedScope
  /** What the user gets instead of real data. */
  fallback: string
  message: string
  at: string
}

/**
 * Ring buffer, per serverless instance. Deliberately not the health check's
 * source of truth — instances are ephemeral and there are many, so an empty
 * buffer proves nothing. It is diagnostic detail for whoever is already
 * looking; /api/health decides by re-running the queries itself.
 */
const RECENT_LIMIT = 20
const recent: DegradedEvent[] = []

export function reportDegraded(args: {
  scope: DegradedScope
  fallback: string
  error: unknown
}): void {
  const message = args.error instanceof Error ? args.error.message : String(args.error)
  const event: DegradedEvent = {
    scope: args.scope,
    fallback: args.fallback,
    message,
    at: new Date().toISOString(),
  }

  recent.push(event)
  if (recent.length > RECENT_LIMIT) recent.shift()

  console.error(`[degraded] ${args.scope} — serving ${args.fallback} instead of database data: ${message}`)

  Sentry.captureException(args.error, {
    level: 'error',
    // Group by scope rather than by message: a missing column and a dead
    // database produce different strings for the same broken page, and one
    // alert per broken page is the useful granularity.
    fingerprint: ['degraded', args.scope],
    tags: { degraded: 'true', degraded_scope: args.scope },
    extra: { fallback: args.fallback },
  })
}

/** Degradations seen by *this* instance since it started. */
export function recentDegradations(): DegradedEvent[] {
  return [...recent]
}
