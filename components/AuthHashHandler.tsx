'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Catches Supabase magic-link tokens delivered via URL hash (implicit flow)
 * and persists them as a session, regardless of which route the magic link
 * lands on.
 *
 * Why this exists:
 * Supabase magic links can use either PKCE (token via ?code=…) or implicit
 * flow (token via #access_token=…). Our /auth/callback route only handles
 * PKCE, and Supabase will silently fall back to Site URL (/) for implicit
 * flow when the requested redirect_to isn't in the allowlist. Without this
 * handler, users land on / with a valid token in the URL hash but no
 * server-side cookie, so all SSR-protected routes (/admin, /dashboard,
 * /submit) treat them as anonymous and redirect them to /login.
 *
 * This component runs on every page (mounted in the root layout). It:
 *   1. Reads the URL hash on mount
 *   2. Extracts access_token + refresh_token if present
 *   3. Calls supabase.auth.setSession to persist via the SSR cookie hook
 *   4. Cleans the hash from the URL (window.history.replaceState)
 *   5. Refreshes the route so server components re-fetch with auth
 */
export default function AuthHashHandler() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token=')) return

    // Parse hash like "#access_token=…&refresh_token=…&expires_at=…&type=magiclink"
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken || !refreshToken) return

    const supabase = createClient()

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          // Don't blow up the page — surface in console for diagnosis
          console.error('[AuthHashHandler] setSession failed:', error.message)
          return
        }
        // Clean the URL — token bytes shouldn't sit in browser history.
        const cleanUrl = window.location.pathname + window.location.search
        window.history.replaceState(null, '', cleanUrl)

        // For magic-link arrivals on the homepage, route the user somewhere
        // useful. Other arrival points (recovery, signup, invite) get to keep
        // their landing page so we don't second-guess Supabase's intent.
        if (type === 'magiclink' && window.location.pathname === '/') {
          router.replace('/dashboard')
        } else {
          // Same-route refresh so server components re-render with the new auth cookie.
          router.refresh()
        }
      })
  }, [router])

  return null
}
