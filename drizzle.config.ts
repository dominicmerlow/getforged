import type { Config } from 'drizzle-kit'
import { resolveDatabaseUrl } from './lib/db-url'

/**
 * Schema changes ship as migration files, not as a manual `drizzle-kit push`:
 *
 *   1. edit db/schema.ts
 *   2. `npm run db:generate`  — writes drizzle/NNNN_*.sql + a meta snapshot
 *   3. commit both, and the deploy applies them (see scripts/migrate.ts)
 *
 * `push` is deliberately not wired into any script. It diffs against whatever
 * the database currently looks like and applies the difference immediately,
 * which means the schema only changes when a human remembers to run it — and
 * when nobody did, production served seed data for five days while every
 * product query failed on a column that existed only in db/schema.ts.
 */
export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveDatabaseUrl() ?? '',
  },
} satisfies Config
