import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { product_id } = await req.json()
    if (!product_id || typeof product_id !== 'string') {
      return NextResponse.json({ error: 'product_id required' }, { status: 400 })
    }

    // Keyed by IP+product (not just IP) so normal browsing across many
    // products isn't throttled — this only stops repeated inflation of one
    // product's view count.
    const ip = await getClientIp()
    const allowed = await checkRateLimit({
      bucket: 'view',
      identifier: `${ip}:${product_id}`,
      limit: 10,
      windowSeconds: 300,
    })
    if (!allowed) return NextResponse.json({ ok: true }) // silently drop, same as other failure modes here

    const supabase = createAdminClient()

    // Fetch current views, increment
    const { data: current } = await supabase
      .from('products')
      .select('views')
      .eq('id', product_id)
      .maybeSingle()

    if (current !== null) {
      await supabase
        .from('products')
        .update({ views: (current.views ?? 0) + 1 })
        .eq('id', product_id)
    }

    // Also log the event for time-series data
    await supabase.from('product_view_events').insert({ product_id })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // silent fail — don't break page loads
  }
}
