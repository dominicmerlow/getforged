'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

// Initialise PostHog exactly once on first client mount.
// Safe-guarded for SSR (window check) and for missing env (no-op).
function initPostHog() {
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return  // already initialised in this session
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com'
  if (!key || key.startsWith('phc_xxxx')) return  // not configured
  posthog.init(key, {
    api_host: host,
    capture_pageview: false,  // we fire pageviews manually on route change
    capture_pageleave: true,
    person_profiles: 'identified_only',
    autocapture: {
      // Don't auto-capture form submits — checkout/contact already fire explicit events
      element_attribute_ignorelist: ['data-no-track'],
    },
    loaded: ph => {
      if (process.env.NODE_ENV === 'development') ph.debug()
    },
  })
}

// App Router doesn't fire SPA route-change events by default. We listen to
// pathname + searchParams and fire `$pageview` ourselves.
function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!posthog.__loaded) return
    const url = window.location.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <>
      {/* Suspense boundary required by useSearchParams in App Router */}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  )
}
