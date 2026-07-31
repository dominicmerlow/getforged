# RLS → application-layer authorization mapping

Supabase enforced every access rule below as a Postgres Row Level Security
policy — the database itself refused a query that didn't satisfy the
predicate, regardless of which code path issued it. Neon has no equivalent:
there is no request-scoped `auth.uid()`, and Drizzle talks to Postgres with
full table access. **Every rule below is now an explicit check in
application code, and if a code path forgets one, nothing else catches it.**

This document is the audit trail for that migration: each policy, and
exactly which file(s) now enforce the equivalent check. Keep it in sync with
`db/schema.ts` — if you add a new table or mutation path, add its
authorization story here too.

---

## sellers

| Policy | Rule | Enforced by |
|---|---|---|
| `sellers_public_read` | anyone can read | No guard needed — used freely in `lib/products.ts`, `components/nav.tsx`, etc. |
| `sellers_own_insert` | `auth.uid() = user_id` | Rows are never user-supplied. Created only by `auth.ts` (`events.createUser`, OAuth/magic-link signup), `app/actions/auth.ts` (`registerWithPassword`), and `lib/prospects.ts` (`getOrCreateHouseSeller`, system-owned). |
| `sellers_own_update` | `auth.uid() = user_id` | `app/dashboard/profile/actions.ts` (`updateProfile`) — `where(eq(sellers.userId, session.user.id))`. |
| `sellers_own_delete` | `auth.uid() = user_id` | Not implemented — no seller-delete action exists in the app, before or after this migration. |

## products

| Policy | Rule | Enforced by |
|---|---|---|
| `products_public_read` | `status = 'live'` | `lib/products.ts` (`listLiveProducts`, `getProductBySlug`) — explicit `eq(products.status, 'live')` on every public read path. |
| `products_seller_all` | seller owns via `sellers.user_id` | Every mutation path re-derives ownership with a join before writing: `app/dashboard/actions.ts` (`updateProductStatus`), `app/dashboard/products/[id]/edit/actions.ts` (`saveProduct`, `deleteProduct`, `regenerateScreenshot`), `lib/products.ts` (owner-preview branch of `getProductBySlug`). Admin bypass is a *separate* gate — `checkAdminAccess` in `app/admin/products/actions.ts` and `app/admin/products/[id]/edit/actions.ts` — not a reuse of the ownership check. |

## sales_pages

| Policy | Rule | Enforced by |
|---|---|---|
| `sales_pages_public_read` | product is live | `lib/products.ts` (`getProductBySlug`) only left-joins `salesPages` after the product row itself has passed the live/owned gate. |
| `sales_pages_seller_all` | seller owns the parent product | `app/dashboard/products/[id]/edit/actions.ts` (`saveProduct`) upserts `salesPages` only after `loadOwnedProduct` has confirmed ownership. |

## purchases

| Policy | Rule | Enforced by |
|---|---|---|
| `purchases_buyer_read` | `auth.uid() = buyer_id` | Not implemented — the app has no "my purchases" page in either version. If one is added, filter by `eq(purchases.buyerId, session.user.id)`. |
| `purchases_buyer_insert` | `auth.uid() = buyer_id` | `app/api/checkout/route.ts` sets `buyer_id` from the session, not from client input. `app/api/stripe/webhook/route.ts` is server-to-server, authenticated by Stripe's signature (`stripe.webhooks.constructEvent`), not a user session — its insert is trusted infrastructure, the same trust boundary Stripe's signature always was. |

## reviews

| Policy | Rule | Enforced by |
|---|---|---|
| `reviews_public_read` | anyone can read | `app/products/[slug]/page.tsx` (`loadSocial`) selects all reviews for a product unconditionally. |
| `reviews_buyer_insert` | `auth.uid() = buyer_id` **and** a `purchases` row exists for `(buyer_id, product_id)` | `app/actions/reviews.ts` (`submitReview`) — explicit session check, then an explicit `purchases` lookup **before** the insert. This is the one check that had no equivalent anywhere else in the app; missing it would have let any signed-in user review anything. |
| `reviews_seller_reply` | current user is the seller of the reviewed product | `app/actions/reviews.ts` (`replyToReview`) — joins `reviews → products → sellers` and compares `sellers.userId` to the session before allowing the update. |

## bookmarks

| Policy | Rule | Enforced by |
|---|---|---|
| `bookmarks_own_all` | `auth.uid() = user_id` | `lib/bookmarks.ts` — every function (`isBookmarked`, `getBookmarkedIds`, `getBookmarkCount`, `toggleBookmark`) filters on `eq(bookmarks.userId, session.user.id)`. |

## messages

| Policy | Rule | Enforced by |
|---|---|---|
| `messages_seller_read` | seller owns the row via `sellers.user_id` | `app/dashboard/messages/page.tsx` — resolves the caller's own `sellers` row from their session first, then filters `eq(messages.sellerId, sellerRow.id)`. |
| `messages_public_insert` | anyone can insert | `app/contact/actions.ts` (`sendSellerMessage`) — no auth required, matching the original (rate-limited + honeypot instead). |

## product_view_events

| Policy | Rule | Enforced by |
|---|---|---|
| `view_events_service_insert` | anyone can insert | `app/api/view/route.ts` — unauthenticated, rate-limited insert. |
| `view_events_seller_read` | seller owns the parent product | Not implemented — no page reads this table directly in either version; the dashboard shows the aggregate `products.views` counter instead. |

## subscribers

| Policy | Rule | Enforced by |
|---|---|---|
| `subscribers_public_insert` | anyone can insert | `app/api/subscribe/route.ts` — unauthenticated, rate-limited upsert. |
| `subscribers_no_public_read` | nobody reads directly | No route selects from `subscribers`. Enforced by omission — there is no read path to forget to guard. |

## user_roles

| Policy | Rule | Enforced by |
|---|---|---|
| `user_roles_no_public_*` (read/insert/update/delete all denied) | admin-tooling only | `lib/admin.ts` is the sole reader/writer (`getUserRole`, `grantRole`, `revokeRole`). Every call site is itself gated: `app/admin/users/actions.ts` (`adminGrantRole`, `adminRevokeRole`) checks `checkAdminAccess` before calling them. |

## admin_audit

| Policy | Rule | Enforced by |
|---|---|---|
| `admin_audit_no_public` | nobody reads directly | `app/admin/audit/page.tsx` gates the read with `checkAdminAccess`. Writes (`logAdminAction` in `lib/admin.ts`) are called only from already-gated admin actions. |

## site_content

| Policy | Rule | Enforced by |
|---|---|---|
| `site_content_public_read` | anyone can read | `lib/content.ts` (`fetchAllOverrides`) — unauthenticated by design; copy needs to render for anonymous visitors. |
| `site_content_no_public_*` (writes denied) | admin-tooling only | `app/admin/content/actions.ts` (`saveContent`, `resetContent`) gate with `checkAdminAccess` before writing. |

## site_settings

| Policy | Rule | Enforced by |
|---|---|---|
| `site_settings_public_read` | anyone can read | `lib/settings.ts` (`fetchAllSettings`) — must be unauthenticated: `proxy.ts` reads `site.maintenance_mode` pre-auth, on every request. |
| `site_settings_no_public_*` (writes denied) | admin-tooling only | `app/admin/settings/actions.ts` (`updateSetting`) gates with `checkAdminAccess`. |

## user_status

| Policy | Rule | Enforced by |
|---|---|---|
| `user_status_public_read` | anyone can read | Table is carried in `db/schema.ts` for parity but **unused** — same state as the Supabase original, where migration 012's own comment says the admin suspend UI was never built ("the admin /admin/users page **should** expose a Suspend toggle"). No read or write path exists in either version. |
| `user_status_no_writes` | no direct writes | N/A — unused, see above. |

## rate_limits

| Policy | Rule | Enforced by |
|---|---|---|
| *(no policies — service-role only)* | | `lib/ratelimit.ts` is the sole reader/writer, called only from server code (route handlers, server actions). Never exposed to a client-filterable query. |

## claim_invites

| Policy | Rule | Enforced by |
|---|---|---|
| *(no policies — service-role only)* | | `app/claim/[token]/page.tsx`, `app/claim/[token]/actions.ts`, `app/claim/[token]/finish/page.tsx`, and `app/admin/prospects/{actions.ts,page.tsx}` are the only touchpoints, all server-side. The claim-finish transfer (`app/claim/[token]/finish/page.tsx`) additionally re-verifies the invite is still in a claimable status inside a transaction, closing the race a double-submitted claim link could otherwise open. |

---

## What changed in the process (not a straight port)

Two authorization gaps were found and closed while doing this mapping —
listed here because the schema comments still describe the *intended*
behavior, and it's worth knowing which parts were actually broken vs. merely
unimplemented:

1. **`submitReview` had no purchase check in application code.** The
   Supabase version relied entirely on `reviews_buyer_insert`'s RLS
   predicate — the insert statement itself never verified the buyer had
   actually purchased the product. Porting the query as-is would have let
   any signed-in user review anything. Fixed by adding the explicit
   `purchases` lookup described above.
2. **`purchases.buyer_id` was `NOT NULL` in the original schema**, but the
   checkout flow supports anonymous purchases (`app/api/checkout/route.ts`
   doesn't require sign-in) and the webhook already inserted `null` for
   guest checkouts (`buyerId: buyerId || null`). The original constraint
   would have thrown on every anonymous purchase. `db/schema.ts` makes the
   column nullable, matching actual intended behavior.

## Verification checklist for future changes

Before adding a new table or a new mutation path:

- [ ] Does this table hold data scoped to a single user or seller? If so,
      every read and write needs an explicit `eq(table.ownerColumn,
      session.user.id)` — there is no RLS to catch a missed filter.
- [ ] Does this action bypass ownership for admins? Gate it with
      `checkAdminAccess` from `lib/admin.ts`, and log the mutation with
      `logAdminAction` — don't reuse or weaken the owner-check path.
- [ ] Add a row to this document.
