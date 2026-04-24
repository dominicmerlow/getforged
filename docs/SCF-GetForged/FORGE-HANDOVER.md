# FORGE — Master Handover Document
# Session Context File v2 — paste at the start of every Claude Code session

---

## WHAT IS FORGE?

FORGE is an AI builder marketplace connecting AI developers (sellers) with small businesses (buyers).

- **Sellers** submit a product URL → AI auto-generates a full sales page
- **Buyers** browse and buy licences or exclusive ownership of AI-built tools

The business charges a platform commission on each sale.

---

## YOUR TECH STACK

| Service | Role | Tier | Where to find credentials |
|---|---|---|---|
| Framer | Frontend / CMS (all pages) | Free | framer.com → your project |
| Supabase | Database + Auth | Free | supabase.com → Project Settings → API |
| n8n (Railway) | Automation engine (all logic) | Free | railway.app → your n8n service |
| Firecrawl | Scrapes seller product URLs | Free 500/mo | firecrawl.dev → API Keys |
| Claude API (Anthropic) | Generates sales page copy | Pay ~$0.20/page | console.anthropic.com → API Keys |
| Resend | Sends emails to sellers/buyers | Free 3k/mo | resend.com → API Keys |
| Stripe | Payments + seller payouts | Free + % | dashboard.stripe.com → Developers → API Keys |
| GitHub | Code repository | Free | github.com/dominicmerlow/getforged (private) |
| Vercel | Hosting (optional — currently Framer) | Free | vercel.com |

---

## YOUR CREDENTIALS (fill these in — keep this file private)

```
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

ANTHROPIC_API_KEY=sk-ant-[YOUR-KEY]
FIRECRAWL_API_KEY=fc-[YOUR-KEY]
RESEND_API_KEY=re_[YOUR-KEY]

STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR-KEY]
STRIPE_SECRET_KEY=sk_live_[YOUR-KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR-KEY]

N8N_URL=https://[YOUR-N8N-URL].railway.app
DOMAIN=https://[YOUR-DOMAIN]
PLATFORM_COMMISSION=0.20
```

> SECURITY: Never paste your service_role key or any sk_ keys into Framer or any frontend.
> Only use the ANON key in Framer. All secret keys go into n8n credentials only.

---

## DATABASE TABLES (Supabase)

All tables live in the `public` schema. Schema file: `supabase/schema.sql`

| Table | Purpose | Key columns |
|---|---|---|
| `sellers` | Seller profiles | user_id (FK auth.users), display_name, stripe_account_id, verified |
| `products` | Product listings | seller_id, title, slug, status (draft/live/archived), price_licensed, price_exclusive |
| `sales_pages` | AI-generated copy | product_id, headline, body_copy (jsonb), published_at |
| `purchases` | Buyer transactions | buyer_id, product_id, purchase_type, amount, stripe_payment_id |
| `reviews` | Product ratings | product_id, buyer_id, rating (1-5), body |
| `error_log` | n8n error capture | scenario, payload (jsonb), error_message |

### RLS Rules Summary

- **sellers**: Anyone can read; only the owner can edit/delete their own row
- **products**: Only live products are public; sellers can manage their own
- **sales_pages**: Only published (live product) pages are public; sellers can manage their own
- **purchases**: Buyers can only see and create their own purchases
- **reviews**: Anyone can read; only verified buyers can leave reviews for products they bought
- **error_log**: No public access — only writable via service_role (n8n)

### Auto-Trigger on Signup

When a user signs up via Supabase Auth, a database trigger (`on_auth_user_created`) automatically creates a row in `sellers` using their email prefix as `display_name`.

---

## BUILD SESSIONS STATUS

| Session | Goal | Status |
|---|---|---|
| 1 | Supabase Foundation — schema, auth, RLS | ✅ COMPLETE |
| 2 | Framer Site Structure — 5 page templates | ⬜ NEXT |
| 3 | Seller Registration Flow | ⬜ |
| 4 | Product Submission Form | ⬜ |
| 5 | n8n Workflow — Firecrawl + Claude API (page generation) | ⬜ |
| 6 | n8n Workflow — Supabase write + Resend email | ⬜ |
| 7 | Seller Draft Review Interface | ⬜ |
| 8 | Public Product Listing Page | ⬜ |

---

## CRITICAL PATH (how the product works end-to-end)

```
Seller signs up (Supabase Auth)
  → seller row auto-created in DB
  → Seller fills product submission form (Framer)
  → n8n receives webhook from Framer form
  → n8n calls Firecrawl to scrape the product URL
  → n8n calls Claude API with scraped content
  → Claude generates sales page JSON
  → n8n writes product + sales_page rows to Supabase
  → n8n sends seller a review email (Resend)
  → Seller reviews draft in Framer dashboard
  → Seller approves → product status set to 'live'
  → Buyer views public product listing (Framer)
  → Buyer clicks buy → Stripe Checkout
  → Stripe webhook → n8n confirms payment
  → n8n writes purchase row to Supabase
  → Buyer receives access email (Resend)
```

---

## REPOSITORY STRUCTURE

```
getforged/
├── app/               ← Next.js pages (layout, homepage)
├── components/        ← React UI components (nav, hero, grid, etc.)
├── lib/               ← Integration libraries
│   ├── supabase/      ← Browser + server Supabase clients
│   ├── anthropic.ts   ← Claude API: sales page generation
│   ├── firecrawl.ts   ← URL scraping (Firecrawl + fallback)
│   ├── resend.ts      ← Email sending
│   ├── types.ts       ← TypeScript interfaces for all DB tables
│   └── utils.ts       ← Helpers: slugify, formatPrice, cn
├── supabase/
│   └── schema.sql     ← THE SINGLE SOURCE OF TRUTH for DB schema
├── docs/
│   ├── SCF-GetForged/ ← These session context files (paste into Claude)
│   └── specs/         ← Original spec docs (.docx)
└── .env.example       ← Environment variable template
```

---

## DESIGN SYSTEM

- **Colors:** Ink (black), Amber (primary accent), Rust (secondary accent), Paper (off-white background)
- **Fonts:** Bebas Neue (headlines), Instrument Serif (body), DM Mono (code/prices), Syne (UI labels)
- **Currency:** GBP (British pounds) — `formatPrice()` uses Intl.NumberFormat with 'en-GB'
- **Tone:** Direct, no fluff. "Built by AI. Sold to businesses." energy.

---

## HOW TO USE THESE FILES WITH CLAUDE CODE

At the start of every new Claude Code session:
1. Open `FORGE-HANDOVER.md` (this file)
2. Paste the entire contents into your first message
3. Tell Claude which session you're working on
4. Claude will have full context to continue building

For session-specific logs, see `SESSION-LOG.md` in this folder.

---

## BUILD RULES (so Claude follows your architecture)

1. **No custom backend code** unless absolutely necessary
2. **All automation logic lives in n8n** — not in Next.js API routes
3. **All data reads/writes use Supabase REST API** — no ORM
4. **All frontend is Framer** — the Next.js code in this repo is a reference/backup
5. **Framer custom code embeds** are used for Supabase calls from the browser
6. **The anon key only** goes in Framer embeds — never the service_role key
7. **Error logging:** all n8n workflow errors write to the `error_log` table
