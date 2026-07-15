import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Best-effort client IP from Vercel/proxy forwarding headers. Not spoof-proof
 * (a determined abuser can rotate IPs), but it's the standard signal
 * available without adding auth/captcha friction to anonymous endpoints.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers()
    const fwd = h.get('x-forwarded-for')
    if (fwd) return fwd.split(',')[0].trim()
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
 * Supabase-backed atomic counter (see migration 013). Falls back to a
 * per-instance in-memory counter if the DB call fails — a rate-limit outage
 * must not take down checkout or concierge, so this fails open on infra
 * errors while still applying best-effort per-instance limiting.
 *
 * Returns true if the request should proceed, false if it should be
 * rejected as over the limit.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<boolean> {
  const key = `${opts.bucket}:${opts.identifier}`
  const windowMs = opts.windowSeconds * 1000
  const now = Date.now()

  try {
    const supabase = await createServiceClient()
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString()
    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_key: key,
      p_window_start: windowStart,
      p_limit: opts.limit,
    })
    if (error) throw error
    return data === true
  } catch (err) {
    console.error('[ratelimit] DB check failed, using in-memory fallback:', err instanceof Error ? err.message : err)
    const entry = memoryStore.get(key)
    if (!entry || entry.resetAt <= now) {
      memoryStore.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }
    entry.count += 1
    return entry.count <= opts.limit
  }
}
