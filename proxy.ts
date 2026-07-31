/**
 * Root proxy (Next 16 rename of middleware) — two jobs:
 *   1. Keep the Auth.js session cookie fresh on every pass-through response.
 *      Wrapping the handler in `auth(...)` (rather than calling `auth()`
 *      inside it) is what makes this happen — the wrapper both attaches
 *      `req.auth` and performs the cookie-refresh side effect; a bare call
 *      to `auth()` from inside an unwrapped function does neither reliably
 *      in the middleware runtime.
 *   2. Site-wide maintenance gate: when `site.maintenance_mode` is true,
 *      all traffic is rewritten to `/maintenance` EXCEPT:
 *        - admin surfaces (/admin, /admin/*, /api/admin/*, /whoami)
 *        - auth flows (/api/auth/*, /login)
 *        - the maintenance page itself
 *        - Next internals + static assets (caught by the matcher AND a
 *          defence-in-depth allowlist inside the fn)
 *        - signed-in users who hold an admin role (DB-backed via
 *          checkAdminAccess)
 *
 * Fail-OPEN: if reading the flag throws (e.g. the settings table is
 * unreachable), traffic passes through untouched. The site is more useful
 * up than down, and a misconfigured flag should never lock everyone out.
 *
 * Notes for future maintainers:
 *   - We use `NextResponse.rewrite` (not redirect) so the user's URL stays
 *     intact — they can refresh post-maintenance and land where they were.
 *   - The matcher excludes Next internals at the framework level for perf;
 *     the inline allowlist exists for clarity / safety if the matcher is
 *     ever loosened.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSetting } from '@/lib/settings'
import { checkAdminAccess } from '@/lib/admin'

// Paths (and prefixes) that always bypass the maintenance gate.
const ALLOW_PREFIXES = [
  '/admin',
  '/api/admin',
  '/whoami',
  '/api/auth',
  '/login',
  '/maintenance',
  '/_next',
  '/favicon',
]

// Static asset extensions that always pass through.
const STATIC_EXT = /\.(png|jpg|jpeg|gif|svg|ico|css|js|map|webp|avif|woff|woff2|ttf|otf|txt|xml)$/i

function isAllowlisted(pathname: string): boolean {
  if (STATIC_EXT.test(pathname)) return true
  for (const prefix of ALLOW_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return true
  }
  return false
}

export const proxy = auth(async (req) => {
  const { pathname } = req.nextUrl

  if (isAllowlisted(pathname)) return NextResponse.next()

  // Fail-OPEN: any error reading settings → let traffic through.
  let maintenance = false
  try {
    maintenance = await getSetting('site.maintenance_mode')
  } catch (err) {
    console.error('[proxy] settings read failed, failing open:', err instanceof Error ? err.message : err)
    return NextResponse.next()
  }

  if (!maintenance) return NextResponse.next()

  // Maintenance is ON. Last bypass: signed-in admins.
  const user = req.auth?.user
  if (user?.id) {
    try {
      const role = await checkAdminAccess(user.id, user.email)
      if (role) return NextResponse.next()
    } catch {
      // If the role check throws, treat as non-admin (fail-CLOSED for the
      // admin bypass — safer than letting an error grant access).
    }
  }

  // Rewrite (not redirect) so the URL the user typed stays in the bar.
  const url = req.nextUrl.clone()
  url.pathname = '/maintenance'
  return NextResponse.rewrite(url)
})

export const config = {
  // Run on every request EXCEPT Next internals and obvious static assets.
  // The fn-level allowlist above is the source of truth for app-level
  // bypasses (admin, auth, etc.) — the matcher is just a perf optimisation.
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|webp|avif|woff|woff2|ttf|otf|txt|xml)$).*)',
  ],
}
