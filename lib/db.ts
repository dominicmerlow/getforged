import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '@/db/schema'
import { resolveDatabaseUrl } from '@/lib/db-url'

/**
 * Whether a real database is reachable. Every read path in lib/*.ts checks
 * this before querying and falls back to seed data / empty results — the
 * same "degrade, don't crash" contract the app had under Supabase, so local
 * dev and preview deploys without any DB env vars keep working.
 *
 * Note this only says a usable URL is *configured*. It cannot tell you the
 * database is reachable or that its schema matches db/schema.ts — a query can
 * still fail against a configured DB, which is what lib/degraded.ts exists to
 * make visible instead of silently swapping in seed data.
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
