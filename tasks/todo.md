# GetForged — Fiverr-style redesign + platform migration

**Decisions (confirmed 2026-07-30)**
- Keep GetForged amber `#e8920a`; adopt Fiverr's *structure*, not its green.
- Back-end = restyle `/admin` + `/dashboard`. No schema changes in Phase 1.
- Imagery from Pexels for hero/category/value-prop art only. Product thumbs stay honest.
- Supabase project is dev/empty → **greenfield rebuild** on Neon. No data export needed.
- Sequencing: **Phase 1 redesign → Phase 2 migration.** `lib/*` signatures are the contract between them.
- Auth.js providers: magic link (Resend) + Google + GitHub + email/password.

Design system: [design-system/MASTER.md](../design-system/MASTER.md)

---

## Phase 1 — Fiverr-style redesign

### 1.1 Foundation
- [ ] `app/layout.tsx` — swap fonts to Plus Jakarta Sans + Inter; rebind `--font-serif`/`--font-mono`/`--font-bebas` so ~470 legacy inline refs de-serif automatically
- [ ] `app/globals.css` — replace the dark-theme + cream-override stack with one token layer + Fiverr component CSS; rebind legacy colour tokens (`--warm-ink`, `--cream`, `--soft-amber`, `--ink`, `--amber`…) so ~440 inline refs migrate untouched
- [ ] `tailwind.config.ts` — new palette + font families
- [ ] Remove grain overlay, custom cursor, marquee ticker

### 1.2 Imagery
- [ ] Fetch Pexels art (hero, 6 category tiles, 2 value-prop) → `public/img/`
- [ ] Record attribution in `public/img/CREDITS.md`

### 1.3 Core components
- [ ] `components/nav.tsx` — sticky two-row header: logo · search · nav · Sign in · List your app
- [ ] `components/SearchBar.tsx` (new, client) — the primary homepage CTA
- [ ] `components/CategoryBar.tsx` (new) — scrollable category row under the header
- [ ] `components/GigCard.tsx` (new) — the listing card; `New` pill when a listing has no reviews (never a fabricated score)
- [ ] `components/CarouselRow.tsx` (new, client) — scroll-snap row with arrow controls
- [ ] `components/CategoryTiles.tsx` (new)
- [ ] `components/TrustStrip.tsx` (new) — replaces the marquee ticker

### 1.4 Homepage
- [ ] `components/hero.tsx` — search-first, half-height, Pexels art
- [ ] `components/product-grid.tsx` → carousel rows by category
- [ ] `components/how-it-works.tsx`, `dual-persona.tsx`, `pricing.tsx`, `cta-section.tsx`, `flippa-strip.tsx`
- [ ] `components/footer.tsx` — dense 5-column
- [ ] `app/page.tsx` — section order: Hero → Categories → Featured → Trust → Seller CTA

### 1.5 Browse + detail
- [ ] `components/BrowseClient.tsx` — left filter rail, sort control, gig grid
- [ ] `app/browse/page.tsx`, `app/browse/[category]/page.tsx`
- [ ] `app/products/[slug]/page.tsx` — gallery left, sticky package card right

### 1.6 Back-office
- [ ] `app/admin/layout.tsx` + `components/AdminTabs.tsx` → sidebar shell, grey canvas
- [ ] Stat tiles + data tables across `/admin/*`
- [ ] `app/dashboard/*` — seller console in the same language

### 1.7 Verify
- [ ] Dev server: every route renders, no console errors
- [ ] 375 / 768 / 1024 / 1440 — no horizontal scroll
- [ ] Contrast, focus rings, `aria-label` on icon buttons, `prefers-reduced-motion`
- [ ] `npm run build` clean

---

## Phase 2 — Supabase → Neon + Auth.js + Vercel Blob

> **The risk here is authorization, not SQL.** 38 RLS policies currently enforce access *in the database*. On Neon every one becomes an explicit check in app code. A missed check is a silent data leak, not a build error.

### 2.1 Data layer
- [ ] Add `@neondatabase/serverless` + `drizzle-orm`; `DATABASE_URL` to env
- [ ] Port `supabase/schema.sql` + 15 migrations → Drizzle schema (16 tables)
- [ ] Rewrite `lib/*` against Drizzle, keeping every exported signature identical
- [ ] Port each of the 38 RLS policies to an explicit guard; document the mapping in `docs/rls-to-app-authz.md`

### 2.2 Auth
- [ ] Auth.js v5 + Drizzle adapter; providers: Resend magic link, Google, GitHub, credentials
- [ ] Replace 45 `supabase.auth.getUser()` call sites with `auth()`
- [ ] Rewrite `app/login`, `app/register`, `app/auth/callback`, `app/actions/auth.ts`
- [ ] Re-point `lib/admin.ts` admin gate; re-verify the fail-closed behaviour from commit `ebdb0f7`
- [ ] Replace Supabase session refresh in `proxy.ts` middleware

### 2.3 Blob
- [ ] `@vercel/blob` + upload route for seller screenshots (new capability — nothing to migrate)
- [ ] Wire into `app/dashboard/products/[id]/edit`

### 2.4 Cutover
- [ ] Delete `lib/supabase/*`, drop the dependency, update `.env.example`
- [ ] Seed Neon from `lib/seed-products.ts`
- [ ] Full auth + purchase regression pass

---

## Review — Phase 1 (complete)

**Verified:** `npx tsc --noEmit` clean · `npm run build` compiled successfully · all 26 routes return
200/307/404 as expected, none hitting the error boundary · no horizontal scroll at 375/605/1280/1440 ·
zero images without `alt`, zero interactive elements without an accessible name.

### The lever that made this tractable
Rather than editing 80+ files, the four legacy font variables and ~20 legacy colour variables were
**rebound** in `:root`. `--font-serif`/`--font-mono` now resolve to Inter, `--font-bebas` to Plus
Jakarta, and `--warm-ink`/`--cream`/`--soft-amber`/`--ink` to the new palette. That migrated roughly
**910 inline `var(...)` references** across pages nobody touched, and dropped three font families
(Fraunces, DM Mono, Bebas Neue) off the critical path. Legacy class names (`.product-card`,
`.section-title`, `.btn-amber`…) were restyled in place rather than renamed, for the same reason.

### Bugs found and fixed along the way
- **Product page 500'd without Supabase env vars.** It called `createClient()` unguarded while every
  other route degraded to seed data. Reviews and purchase state now load through `loadSocial()`,
  which fails soft. Same fix applied to `WishlistButton` and `/wishlist`.
- **N+1 on every grid.** `WishlistButton` ran its own auth + bookmark query per card. Added
  `getBookmarkedIds()` — one query per page, passed down to `CardSaveButton`.
- **Dead control.** The Flippa strip's "Learn about exits" was a bare `<button>` that did nothing.
- **Fabricated trust signals avoided.** Listings with no reviews show a `New` pill, never a placeholder
  score, and `aggregateRating` is omitted from JSON-LD unless real reviews exist.

### Deliberately not done
- Individual `/admin/*` page bodies (products table, users, audit, content, settings) still use their
  original markup. They inherit the new palette, typography and console shell, so they're coherent —
  but their tables aren't hand-converted to `.gf-table`. Worth a follow-up pass.
- `getProductBySlug` doesn't pass a rating index to `dbToListItem`; the detail page computes its own
  average from the full review list, so nothing is wrong, but the two paths could be unified.

### Removed
`components/ticker.tsx`, `components/cursor.tsx`, `components/product-grid-filter.tsx` — zero
importers after the redesign. Also gone: the grain overlay, the custom cursor, the marquee, the
full-viewport hero, and the display serif.

---

## Review — Phase 2 (complete)

**Verified:** `npx tsc --noEmit` clean · `npm run build` compiled successfully (38 routes) · full
route sweep returns 200/307 as expected on every route except Auth.js's own `/api/auth/session`,
which 500s only because this sandbox has no real `AUTH_SECRET`/`DATABASE_URL` — resolves once those
are set on a real deployment.

### What moved
- **Schema:** all 17 Supabase tables ported to `db/schema.ts` (Drizzle), plus Auth.js's own
  `users`/`accounts`/`sessions`/`verificationTokens`. `supabase/` kept as historical reference, no
  longer read by the app.
- **Auth:** Supabase Auth → Auth.js v5 (`auth.ts`), JWT sessions, four providers (Google, GitHub,
  Resend magic link, email+password via `bcryptjs`). `events.createUser` replaces the old
  `handle_new_user` Postgres trigger — every new account gets exactly one `sellers` row.
- **Data access:** every `supabase.from(...)` / `supabase.auth.getUser()` across 54 files replaced
  with Drizzle queries / `auth()`. Zero references to `@supabase/*` remain in application code.
- **Storage:** `@vercel/blob` wired for seller screenshot uploads (`app/api/upload`,
  `components/ScreenshotUploader.tsx`) — a new capability, not a migration; the Supabase app had no
  file storage at all.
- **Claim flow:** the old `/auth/callback?claim=TOKEN` custom route doesn't exist under Auth.js.
  Replaced with `app/claim/[token]/finish/page.tsx`, which Auth.js's `redirectTo` lands on directly
  after magic-link verification — no custom callback route needed at all.

### The real risk, and how it was handled
RLS doesn't exist on Neon. Every one of the 38 Supabase policies is now an explicit check in
application code — mapped policy-by-policy in
[docs/rls-to-app-authz.md](../docs/rls-to-app-authz.md), which also documents two gaps the mapping
exercise caught and closed:
- `submitReview` had **no purchase check in app code** — the Supabase version relied entirely on
  RLS to stop non-buyers from reviewing. A straight port would have shipped that hole open.
- `purchases.buyer_id` was `NOT NULL` in the original schema despite the webhook already inserting
  `null` for guest checkouts — would have thrown on every anonymous purchase. Made nullable.

### Bugs fixed along the way (found while porting, not introduced by it)
- `GigCard.tsx`'s optimized `next/image` had no `remotePatterns` entry for Firecrawl's screenshot
  domain (which varies per capture) — would have thrown at runtime for any real screenshot. Now
  `unoptimized`, matching the product-detail gallery's existing handling of the same problem.
- `app/api/view/route.ts`'s view counter used read-then-write (a race under concurrent views) — now
  a single atomic `SQL` increment.
- Privacy policy (`app/privacy/page.tsx`) named Supabase as a sub-processor and made specific
  certification claims about it — updated to name Neon, Auth.js, Google/GitHub OAuth accurately
  rather than carrying stale legal claims forward.

### Deliberately not done
- `next lint` doesn't run — Next 16 removed the `next lint` subcommand and the project has no flat
  `eslint.config.js` yet. Pre-existing gap, not introduced by this migration; `tsc --noEmit` and
  `next build`'s own type-check are the correctness gates that actually ran clean.
- No live database, OAuth apps, or Resend-verified domain exist in this environment — the write
  paths (insert/update/delete across every table) are typechecked and structurally verified against
  the schema, but not exercised against a running Postgres. Needs a smoke test against a real Neon
  branch before shipping.
- `user_status` (suspension) table is carried in the schema for parity but stays unused — matching
  the original, which scaffolded it in migration 012 but never wired a UI.

### Required before this runs for real
Set in `.env.local` / Vercel env — all documented with setup links in `.env.example`:
`DATABASE_URL` (Neon) · `AUTH_SECRET` · `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` ·
`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` · `BLOB_READ_WRITE_TOKEN` (Vercel Blob). Then
`npx drizzle-kit push` once to create the schema on the new database.
