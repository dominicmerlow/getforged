// Thin client-side wrapper around Vercel Web Analytics so call sites don't
// need to import the SDK directly, and there is one place to add server-side
// fan-out (Resend webhook, Slack notify, etc.) later.
//
// This used to wrap posthog-js. PostHog was never actually running in
// production: `NEXT_PUBLIC_POSTHOG_KEY` is inlined at BUILD time and was never
// set in a build, so `posthog.init()` never ran and every call below was a
// silent no-op while the SDK shipped ~186 KB of dead weight. Vercel Web
// Analytics needs no key, no build-time variable and no third-party account —
// it is enabled per-project in the Vercel dashboard, which removes the entire
// class of "configured everywhere except in the build that shipped".
//
// What we gave up in the swap: person-level identity. Vercel Web Analytics is
// not person-based, so there is no `identify` / `reset`. Nothing called them.

import { track as vercelTrack } from '@vercel/analytics'

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
  | 'signup_started'
  | 'signup_completed'
  | 'review_reply_posted'

/**
 * Drop `undefined` values. The SDK's own type permits them, but an absent
 * property and a property explicitly set to nothing are the same fact, and
 * only one of them survives JSON serialisation — so normalise here rather
 * than leaving 12 call sites to guess.
 */
function clean(props: EventProps): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * Fire a typed analytics event.
 *
 * Safe to call anywhere: the SDK no-ops during SSR and when Web Analytics is
 * not enabled for the project, so local and preview builds do not error.
 *
 * Custom events (as opposed to pageviews) require a Vercel Pro or Enterprise
 * plan. Pageviews are collected on every plan, so traffic is measurable even
 * if these particular calls are not.
 */
export function track(event: GetForgedEvent, props: EventProps = {}) {
  if (typeof window === 'undefined') return
  vercelTrack(event, clean(props))
}
