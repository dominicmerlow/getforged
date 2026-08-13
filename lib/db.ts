import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '@/db/schema'

/**
 * Vercel's native Neon/Postgres storage integration auto-provisions
 * `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` / `DATABASE_URL_UNPOOLED` —
 * it does NOT create a plain `DATABASE_URL` unless someone adds one by hand
 * in the dashboard. The app is written against `DATABASE_URL` throughout
 * (this file, drizzle.config.ts), so resolve it here from whichever
 * Vercel-provided name is actually set rather than requiring a manual step
 * that's easy to forget and fails silently (every read degrades to seed
 * data, matching the "degrade, don't crash" contract below, which made a
 * fully-disconnected production database look like a working site).
 */
// `vercel env pull` redacts any variable created via `vercel env add` (or
// the dashboard's "sensitive" toggle) to the literal 11-character string
// `[SENSITIVE]` instead of omitting it — so an unconfigured-looking pull can
// still populate these vars with a value that is present but not a URL.
// Neon's own vars are commonly marked sensitive, so this isn't a rare edge
// case here. `neon()` validates its argument eagerly at module-eval time, so
// passing a non-URL string through crashes page-data collection at build
// time (found the hard way) rather than degrading gracefully — hence the
// `postgres(ql)://` shape check below, not just a truthiness check.
function isRealConnectionString(value: string | undefined): value is string {
  return !!value && /^postgres(ql)?:\/\//.test(value)
}

function resolveDatabaseUrl(): string | undefined {
  return [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ].find(isRealConnectionString)
}

/**
 * Whether a real database is reachable. Every read path in lib/*.ts checks
 * this before querying and falls back to seed data / empty results — the
 * same "degrade, don't crash" contract the app had under Supabase, so local
 * dev and preview deploys without any DB env vars keep working.
 */
export function dbConfigured(): boolean {
  const url = resolveDatabaseUrl()
  return !!url && !url.includes('YOUR_') && !url.includes('placeholder')
}

// neon-http is stateless per-query (no pooled connection to manage), which
// matches how this app already used Supabase's PostgREST — one HTTP call per
// query, safe to construct even when no DB env var is set because nothing
// connects until a query actually runs. The fallback has to be a
// well-formed Postgres URL (host with a dot, explicit db name) — neon()
// validates the shape eagerly at construction time, before any query runs.
const sql = neon(resolveDatabaseUrl() ?? 'postgres://user:pass@placeholder.neon.tech/db')

export const db = drizzle(sql, { schema })
export type Database = typeof db
