// Sentry server-side config — Node.js runtime (server actions, route handlers).
// Loaded by next/instrumentation. Quiet no-op when SENTRY_DSN is unset.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Don't capture noisy framework errors that aren't actionable.
    ignoreErrors: [
      'NEXT_REDIRECT',         // intentional redirect() throws in server actions
      'NEXT_NOT_FOUND',        // intentional notFound() throws
    ],
  })
}
