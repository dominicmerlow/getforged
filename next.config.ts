import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'getforged.io' },
    ],
  },
}

// Wrap with Sentry only if a DSN is set — keeps local builds and forks free
// of Sentry CLI calls and ad-blocker tunnel routes when not needed.
const sentryEnabled = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Suppress source-map upload logs unless on CI
      silent: !process.env.CI,
      // Hide source maps from prod bundles (uploaded to Sentry, not served)
      sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
      // Avoid bundling Sentry's worker into the main entry
      widenClientFileUpload: true,
      // Tunnel endpoint to bypass ad-blockers
      tunnelRoute: '/monitoring',
      // Disable telemetry pings to Sentry
      telemetry: false,
    })
  : nextConfig
