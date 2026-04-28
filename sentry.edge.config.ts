// Sentry edge runtime config — middleware + edge route handlers.
// Loaded by next/instrumentation. Quiet no-op when SENTRY_DSN is unset.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  })
}
