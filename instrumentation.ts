// Next.js App Router instrumentation hook — runs once per runtime
// (Node.js, Edge, browser is handled separately via sentry.client.config.ts).
//
// We dynamically import the per-runtime config so that bundles stay slim
// and the right Sentry initialiser fires for each environment.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Capture server-side React errors (App Router 15+) so they reach Sentry
// with the same DSN/sampling as everything else.
export { captureRequestError as onRequestError } from '@sentry/nextjs'
