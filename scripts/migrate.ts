/**
 * Deploy-time migrator. Runs from `npm run build` before `next build`, so a
 * schema change reaches the database as part of the deploy that needs it
 * instead of waiting for someone to remember `drizzle-kit push`.
 *
 * It fails the build rather than degrading. That is the point: a build that
 * fails is a bad deploy nobody ships, whereas the alternative — code querying
 * columns the database doesn't have — looks fine in CI and then serves seed
 * data to real users, which is exactly how this project lost five days.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { sql } from 'drizzle-orm'
import { resolveDatabaseUrl } from '../lib/db-url'

// Read before loadEnvConfig, deliberately. `vercel env pull` writes VERCEL_ENV
// into .env.local, so loading that file first would make every local build
// believe it is a preview deploy and skip migrating. Only the real process
// environment on Vercel should be able to set this.
const VERCEL_ENV = process.env.VERCEL_ENV

// tsx does not read .env.local the way next build does, so without this a
// local npm run build would silently skip migrations while the build that
// follows it connects fine. Same loader Next uses, so same precedence.
loadEnvConfig(process.cwd())

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle')
const log = (msg: string) => console.log(`[migrate] ${msg}`)

function die(msg: string): never {
  console.error(`[migrate] FAILED: ${msg}`)
  process.exit(1)
}

/**
 * Expected shape, read from the newest drizzle-kit snapshot. Used to check what
 * actually landed — `migrate()` only reports that it ran the files it hadn't
 * run before, which says nothing about a database that drifted before
 * migrations existed, or that someone changed by hand since.
 */
function expectedTables(): Map<string, Set<string>> {
  const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8'))
  const latest = journal.entries.at(-1)
  if (!latest) die('no migrations in drizzle/meta/_journal.json — run `npm run db:generate`')

  const snapshotPath = path.join(MIGRATIONS_DIR, 'meta', `${String(latest.idx).padStart(4, '0')}_snapshot.json`)
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))

  const out = new Map<string, Set<string>>()
  for (const table of Object.values(snapshot.tables) as Array<{
    name: string
    schema: string
    columns: Record<string, { name: string }>
  }>) {
    // drizzle writes "" for the default schema, which Postgres calls "public".
    if (table.schema && table.schema !== 'public') continue
    out.set(table.name, new Set(Object.values(table.columns).map(c => c.name)))
  }
  return out
}

async function verifySchema(db: ReturnType<typeof drizzle>): Promise<void> {
  const expected = expectedTables()
  // neon-http returns either a bare row array or a { rows } envelope depending
  // on how the underlying client was constructed, and getting it wrong here
  // yields an empty set — which would read as "every table is missing" and bury
  // the real problem under 22 bogus errors. Normalise, then refuse to draw any
  // conclusion from an empty result.
  const result = await db.execute(sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
  `)
  const rows = (Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? [])) as Array<{
    table_name: string
    column_name: string
  }>
  if (rows.length === 0) {
    die('information_schema returned no columns — the database is empty, or db.execute() returned a shape this script does not understand')
  }

  const actual = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set())
    actual.get(row.table_name)!.add(row.column_name)
  }

  const problems: string[] = []
  for (const [table, columns] of expected) {
    const live = actual.get(table)
    if (!live) {
      problems.push(`missing table: ${table}`)
      continue
    }
    const missing = [...columns].filter(c => !live.has(c))
    if (missing.length > 0) problems.push(`${table} is missing column(s): ${missing.join(', ')}`)
  }

  if (problems.length > 0) {
    console.error('[migrate] database does not match db/schema.ts after migrating:')
    for (const problem of problems) console.error(`[migrate]   - ${problem}`)
    die(`${problems.length} schema mismatch(es) — generate a migration for them with \`npm run db:generate\``)
  }

  log(`schema verified — ${expected.size} tables match db/schema.ts`)
}

async function main() {
  const url = resolveDatabaseUrl()

  // Preview deploys share the production database (single-environment setup, see
  // drizzle.config.ts), so migrating from one would change the schema under
  // whatever production is currently running. A preview that needs a new column
  // is expected to fail loudly at runtime until its migration ships to prod.
  if (VERCEL_ENV === 'preview') {
    log('preview deploy — skipping (previews share the production database)')
    return
  }

  if (!url) {
    if (VERCEL_ENV === 'production') {
      die('no Postgres URL in the environment (checked DATABASE_URL, POSTGRES_URL, DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING)')
    }
    log('no Postgres URL configured — skipping (local build without a database)')
    return
  }

  const db = drizzle(neon(url))

  log(`applying migrations from ${path.relative(process.cwd(), MIGRATIONS_DIR)}/`)
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })
  log('migrations applied')

  await verifySchema(db)
}

main().catch((err: unknown) => {
  die(err instanceof Error ? (err.stack ?? err.message) : String(err))
})
