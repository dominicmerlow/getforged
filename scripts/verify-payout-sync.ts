/**
 * Proves the payout gate cannot be opened by a stale cache.
 *
 * The bug this guards: sellers.stripePayoutsEnabled is a cache written only by
 * events (the account.updated webhook, the Connect return redirect). Stripe put
 * the connected account under review — payouts_enabled false, disabled_reason
 * "other", nothing currently_due — no event corrected the column, and the site
 * went on offering a Buy button for a sale whose funds could not reach the
 * seller.
 *
 * Every assertion below has been observed failing. The CONTROL lines exist so a
 * green run means something: each one proves the corresponding check can still
 * detect the original bug.
 *
 * Run: npm run verify:payouts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type Stripe from 'stripe'
import { payoutsReady } from '../lib/stripe'

// npm scripts run from the repo root; keeps this working on Node < 20.11 too.
const root = process.cwd()

let pass = 0
let fail = 0
let skip = 0

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    pass++
    console.log(`  PASS  ${label}`)
  } else {
    fail++
    console.log(`  FAIL  ${label}${detail ? `\n          ${detail}` : ''}`)
  }
}

function skipped(label: string, why: string) {
  skip++
  console.log(`  SKIP  ${label}\n          ${why}`)
}

/** Minimal Stripe.Account stand-in — payoutsReady only reads these three. */
const acct = (
  charges_enabled: boolean,
  payouts_enabled: boolean,
  details_submitted: boolean
) => ({ charges_enabled, payouts_enabled, details_submitted }) as Stripe.Account

console.log('\npayoutsReady — the single definition of "this seller can be paid"\n')

// The exact production shape on 2026-08-22: charges on, payouts off pending
// review, details submitted. This is the state that must refuse a sale.
check(
  'refuses charges_enabled + details_submitted when payouts_enabled is false',
  payoutsReady(acct(true, false, true)) === false
)
check('refuses payouts_enabled with charges_enabled false', payoutsReady(acct(false, true, true)) === false)
check('refuses when details_submitted is false', payoutsReady(acct(true, true, false)) === false)

// CONTROL: without this, a payoutsReady that returned false unconditionally
// would pass every assertion above.
check(
  'CONTROL: accepts a fully enabled account (so the checks above are not vacuous)',
  payoutsReady(acct(true, true, true)) === true
)

console.log('\ncheckout gate — must resolve payout status live, not from the cache\n')

const checkoutSrc = readFileSync(join(root, 'app/api/checkout/route.ts'), 'utf8')

check(
  'checkout calls syncSellerPayoutStatus',
  /await\s+syncSellerPayoutStatus\(/.test(checkoutSrc),
  'the gate is back on a cached column; a stale `true` sells an unpayable listing'
)
check(
  'checkout never gates on the cached seller.stripePayoutsEnabled column',
  !/seller\.stripePayoutsEnabled/.test(checkoutSrc),
  'found a read of seller.stripePayoutsEnabled — that is the bug this file exists to prevent'
)
check(
  'a failed payout lookup fails CLOSED (503, no Checkout Session created)',
  /payout status check failed[\s\S]{0,400}status:\s*503/.test(checkoutSrc),
  'could not find the 503 fail-closed branch after the sync call'
)

// CONTROL: prove the grep above can actually see that identifier in a file that
// legitimately contains it. If this fails, the two checks above are decoration —
// they would pass against any file, including an empty one.
const productsSrc = readFileSync(join(root, 'lib/products.ts'), 'utf8')
check(
  'CONTROL: the cached-column grep does find seller.stripePayoutsEnabled where it is used',
  /stripePayoutsEnabled/.test(productsSrc),
  'the pattern matches nothing anywhere — the checkout assertions prove nothing'
)

async function liveChecks() {
  console.log('\nlive Stripe — does the real account agree with what we serve?\n')

  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key.endsWith('...')) {
    skipped(
      'the public product page agrees with Stripe',
      'STRIPE_SECRET_KEY not set — this half did NOT run. Not a pass.'
    )
    return
  }

  const accountId = process.env.VERIFY_CONNECT_ACCOUNT_ID
  if (!accountId) {
    skipped(
      'the public product page agrees with Stripe',
      'VERIFY_CONNECT_ACCOUNT_ID not set — this half did NOT run. Not a pass.'
    )
    return
  }

  {
    const { default: StripeSDK } = await import('stripe')
    const live = await new StripeSDK(key).accounts.retrieve(accountId)
    const ready = payoutsReady(live)
    console.log(
      `  · ${accountId}: charges=${live.charges_enabled} payouts=${live.payouts_enabled} ` +
        `details=${live.details_submitted} disabled_reason=${live.requirements?.disabled_reason ?? 'none'}`
    )
    console.log(`  · Stripe's verdict: ${ready ? 'sellable' : 'NOT sellable'}`)

    // The assertion that matters, and the only one that would have caught the
    // original bug: does what the site SERVES agree with what Stripe SAYS?
    //
    // Deliberately not `ready === (charges && payouts && details)` — that
    // re-derives payoutsReady's own expression and compares it to itself, so it
    // passes on any code at all. This crosses a system boundary instead: Stripe
    // on one side, the rendered public page on the other. On 2026-08-22 it fails,
    // which is the point — Stripe said NOT sellable and the page showed Buy.
    const slug = process.env.VERIFY_PRODUCT_SLUG
    const base = process.env.VERIFY_BASE_URL ?? 'https://getforged.getbrian.xyz'
    if (!slug) {
      skipped(
        'the public product page agrees with Stripe',
        'VERIFY_PRODUCT_SLUG not set — this half did NOT run. Not a pass.'
      )
    } else {
      const html = await fetch(`${base}/products/${slug}`).then(r => r.text())
      const offersCheckout = /action="\/api\/checkout"/.test(html)
      console.log(`  · ${base}/products/${slug} offers checkout: ${offersCheckout}`)
      check(
        `/products/${slug} offers checkout only when Stripe can pay the seller`,
        offersCheckout === ready,
        ready
          ? 'Stripe can pay this seller but the page hides the Buy button — sellers are losing sales'
          : 'Stripe CANNOT pay this seller and the page still shows a Buy button — buyers can pay for something undeliverable'
      )
    }
  }
}

liveChecks()
  .catch(err => {
    fail++
    console.log(
      `  FAIL  the live Stripe half threw instead of asserting\n          ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  })
  .finally(() => {
    console.log(
      `\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed, ${skip} skipped\n`
    )
    process.exit(fail === 0 ? 0 : 1)
  })
