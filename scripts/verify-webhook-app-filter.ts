/**
 * Exercises `belongsToAnotherApp` in `lib/app-tag.ts`.
 *
 * This Stripe account also serves MERLOW (merlow.space). A webhook endpoint
 * subscribes to an event type for the *whole* account and cannot be scoped to
 * one app, so MERLOW's completed checkouts are delivered to our endpoint and
 * always were.
 *
 * They were never processed — `handleCheckoutCompleted` requires `product_id`
 * and `purchase_type`, which they do not have, so it returned 200 and ignored
 * them. But on the way out it wrote an `error_log` row, and that log exists so
 * that a *real* GetForged session arriving without metadata gets noticed. Every
 * MERLOW sale was tripping the alarm built to catch our own bug.
 *
 * The control at the end re-runs the old condition against a MERLOW session, so
 * this file records what was actually wrong and fails if the control ever stops
 * demonstrating it.
 *
 * Run: npm run verify:webhook-filter
 */
import { APP, belongsToAnotherApp } from '../lib/app-tag'

/** A MERLOW session's metadata, as its checkout actually writes it. */
const MERLOW = { app: 'merlow' }

/** One of ours, as app/api/checkout/route.ts writes it. */
const OURS = {
  app: APP,
  product_id: 'prod_abc',
  product_slug: 'a-thing',
  purchase_type: 'licensed',
  buyer_id: 'user_1',
  application_fee_pence: '150',
}

/** One of ours from before tagging existed. */
const OURS_UNTAGGED = {
  product_id: 'prod_abc',
  product_slug: 'a-thing',
  purchase_type: 'licensed',
  buyer_id: 'user_1',
  application_fee_pence: '150',
}

const CASES: [string, boolean, Record<string, string> | null | undefined][] = [
  ["MERLOW's session is another app's", true, MERLOW],
  ['one of ours is not', false, OURS],
  ['one of ours from before tagging is not — it is unclaimed, not foreign', false, OURS_UNTAGGED],
  ['an untagged session of unknown origin is left to the usual validation', false, {}],
  ['an empty tag claims nothing', false, { app: '' }],
  ['no metadata at all does not throw', false, null],
  ['undefined metadata does not throw', false, undefined],
  ['some third app would also be turned away', true, { app: 'someothershop' }],
]

function main() {
  const results: [string, boolean, string][] = []

  for (const [label, expected, metadata] of CASES) {
    let actual: boolean
    try {
      actual = belongsToAnotherApp(metadata)
    } catch (err) {
      results.push([label, false, `threw: ${err instanceof Error ? err.message : 'unknown'}`])
      continue
    }
    results.push([label, actual === expected, actual === expected ? '' : `expected ${expected}, got ${actual}`])
  }

  // ── Control. The filter only matters because a MERLOW session would
  //    otherwise reach the metadata validation and be logged as a fault. If
  //    MERLOW ever starts sending product_id and purchase_type, this stops
  //    being true and the assertions above stop meaning anything.
  const wouldHaveBeenLogged =
    !(MERLOW as Record<string, string>).product_id &&
    !(MERLOW as Record<string, string>).purchase_type
  results.push([
    'control: a MERLOW session really would have been logged as bad metadata',
    wouldHaveBeenLogged,
    wouldHaveBeenLogged ? '' : 'it now carries our metadata keys, so the log was not the problem',
  ])

  let failed = 0
  console.log('')
  for (const [label, ok, detail] of results) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' - ' + detail : ''}`)
    if (!ok) failed++
  }
  console.log('')
  if (failed > 0) {
    console.error(`FAIL - ${failed} of ${results.length} assertions failed`)
    process.exit(1)
  }
  console.log(`PASS - all ${results.length} assertions hold`)
}

main()
