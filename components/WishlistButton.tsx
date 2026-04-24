import { toggleBookmark, isBookmarked } from '@/lib/bookmarks'
import { createClient } from '@/lib/supabase/server'

// Server component that renders a heart toggle. When not authenticated,
// links to /login instead of posting — avoids creating phantom rows.
export default async function WishlistButton({
  productId,
  returnTo,
  compact = false,
}: {
  productId: string
  returnTo: string
  compact?: boolean
}) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const authed = !!userData.user

  const saved = authed ? await isBookmarked(productId) : false

  const sizing = compact
    ? { padding: '8px 10px', fontSize: 13 }
    : { padding: '10px 16px', fontSize: 13 }

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: saved ? 'var(--soft-amber, #b97314)' : 'transparent',
    border: '1px solid',
    borderColor: saved ? 'var(--soft-amber, #b97314)' : 'var(--warm-border, rgba(42,34,23,0.18))',
    color: saved ? 'var(--cream, #fbf6ec)' : 'var(--warm-ink, #2a2217)',
    fontFamily: 'var(--font-mono), monospace',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderRadius: 2,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.15s',
    ...sizing,
  }

  if (!authed) {
    return (
      <a href={`/login?next=${encodeURIComponent(returnTo)}`} style={baseStyle}>
        <span aria-hidden="true">♡</span>
        {!compact && 'Save'}
      </a>
    )
  }

  return (
    <form action={toggleBookmark} style={{ display: 'inline' }}>
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <button type="submit" style={{ ...baseStyle, border: baseStyle.border }}>
        <span aria-hidden="true">{saved ? '♥' : '♡'}</span>
        {!compact && (saved ? 'Saved' : 'Save')}
      </button>
    </form>
  )
}
