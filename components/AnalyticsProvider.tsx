'use client'

import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/next'

/**
 * Mounts Vercel Web Analytics, and initialises client-side Sentry when a DSN
 * is configured.
 *
 * Replaces the old PostHogProvider. That component initialised PostHog only
 * when `NEXT_PUBLIC_POSTHOG_KEY` was present — and because `NEXT_PUBLIC_*` is
 * inlined at BUILD time rather than read at runtime, the variable was never in
 * a build and `posthog.init()` never ran. The site shipped an analytics SDK,
 * a pageview tracker and twelve instrumented call sites, and recorded nothing.
 *
 * `<Analytics />` needs no key and no environment variable: collection is
 * switched on per-project in the Vercel dashboard, and the component no-ops
 * when it is off. There is nothing left that can be "set correctly" in one
 * place and absent from the deployed bundle.
 *
 * Pageviews are handled by the component itself — the `/next` entry point
 * hooks Next's router, so App Router client-side navigations are counted
 * without the manual `$pageview` tracker this file used to carry (and without
 * its `useSearchParams` Suspense boundary).
 */

// Client-side Sentry, dynamically imported only when a DSN is set so projects
// without Sentry pay no bundle cost. Once per session.
let sentryClientInitialised = false
async function initSentryClient() {
  if (typeof window === 'undefined') return
  if (sentryClientInitialised) return
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  await import('@/sentry.client.config')
  sentryClientInitialised = true
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void initSentryClient()
  }, [])

  return (
    <>
      <Analytics />
      {children}
    </>
  )
}
