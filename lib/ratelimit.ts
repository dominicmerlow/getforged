import { headers } from 'next/headers'
import { lt, sql } from 'drizzle-orm'
import { db, dbConfigured } from '@/lib/db'
import { rateLimits } from '@/db/schema'
import { reportDegraded } from '@/lib/degraded'

/**
 * Best-effort client IP from the proxy forwarding headers.
 *
 * Takes the RIGHTMOST entry of `x-forwarded-for`, not the leftmost. The
 * header is a chain the client can prepend to at will — sending
 * `X-Forwarded-For: 1.2.3.4` makes the leftmost value entirely
 * attacker-chosen, so a rotating header would reset every bucket on every
 * request and nullify all of these limits at once. The rightmost entry is the
 * one our own proxy appended, and is the only part we did not receive from
 * the client.
 *
 * Still not spoof-proof against someone with many real IPs — nothing at this
 * layer is — but it is no longer defeated by editing one header.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers()
    const fwd = h.get('x-forwarded-for')
    if (fwd) {
      const hops = fwd.split(',').map(s => s.trim()).filter(Boolean)
      if (hops.length > 0) return hops[hops.length - 1]
    }
    return h.get('x-real-ip') ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

interface RateLimitOptions {
  /** Logical bucket name, e.g. 'concierge', 'checkout'. */
  bucket: string
  /** Caller identity within the bucket — usually an IP address. */
  identifier: string
  /** Max allowed hits per window. */
  limit: number
  windowSeconds: number
}

const memoryStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Fixed-window rate limiter, durable across serverless instances via a
 * Neon-backed atomic counter (see db/schema.ts → rateLimits, ported from
 * migration 013). The old Supabase version called a `rate_limit_hit` SQL
 * function for atomicity; the same guarantee comes from a single
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` statement here — Postgres
 * upserts are atomic on their own, no stored procedure required.
 *
 * Falls back to a per-instance in-memory counter if the DB call fails — a
 * rate-limit outage must not take down checkout or concierge, so this fails
 * open on infra errors while still applying best-effort per-instance limiting.
 *
 * Returns true if the request should proceed, false if it should be
 * rejected as over the limit.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<boolean> {
  const key = `${opts.bucket}:${opts.identifier}`
  const windowMs = opts.windowSeconds * 1000
  const now = Date.now()

  if (!dbConfigured()) {
    return inMemoryFallback(key, windowMs, now, opts.limit)
  }

  try {
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs)

    const [row] = await db
      .insert(rateLimits)
      .values({ key, windowStart, count: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count })

    // Opportunistic cleanup — same 1%-of-calls heuristic the original SQL
    // function used, so the table doesn't grow unbounded without a cron job.
    if (Math.random() < 0.01) {
      db.delete(rateLimits)
        .where(lt(rateLimits.windowStart, new Date(now - 24 * 60 * 60 * 1000)))
        .catch(() => {})
    }

    return row.count <= opts.limit
  } catch (err) {
    reportDegraded({ scope: 'ratelimit', fallback: 'a per-instance in-memory rate limit', error: err })
    return inMemoryFallback(key, windowMs, now, opts.limit)
  }
}

function inMemoryFallback(key: string, windowMs: number, now: number, limit: number): boolean {
  const entry = memoryStore.get(key)
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count += 1
  return entry.count <= limit
}
