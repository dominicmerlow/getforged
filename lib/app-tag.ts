/**
 * Which app a Checkout Session belongs to, written into `session.metadata.app`.
 *
 * This Stripe account also serves MERLOW (merlow.space). A Stripe webhook
 * endpoint subscribes to an *event type* for the whole account and cannot be
 * scoped to one app or one domain, so each side is delivered the other's
 * completed checkouts and no configuration prevents it. The tag is how each
 * side recognises its own.
 *
 * Deliberately kept free of imports — no Stripe SDK, no database. It is a rule
 * about a string, it is on the path of every incoming webhook, and it can be
 * exercised without standing anything up. `lib/stripe.ts` would drag the db
 * layer in behind it.
 */
export const APP = 'getforged'

/**
 * True when a session says in its own metadata that it belongs to a different
 * app on this shared account.
 *
 * One-directional on purpose. An *untagged* session is not claimed by anyone
 * and is left to the usual validation, because sessions created before tagging
 * existed carry no `app` and some of those are ours. Only a session that names
 * another owner is turned away here.
 */
export function belongsToAnotherApp(
  metadata: Record<string, string> | null | undefined
): boolean {
  const app = metadata?.app
  return typeof app === 'string' && app.length > 0 && app !== APP
}
