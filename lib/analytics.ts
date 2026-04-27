// Thin client-side wrapper around posthog-js so call sites don't need to
// import the SDK directly and we get a single place to add server-side
// fan-out (Resend webhook, Slack notify, etc.) later.

import posthog from 'posthog-js'

type EventProps = Record<string, string | number | boolean | null | undefined>

export type GetForgedEvent =
  | 'view_product'
  | 'click_demo'
  | 'click_buy'
  | 'start_checkout'
  | 'purchase_success'
  | 'submit_product'
  | 'concierge_search'
  | 'apply_filter'
  | 'compare_add'
  | 'compare_remove'
  | 'compare_clear'
  | 'compare_open'
  | 'newsletter_signup'

/**
 * Fire a typed analytics event. No-op if PostHog isn't configured (so
 * staging/local builds don't error out).
 */
export function track(event: GetForgedEvent, props: EventProps = {}) {
  if (typeof window === 'undefined') return
  if (!posthog.__loaded) return
  posthog.capture(event, props)
}

/** Identify a logged-in user. Call after auth resolves on /dashboard. */
export function identify(userId: string, props: EventProps = {}) {
  if (typeof window === 'undefined') return
  if (!posthog.__loaded) return
  posthog.identify(userId, props)
}

/** Reset on sign-out. */
export function resetAnalytics() {
  if (typeof window === 'undefined') return
  if (!posthog.__loaded) return
  posthog.reset()
}
