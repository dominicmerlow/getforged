import type { Config } from 'drizzle-kit'

/**
 * Run `npx drizzle-kit push` to sync db/schema.ts to Neon directly (fine for
 * this project's single-environment setup), or `npx drizzle-kit generate` +
 * `npx drizzle-kit migrate` if you want reviewable SQL migration files.
 *
 * URL resolution mirrors lib/db.ts — Vercel's Neon integration doesn't
 * provision a plain DATABASE_URL by default, only POSTGRES_URL /
 * DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING. Also mirrors its
 * `postgres(ql)://` shape check — `vercel env pull` redacts sensitive-marked
 * vars to the literal string `[SENSITIVE]`, which is present-but-not-a-URL.
 */
function resolveDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ]
  return candidates.find(v => v && /^postgres(ql)?:\/\//.test(v)) ?? ''
}

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
} satisfies Config
