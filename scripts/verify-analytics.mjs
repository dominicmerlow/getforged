#!/usr/bin/env node
/**
 * Is analytics actually running on the deployed site?
 *
 * `NEXT_PUBLIC_*` is inlined into the client bundle at BUILD time, so the
 * question "is PostHog configured" cannot be answered by looking at the Vercel
 * environment — only by looking at what was compiled. On 2026-08-20 the
 * variable was absent from the build, `posthog.init()` never ran, and all
 * twelve `@/lib/analytics` call sites were silent no-ops while the dashboard
 * showed the key as set.
 *
 * The control assertion matters as much as the main one: if we fail to find
 * the PostHog init code at all, "no key found" would be indistinguishable
 * from "looked in the wrong file", and this check would pass for the wrong
 * reason the moment a chunk gets renamed.
 *
 * Usage: npm run verify:analytics [base-url]     (exit 0 = pass, 1 = fail)
 */
const BASE = (process.argv[2] ?? 'https://getforged.getbrian.xyz').replace(/\/$/, '')

const failures = []
const notes = []

async function text(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.text()
}

const html = await text(`${BASE}/`)
const chunks = [...new Set(
  [...html.matchAll(/\/_next\/static\/chunks\/[a-zA-Z0-9._-]+\.js/g)].map(m => m[0])
)]
notes.push(`${chunks.length} client chunks referenced by /`)

let bundle = ''
for (const chunk of chunks) {
  bundle += await text(`${BASE}${chunk}`)
}

// Control: did we actually load the code that initialises PostHog? The
// placeholder guard string is unique to components/PostHogProvider.tsx.
const foundInitCode = bundle.includes('phc_xxxx') && bundle.includes('api_host')
if (!foundInitCode) {
  failures.push(
    'CONTROL FAILED: the PostHog init code is not in any chunk this script read — ' +
    'a "no key" result below would be meaningless. Widen the chunk search.'
  )
}

// A real project key is `phc_` plus a long random string. The literal
// `phc_xxxx` in the source guard must not count as one.
const keys = [...new Set(
  [...bundle.matchAll(/phc_[A-Za-z0-9_-]{16,}/g)].map(m => m[0])
)].filter(k => !k.startsWith('phc_xxxx'))

if (keys.length === 0) {
  failures.push(
    'no PostHog project key is compiled into the bundle — NEXT_PUBLIC_POSTHOG_KEY was ' +
    'not set at BUILD time. Setting it in Vercel is not enough; the app must be rebuilt.'
  )
} else {
  notes.push(`PostHog key compiled in: ${keys[0].slice(0, 12)}... (${keys.length} distinct)`)
}

// The ingestion host must be PostHog's API host, not the dashboard host.
const host = bundle.match(/api_host:\s*([A-Za-z0-9_$]+|"[^"]+")/)
const literalHosts = [...new Set(
  [...bundle.matchAll(/https:\/\/[a-z]{2}(?:\.i)?\.posthog\.com/g)].map(m => m[0])
)]
if (literalHosts.length > 0) notes.push(`posthog hosts in bundle: ${literalHosts.join(', ')}`)
if (host) notes.push(`api_host expression: ${host[1]}`)
if (literalHosts.includes('https://eu.posthog.com') && !literalHosts.some(h => h.includes('.i.'))) {
  notes.push(
    'NOTE: the only host present is the dashboard host (eu.posthog.com), not the ' +
    'ingestion host (eu.i.posthog.com). Set NEXT_PUBLIC_POSTHOG_HOST explicitly to the ' +
    'value in your PostHog setup snippet rather than relying on the code default.'
  )
}

// Sentry rides in the same provider and has the same build-time constraint.
if (!/https:\/\/[a-zA-Z0-9]+@[a-z0-9.]*sentry\.io/.test(bundle)) {
  notes.push('NEXT_PUBLIC_SENTRY_DSN is also absent from the build (client errors go nowhere).')
}

for (const n of notes) console.log(`  - ${n}`)
console.log('')
if (failures.length > 0) {
  console.error(`FAIL - ${failures.length} problem(s) with analytics on ${BASE}`)
  for (const f of failures) console.error(`  x ${f}`)
  process.exit(1)
}
console.log(`PASS - analytics is compiled into the deployed bundle at ${BASE}`)
