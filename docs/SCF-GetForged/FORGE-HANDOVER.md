# FORGE — Master Handover Document (v3)
**Paste at the start of every Claude Code / AI session.**
Last updated: 2026-04-24. Supersedes v2.

---

## What FORGE is

A marketplace connecting **indie AI builders** (sellers) with **small businesses** (buyers).
- Sellers drop a product URL → the site scrapes it, generates a full sales page with AI, and drops a draft into the seller's dashboard.
- Buyers browse the catalogue, see a spec sheet per product, pay via Stripe.
- Platform takes 15% commission (via Stripe Connect when wired — **currently payouts land in the platform's Stripe; Connect is the next-up item**).

---

## ⚠ Architecture decisions that diverged from v2 handover

The v2 spec assumed **Framer frontend + n8n automation**. We built it differently for the freemium constraints:

| Spec (v2) | Reality (v3) | Reason |
|---|---|---|
| Framer for all pages | **Next.js 16 + React 19** | Single repo, typed, deployable to Vercel's free tier, real SSR |
| n8n on Railway | **Next.js API routes + Server Actions** | No separate service; Vercel Hobby = 100k invocations/mo free |
| Claude API only | **OpenRouter (free models) → Claude fallback** | Zero per-submission cost in happy path; DeepSeek/Gemini/Llama free tier |
| Supabase auth UI | **Magic-link flow via `@supabase/ssr`** | No password UX; one click in/out |
| Framer custom-code embeds | **Native React components** | Type safety, no embed brittleness |

---

## Tech stack + credentials

| Service | Role | Env var(s) |
|---|---|---|
| **Vercel** | Hosting + serverless functions + edge cache | `VERCEL_TOKEN` (for CLI) |
| **Supabase** | Postgres + Auth + RLS | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe** | Payments (Checkout + webhook) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **OpenRouter** | Primary LLM gateway (free models) | `OPENROUTER_API_KEY`, optional `OPENROUTER_MODELS` |
| **Anthropic** | LLM fallback (Claude Haiku 4.5) | `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` |
| **Firecrawl** | URL scraping (falls back to native fetch if absent) | `FIRECRAWL_API_KEY` |
| **Resend** | Transactional email (drafts + receipts + contact-seller) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **App** | Self-reference for redirect URLs | `NEXT_PUBLIC_APP_URL` = `https://getforged.vercel.app` |

> **Critical:** service-role JWT, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `FIRECRAWL_API_KEY`, and the DB password were all pasted through chat during development — **they must be rotated before real users land**.

---

## Repository

- GitHub: `dominicmerlow/getforged` (main branch)
- Vercel: `dominicmerlows-projects/getforged` → https://getforged.vercel.app
- Local workspace: `C:\Users\clift\.Claude\SCF-GetForged\`

```
getforged/
├── app/                                    ← Next.js App Router
│   ├── (public pages)
│   │   ├── page.tsx                        ← Homepage
│   │   ├── browse/page.tsx                 ← Full catalogue
│   │   ├── products/[slug]/page.tsx        ← Detail (auth-aware: shows drafts to owner)
│   │   ├── how-it-works/page.tsx           ← Buyer/seller picker
│   │   ├── how-it-works/buyers/page.tsx    ← 4-step visual walkthrough
│   │   ├── how-it-works/sellers/page.tsx   ← 5-step walkthrough + payout breakdown
│   │   └── checkout/success/page.tsx       ← Post-Stripe landing
│   ├── (auth + seller)
│   │   ├── login/                          ← Magic-link form
│   │   ├── auth/callback/route.ts          ← OTP → session exchange
│   │   ├── dashboard/page.tsx              ← Seller products + approve/archive
│   │   ├── dashboard/products/[id]/edit/   ← Full edit form
│   │   ├── submit/page.tsx                 ← Drop URL → AI-generated draft
│   │   ├── wishlist/page.tsx               ← Saved products
│   │   └── actions/auth.ts                 ← signInWithEmail, signOut
│   ├── api/
│   │   ├── checkout/route.ts               ← Stripe Checkout session create
│   │   └── stripe/webhook/route.ts         ← checkout.session.completed handler
│   └── contact/actions.ts                  ← Send message to seller via Resend
├── components/
│   ├── nav.tsx                             ← Auth-aware nav (sign in / dashboard / wishlist)
│   ├── hero.tsx, footer.tsx, …             ← Homepage sections
│   ├── HowItWorksShared.tsx                ← StepRow, IllustrationFrame, BenefitGrid
│   ├── MultiSelect.tsx                     ← Chip-based multi-select (form-compatible)
│   ├── WishlistButton.tsx                  ← Heart toggle (server component)
│   └── ContactSellerButton.tsx             ← Modal popup (client component)
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── llm.ts                              ← OpenRouter-free → Anthropic fallback
│   ├── anthropic.ts                        ← Direct Anthropic (fallback only)
│   ├── firecrawl.ts                        ← scrapeUrl + native-fetch fallback
│   ├── resend.ts                           ← draft + purchase emails
│   ├── stripe.ts                           ← getStripe, stripeConfigured, commissionRate
│   ├── products.ts                         ← listLiveProducts, getProductBySlug (auth-aware)
│   ├── bookmarks.ts                        ← toggleBookmark, isBookmarked
│   ├── seed-products.ts                    ← 6 demo products (placeholder fallback)
│   ├── video.ts                            ← parseYouTubeId, parseVimeoId
│   ├── utils.ts                            ← cn, formatPrice, slugify
│   └── types.ts                            ← DB row interfaces
├── supabase/
│   ├── schema.sql                          ← Base schema + FIXED on_auth_user_created trigger
│   └── migrations/
│       ├── 001_product_spec_fields.sql     ← platform, architecture, ai_models, …
│       └── 002_bookmarks_and_messages.sql  ← wishlist + contact-seller
├── proxy.ts                                ← Next 16 session-refresh (fka middleware)
├── tailwind.config.ts
└── next.config.ts
```

---

## Database (current state)

### Tables
| Table | Purpose |
|---|---|
| `sellers` | Auto-created on sign-up via trigger |
| `products` | Listings. Status `draft`/`live`/`archived`. Includes spec-sheet columns (`platform[]`, `architecture`, `ai_models[]`, `integrations[]`, `monthly_cost`, `deploy_time`, `docs_url`, `repo_url`, `support_terms`). |
| `sales_pages` | AI-generated + seller-edited marketing copy (1:1 with products) |
| `purchases` | Completed Stripe payments, idempotent via `stripe_payment_id` |
| `reviews` | Star ratings (schema only, no UI yet) |
| `bookmarks` | Wishlist — unique `(user_id, product_id)` |
| `messages` | Contact-seller inbox |
| `error_log` | Recoverable failures from server actions |

### RLS (key policies)
- **products**: public reads only for `status = 'live'`; sellers full access to own
- **sales_pages**: public reads track product visibility; sellers manage own
- **bookmarks**: `auth.uid() = user_id` for all ops
- **messages**: sellers read own; anyone can insert (honeypot-mitigated)
- **error_log**: service-role only

### The critical trigger (easy to break)
```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''           -- ← REQUIRED. Supabase forces empty search_path on definer fns.
as $$
begin
  insert into public.sellers (user_id, display_name)   -- ← fully qualified
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
```
Missing `set search_path` or unqualified names = silent sign-up failure ("Database error saving new user").

---

## Critical flows

### Seller sign-up
```
/login → email → Resend sends magic link → click →
/auth/callback exchanges code → session cookie set →
redirect /dashboard → seller row auto-created by trigger
```

### Product submission (the "magic")
```
/submit (authed) → server action
├─ scrapeUrl()  — Firecrawl, native-fetch fallback
├─ generateSalesPageSmart() — OpenRouter free cascade:
│    DeepSeek V3.1 → Gemini 2.5 Flash → Llama 3.3 → Qwen 2.5 → Nemotron
│    → fallback Anthropic Haiku 4.5
│    → fallback static stub
├─ findUniqueSlug() — retries slug-2, slug-3… on collision
├─ service-role insert products (status=draft) + sales_pages
├─ sendDraftReadyEmail via Resend
└─ return { ok, productId, slug }
```

### Purchase
```
/products/[slug] → "Get a licence" → POST /api/checkout →
Stripe session with metadata { product_id, purchase_type, buyer_id } →
Stripe → checkout.session.completed webhook →
verify signature → idempotency on stripe_payment_id →
service-role insert purchases → sendPurchaseReceiptEmail →
redirect /checkout/success
```

### Contact seller
```
Product detail → "Message seller →" → modal →
submit → app/contact/actions.ts →
service-role resolves seller's auth.users.email →
Resend email with replyTo = sender's email →
persist messages row (regardless of email outcome)
```

### Wishlist
```
WishlistButton form post → toggleBookmark() →
auth check → insert or delete → revalidatePath
```

---

## Design system (current)

- **Palette (light)**: `--cream #fbf6ec` bg, `--warm-ink #2a2217` text, `--soft-amber #b97314` accents
- **Fonts**:
  - `Fraunces` (variable, `opsz` + `SOFT` axes) — display serif, weight 500-600 upright (italic reserved for inline accent spans)
  - `Montserrat` 300-700 — UI / body sans
  - `Bebas Neue` — numeric callouts
  - `DM Mono` — labels, eyebrows, spec keys
- **Tone**: "Built by builders. Made for business." Direct, no fluff.
- **Currency**: GBP (en-GB Intl formatter)

Theme is implemented as a cascade override at the end of `app/globals.css` — original dark palette still exists in the file but superseded by later rules.

---

## Routes map (current)

| Path | Mode | Purpose |
|---|---|---|
| `/` | Static | Homepage |
| `/browse` | Static ISR 60s | Catalogue with wishlist hearts |
| `/products/[slug]` | Dynamic (auth-aware) | Detail; draft preview for owner |
| `/how-it-works` | Static | Buyer/seller picker |
| `/how-it-works/buyers` | Static | 4-step visual walkthrough |
| `/how-it-works/sellers` | Static | 5-step walkthrough + payout breakdown |
| `/login` | Dynamic | Magic-link form |
| `/auth/callback` | Route | OTP exchange |
| `/dashboard` | Dynamic | Seller products + approve/archive |
| `/dashboard/products/[id]/edit` | Dynamic | Full edit form |
| `/submit` | Dynamic | New product submission |
| `/wishlist` | Dynamic | Saved products |
| `/checkout/success` | Dynamic | Post-Stripe landing |
| `/api/checkout` | Route (nodejs) | Stripe session create |
| `/api/stripe/webhook` | Route (nodejs) | Payment confirmations |

---

## Seed test data

- Live user: `cliftonflack` (display_name from email prefix)
- Seller row id: `3010c461-7394-48f3-9305-85a5bd7e2917`

---

## Build + deploy

```bash
# Local dev
npm install
npm run dev

# Build check
npx next build

# Deploy to prod
npx vercel deploy --prod --yes      # requires prior auth or VERCEL_TOKEN

# Env vars
npx vercel env ls
npx vercel env add SOMENAME production
npx vercel env pull .env.local      # for local dev
```

---

## Status vs original 8-session plan

| # | Session | Status |
|---|---|---|
| 1 | Supabase foundation | ✅ |
| 2 | Site structure (5 templates) | ✅ — Next.js, not Framer |
| 3 | Seller registration | ✅ — magic-link |
| 4 | Product submission form | ✅ |
| 5 | Scraping + LLM generation | ✅ — OpenRouter primary, Anthropic fallback |
| 6 | Supabase write + email | ✅ |
| 7 | Seller draft review | ✅ — dashboard + full edit form |
| 8 | Public listing + detail | ✅ |

Also shipped beyond v2 plan: wishlist, contact-seller popup, screenshot rendering, YouTube/Vimeo embed, multi-select dropdowns, auth-aware draft preview, buyers + sellers how-it-works pages, Fraunces + Montserrat typography, light-theme redesign.

---

## Next-up backlog

### 🔴 Blockers for real sales
1. **Stripe Connect** — split payments into seller payout + 15% platform commission. Currently all funds land in the platform's Stripe account. Requires Connect Express onboarding + `transfer_data.destination` on checkout + Connect account webhooks. (~2-3 hours.)
2. **Rotate all credentials** pasted through chat during development.

### 🟡 Worth doing soon
3. **Screenshot upload** via Supabase Storage (currently only scrapes og:image from Firecrawl).
4. **Seller profile editor** — display_name, bio, avatar, Stripe Connect account link.
5. **Reviews UI** — schema + RLS exists; no form or display yet.
6. **Search + category filter on `/browse`** (homepage filter is CTA-only).
7. **Seller inbox UI** — view received messages at `/dashboard/messages`.

### 🟢 Polish
8. Subscription pricing (schema supports it, flow doesn't).
9. Seller analytics (views, conversion rate).
10. Admin dashboard (moderate submissions, refund handling).
11. `sitemap.xml`, `robots.txt`, per-product OG images.
12. Replace homepage "340+ products" stat with real count.

---

## Build rules (for future sessions)

1. **Server Actions are the default** — `/api/*` only for Stripe webhooks and non-browser clients.
2. **Service role for writes bypassing auth** (webhooks, triggers); anon/user client otherwise — RLS does authorization.
3. **Every field a seller can edit must also render on the public detail page.** Parity is the contract.
4. **Graceful fallback at every external boundary**: Firecrawl → native fetch; OpenRouter → Anthropic → stub; Resend failure → DB row still persists; Supabase unreachable → seed data.
5. **Every `SECURITY DEFINER` function needs `set search_path = ''` + fully-qualified table names.** Non-negotiable.
6. **Migrations are additive + idempotent**: always `if not exists`, always `drop policy if exists` before re-creating.
7. **`<MultiSelect>` stores CSV in a hidden input** so server actions get strings, not JSON.
8. **Never commit secrets.** All env vars go through `vercel env add`. Placeholders in `.env.example` are detected by the `*Configured()` helpers and trigger graceful fallback.

---

## Quick-reference commands

```bash
# Apply migration
# → paste supabase/migrations/00X_*.sql into Supabase SQL Editor

# Smoke-test a deployed route
curl -sI https://getforged.vercel.app/browse

# Confirm RLS returns expected shape with anon key
curl -s 'https://rpbjomxkwrwrsydpqkmg.supabase.co/rest/v1/products?select=id&limit=1' \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# List seller rows (should match auth.users count if trigger healthy)
curl -s 'https://rpbjomxkwrwrsydpqkmg.supabase.co/rest/v1/sellers?select=id,display_name' \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
