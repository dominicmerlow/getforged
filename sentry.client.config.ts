// Sentry browser/runtime config — initialised by next/instrumentation hook.
// Loaded on every client navigation; quiet no-op when SENTRY_DSN is unset
// so local dev and preview builds don't spam the dashboard.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // Replays — sample 10% of normal sessions, 100% of error sessions.
    // Cheap and high-signal for reproducing UI bugs at launch.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,        // marketplace text is public; safe to keep
        blockAllMedia: true,       // don't capture product screenshots
      }),
    ],
    // Performance monitoring — modest sample rate for launch.
    tracesSampleRate: 0.2,
    // Strip URLs that aren't ours (extension scripts etc.)
    allowUrls: [/getforged\.io/, /getforged\.vercel\.app/, /localhost/],
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  })
}
