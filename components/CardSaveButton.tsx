'use client'

import { Heart } from 'lucide-react'
import { toggleBookmark } from '@/lib/bookmarks'

interface CardSaveButtonProps {
  productId: string
  saved: boolean
  /** Path to revalidate + return to after the toggle */
  returnTo: string
  /** false when nobody is signed in — the control becomes a link to /login */
  authed: boolean
}

/**
 * The heart on a listing card.
 *
 * Deliberately dumb: it receives `saved` from a single bulk lookup done once
 * per page (see lib/bookmarks.ts → getBookmarkedIds) instead of querying for
 * itself, which is what makes it safe to render sixty of these in a grid.
 *
 * Signed-out visitors get a link to /login rather than a button that silently
 * does nothing — a heart that appears to work but saves nothing is worse than
 * one that asks you to sign in.
 */
export default function CardSaveButton({ productId, saved, returnTo, authed }: CardSaveButtonProps) {
  if (!authed) {
    return (
      <a
        href={`/login?next=${encodeURIComponent(returnTo)}`}
        className="gf-card-save"
        aria-label="Sign in to save this listing"
        onClick={e => e.stopPropagation()}
      >
        <Heart size={16} aria-hidden="true" />
      </a>
    )
  }

  return (
    <form action={toggleBookmark} onClick={e => e.stopPropagation()}>
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <button
        type="submit"
        className="gf-card-save"
        aria-label={saved ? 'Remove from saved listings' : 'Save this listing'}
        aria-pressed={saved}
      >
        <Heart
          size={16}
          aria-hidden="true"
          fill={saved ? 'currentColor' : 'none'}
        />
      </button>
    </form>
  )
}
