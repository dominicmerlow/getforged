import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

  // Use service role so the insert bypasses RLS (the table policy is
  // public-insert anyway, but service role also works without auth context).
  let supabase
  try {
    supabase = await createServiceClient()
  } catch {
    return NextResponse.json({ error: 'Subscription service not configured.' }, { status: 503 })
  }

  // Upsert by (email, source) so re-subscribing is idempotent.
  const { error } = await supabase
    .from('subscribers')
    .upsert(
      { email, source, unsubscribed: false },
      { onConflict: 'email,source', ignoreDuplicates: false }
    )

  if (error) {
    // The most common failure here pre-migration is "relation 'subscribers'
    // does not exist". We log it server-side and return a graceful 503 so
    // the UI shows an "email-us" fallback instead of an error toast that
    // implies the user did something wrong.
    console.error('[subscribe] insert failed:', error.message)
    return NextResponse.json(
      { error: 'Subscription service is warming up — please email hello@getforged.io for now.' },
      { status: 503 }
    )
  }

  return NextResponse.json({ ok: true, source })
}
