/**
 * Root middleware — site-wide maintenance gate.
 *
 * When `site.maintenance_mode` is true, all traffic is rewritten to
 * `/maintenance` EXCEPT:
 *   - admin surfaces (/admin, /admin/*, /api/admin/*, /whoami)
 *   - auth flows (/auth/*, /login)
 *   - the maintenance page itself
 *   - Next internals + static assets (caught by the matcher AND a defence-
 *     in-depth allowlist inside the fn)
 *   - signed-in users who hold an admin role (DB-backed via checkAdminAccess)
 *
 * Fail-OPEN: if reading the flag throws (e.g. site_settings table missing
 * pre-migration), traffic passes through untouched. The site is more useful
 * up than down, and a misconfigured flag should never lock everyone out.
 *
 * Notes for future maintainers:
 *   - We use `NextResponse.rewrite` (not redirect) so the user's URL stays
 *     intact — they can refresh post-maintenance and land where they were.
 *   - Hash fragments (#access_token=...) used by AuthHashHandler are never
 *     sent to the server, so this middleware can't see them and won't
 *     interfere with magic-link flows landing on `/`.
 *   - The matcher excludes Next internals at the framework level for perf;
 *     the inline allowlist exists for clarity / safety if the matcher is
 *     ever loosened.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSetting } from '@/lib/settings'
import { checkAdminAccess } from '@/lib/admin'

// Paths (and prefixes) that always bypass the maintenance gate.
const ALLOW_PREFIXES = [
  '/admin',
  '/api/admin',
  '/whoami',
  '/auth',
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

/**
 * Resolve the current user (if any) via Supabase auth cookies. Returns null
 * when env is unset, the user is anonymous, or anything throws.
 */
async function getSessionUser(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url.includes('YOUR_PROJECT') || key.startsWith('your_')) {
    return null
  }
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        // Middleware doesn't write cookies on the maintenance branch — we
        // only need to read the session, not refresh it. Keeping setAll a
        // no-op avoids stomping on the response we'll rewrite below.
        setAll: () => {},
      },
    })
    const { data } = await supabase.auth.getUser()
    return data.user ?? null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isAllowlisted(pathname)) {
    return NextResponse.next()
  }

  // Fail-OPEN: any error reading settings → let traffic through.
  let maintenance = false
  try {
    maintenance = await getSetting('site.maintenance_mode')
  } catch (err) {
    console.error('[middleware] settings read failed, failing open:', err instanceof Error ? err.message : err)
    return NextResponse.next()
  }

  if (!maintenance) {
    return NextResponse.next()
  }

  // Maintenance is ON. Last bypass: signed-in admins.
  const user = await getSessionUser(request)
  if (user) {
    try {
      const role = await checkAdminAccess(user.id, user.email)
      if (role) return NextResponse.next()
    } catch {
      // If the role check throws, treat as non-admin (fail-CLOSED for the
      // admin bypass — safer than letting an error grant access).
    }
  }

  // Rewrite (not redirect) so the URL the user typed stays in the bar.
  const url = request.nextUrl.clone()
  url.pathname = '/maintenance'
  return NextResponse.rewrite(url)
}

export const config = {
  // Run on every request EXCEPT Next internals and obvious static assets.
  // The fn-level allowlist above is the source of truth for app-level
  // bypasses (admin, auth, etc.) — the matcher is just a perf optimisation.
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|webp|avif|woff|woff2|ttf|otf|txt|xml)$).*)',
  ],
}
