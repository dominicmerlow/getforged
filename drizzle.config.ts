import type { Config } from 'drizzle-kit'

/**
 * Run `npx drizzle-kit push` to sync db/schema.ts to Neon directly (fine for
 * this project's single-environment setup), or `npx drizzle-kit generate` +
 * `npx drizzle-kit migrate` if you want reviewable SQL migration files.
 */
export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
} satisfies Config
