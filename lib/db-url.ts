/**
 * Single source of truth for "which env var actually holds the Postgres URL".
 *
 * Vercel's Neon integration auto-provisions `POSTGRES_URL` /
 * `POSTGRES_URL_NON_POOLING` / `DATABASE_URL_UNPOOLED` — it does NOT create a
 * plain `DATABASE_URL` unless someone adds one by hand. The app is written
 * against `DATABASE_URL` throughout, so the name has to be resolved at runtime
 * rather than required as a manual setup step that fails silently.
 *
 * This lives in its own dependency-free module because three separate entry
 * points need the same answer and must not drift apart: lib/db.ts (the app),
 * drizzle.config.ts (drizzle-kit, loaded by esbuild outside Next's module
 * graph), and scripts/migrate.ts (the deploy-time migrator).
 */

/**
 * `vercel env pull` redacts any variable marked sensitive — including the ones
 * `vercel env add` creates, which is most of Neon's — to the literal
 * 11-character string `[SENSITIVE]` rather than omitting it. So a variable can
 * be present and still not be a URL. `neon()` validates its argument eagerly at
 * module-eval time, so letting a non-URL through crashes page-data collection
 * during the build instead of degrading; hence a shape check, not truthiness.
 */
export function isConnectionString(value: string | undefined): value is string {
  return !!value && /^postgres(ql)?:\/\//.test(value)
}

/** First env var that holds a real Postgres URL, or undefined if none do. */
export function resolveDatabaseUrl(): string | undefined {
  return [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ].find(isConnectionString)
}
