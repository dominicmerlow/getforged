#!/usr/bin/env node
/**
 * Is analytics actually collecting on the deployed site?
 *
 * There are two independent halves, and they fail for different reasons, so
 * this reports them separately:
 *
 *   1. CODE  — is `<Analytics />` mounted in the deployed build? Fixed by
 *              shipping components/AnalyticsProvider.tsx.
 *   2. TOGGLE — is Web Analytics switched on for the project? Fixed in the
 *              Vercel dashboard (Project -> Analytics -> Enable). Nothing in
 *              this repo can turn it on.
 *
 * Both must hold. The predecessor of this file checked PostHog, which was
 * configured in the dashboard and absent from every build, because
 * `NEXT_PUBLIC_*` is inlined at build time — a whole class of failure that
 * disappears with Vercel Web Analytics, since there is no key to inline.
 *
 * The control matters: `/_vercel/insights/script.js` returning 200 only means
 * something if a neighbouring bogus path under the same prefix returns 404.
 * Otherwise a catch-all rewrite would make this check pass unconditionally.
 *
 * Usage: npm run verify:analytics [base-url]     (exit 0 = pass, 1 = fail)
 */
const BASE = (process.argv[2] ?? 'https://getforged.getbrian.xyz').replace(/\/$/, '')

const results = []
const notes = []

async function status(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
  return res.status
}

// ── 1. CODE: the component injects a script pointing at this path ──────
const html = await fetch(`${BASE}/`).then(r => r.text())
const mounted = html.includes('/_vercel/insights')
results.push([
  'CODE: <Analytics /> is mounted in the deployed build',
  mounted,
  mounted ? '' : 'no /_vercel/insights reference in the homepage HTML - the build predates AnalyticsProvider, or it is not rendered',
])

// ── 2. TOGGLE: the collection script is served only when enabled ───────
const scriptStatus = await status('/_vercel/insights/script.js')
const enabled = scriptStatus === 200
notes.push(`/_vercel/insights/script.js -> HTTP ${scriptStatus}`)
results.push([
  'TOGGLE: Web Analytics is enabled for the project',
  enabled,
  enabled ? '' : `script.js returned ${scriptStatus} - enable it in Vercel: Project -> Analytics -> Enable`,
])

// ── Control: prove a 200 above is not a catch-all ─────────────────────
const bogusStatus = await status('/_vercel/insights/definitely-not-a-real-file.js')
notes.push(`control path -> HTTP ${bogusStatus}`)
results.push([
  'CONTROL: an unknown path under the same prefix does NOT return 200',
  bogusStatus !== 200,
  bogusStatus === 200
    ? 'a bogus path also returns 200, so the TOGGLE assertion above proves nothing'
    : '',
])

// Sentry rides in the same provider and does still need a build-time DSN.
if (!/https:\/\/[a-zA-Z0-9]+@[a-z0-9.]*sentry\.io/.test(html)) {
  notes.push('NEXT_PUBLIC_SENTRY_DSN not detected in the page (client errors may go nowhere).')
}

for (const n of notes) console.log(`  - ${n}`)
console.log('')
let failed = 0
for (const [label, ok, detail] of results) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '\n          ' + detail : ''}`)
  if (!ok) failed++
}
console.log('')
if (failed > 0) {
  console.error(`FAIL - ${failed} of ${results.length} assertions failed on ${BASE}`)
  process.exit(1)
}
console.log(`PASS - analytics is mounted and collecting on ${BASE}`)
