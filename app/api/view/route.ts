import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
