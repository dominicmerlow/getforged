import { toggleBookmark, isBookmarked } from '@/lib/bookmarks'
import { auth } from '@/auth'

/**
 * Whether the viewer is signed in, without taking the page down when the
 * database is unreachable or unconfigured. An un-authed answer degrades the
 * control to a sign-in link; a thrown error used to blank the whole product
 * page.
 */
async function isAuthed(): Promise<boolean> {
  try {
    const session = await auth()
    return !!session?.user
  } catch {
    return false
  }
}

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
  const authed = await isAuthed()
  const saved = authed ? await isBookmarked(productId).catch(() => false) : false

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: compact ? 32 : 40,
    padding: compact ? '0 12px' : '0 16px',
    background: saved ? 'var(--gf-amber-tint)' : 'transparent',
    border: '1px solid',
    borderColor: saved ? 'var(--gf-amber)' : 'var(--gf-line-strong)',
    color: saved ? 'var(--gf-amber-ink)' : 'var(--gf-text)',
    fontFamily: 'var(--font-sans), sans-serif',
    fontSize: compact ? 14 : 15,
    fontWeight: 600,
    letterSpacing: 0,
    textTransform: 'none',
    borderRadius: 'var(--gf-radius)',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
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
