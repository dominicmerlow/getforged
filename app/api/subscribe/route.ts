import { NextResponse } from 'next/server'
import { db, dbConfigured } from '@/lib/db'
import { subscribers } from '@/db/schema'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

// Email validation: deliberately liberal — we want to capture interest, not
// reject typos. Soft-bounces are handled by the email provider later.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ALLOWED_SOURCES = new Set([
  'homepage',
  'blog',
  'concierge_zero_result',
  'product_page',
  'about',
  'unknown',
])

export async function POST(req: Request) {
  const ip = await getClientIp()
  const allowed = await checkRateLimit({ bucket: 'subscribe', identifier: ip, limit: 5, windowSeconds: 3600 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body: { email?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const source = ALLOWED_SOURCES.has(body.source ?? '') ? body.source! : 'unknown'

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (email.length > 320) {
    return NextResponse.json({ error: 'Email too long.' }, { status: 400 })
  }

  if (!dbConfigured()) {
    return NextResponse.json({ error: 'Subscription service not configured.' }, { status: 503 })
  }

  // Upsert by (email, source) so re-subscribing is idempotent.
  try {
    await db
      .insert(subscribers)
      .values({ email, source, unsubscribed: false })
      .onConflictDoUpdate({
        target: [subscribers.email, subscribers.source],
        set: { unsubscribed: false },
      })
  } catch (err) {
    // The most common failure here is transient DB unavailability. Log it
    // server-side and return a graceful 503 so the UI shows an "email-us"
    // fallback instead of an error toast that implies the user did something
    // wrong.
    console.error('[subscribe] insert failed:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'Subscription service is warming up. Please email getforged@getbrian.xyz for now.' },
      { status: 503 }
    )
  }

  return NextResponse.json({ ok: true, source })
}
