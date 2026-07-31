import { NextResponse, type NextRequest } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/auth'

export const runtime = 'nodejs'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

/**
 * Seller screenshot upload — the one piece of this app that genuinely needed
 * Vercel Blob rather than migrating something. The Supabase-era app had no
 * file storage at all: screenshots were either scraped automatically
 * (Firecrawl) or pasted in as external URLs. This is the first real "upload
 * a file from your computer" path.
 *
 * Auth-gated but not ownership-gated to a specific product — the caller
 * (EditForm) only ever wires the resulting URL into a product the session
 * user already owns, and that ownership check happens in saveProduct's own
 * action, not here. This route's only job is "turn a file into a URL."
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'File uploads are not configured.' }, { status: 503 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only PNG, JPEG, WebP or GIF images are allowed.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8MB).' }, { status: 400 })
  }

  const ext = file.type.split('/')[1] ?? 'png'
  const key = `screenshots/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  try {
    const blob = await put(key, file, {
      access: 'public',
      contentType: file.type,
    })
    return NextResponse.json({ ok: true, url: blob.url })
  } catch (err) {
    console.error('[upload] blob put failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
