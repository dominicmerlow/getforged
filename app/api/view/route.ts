import { NextRequest, NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products, productViewEvents } from '@/db/schema'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

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

    // Atomic increment — no read-then-write race between concurrent views.
    await db.update(products).set({ views: sql`${products.views} + 1` }).where(eq(products.id, product_id))

    // Also log the event for time-series data
    await db.insert(productViewEvents).values({ productId: product_id })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // silent fail — don't break page loads
  }
}
