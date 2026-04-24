# FORGE — Complete Code Reference
# Every file in the codebase, in one place. For Claude Code sessions.

---

## REPOSITORY LAYOUT

```
getforged/
├── app/
│   ├── layout.tsx          ← Root HTML, fonts, metadata
│   ├── page.tsx            ← Homepage (composes all sections)
│   └── globals.css         ← All CSS (design tokens, components, responsive)
├── components/
│   ├── nav.tsx             ← Fixed top nav bar
│   ├── hero.tsx            ← Split hero: headline left, floating cards right
│   ├── ticker.tsx          ← Scrolling tech stack ticker
│   ├── how-it-works.tsx    ← 4-step grid
│   ├── product-grid.tsx    ← Filterable product card grid (client component)
│   ├── dual-persona.tsx    ← Builders vs Businesses split section
│   ├── flippa-strip.tsx    ← Exit strategy / Flippa integration strip
│   ├── pricing.tsx         ← 3-tier pricing cards (Starter / Pro / Studio)
│   ├── cta-section.tsx     ← Full-width CTA with ghost text
│   ├── footer.tsx          ← 3-column footer
│   ├── cursor.tsx          ← Custom amber cursor (client component)
│   └── scroll-reveal.tsx   ← IntersectionObserver reveal animation (client)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       ← Browser Supabase client (anon key)
│   │   └── server.ts       ← Server + service role Supabase clients
│   ├── anthropic.ts        ← Claude API: generates sales page JSON
│   ├── firecrawl.ts        ← URL scraper (Firecrawl API + fallback)
│   ├── resend.ts           ← Email: draft-ready notification
│   ├── types.ts            ← All TypeScript interfaces
│   └── utils.ts            ← cn(), formatPrice(), slugify()
├── supabase/
│   └── schema.sql          ← DATABASE SOURCE OF TRUTH
├── index.html              ← Static HTML version of homepage (no React)
└── .env.example            ← All environment variables
```

---

## lib/types.ts — TypeScript Interfaces

```typescript
export type ProductStatus = 'draft' | 'live' | 'archived'
export type PurchaseType = 'licensed' | 'exclusive' | 'subscription'

export interface Seller {
  id: string
  user_id: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  tool_tags: string[] | null
  stripe_account_id: string | null
  verified: boolean
  created_at: string
}

export interface Product {
  id: string
  seller_id: string
  title: string
  tagline: string | null
  description: string | null
  features: Record<string, unknown>[] | null
  use_cases: Record<string, unknown>[] | null
  screenshots: string[] | null
  demo_url: string | null
  video_url: string | null
  price_licensed: number | null
  price_exclusive: number | null
  status: ProductStatus
  slug: string | null
  created_at: string
  seller?: Seller        // joined
  sales_page?: SalesPage // joined
}

export interface SalesPage {
  id: string
  product_id: string
  headline: string | null
  subheadline: string | null
  problem_statement: string | null
  body_copy: Record<string, unknown> | null
  cta_primary: string | null
  cta_secondary: string | null
  meta_title: string | null
  meta_description: string | null
  published_at: string | null
}

export interface Purchase {
  id: string
  buyer_id: string
  product_id: string
  purchase_type: PurchaseType
  amount: number
  stripe_payment_id: string | null
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  buyer_id: string
  rating: 1 | 2 | 3 | 4 | 5
  body: string | null
  created_at: string
}

// Pipeline types (used by n8n webhook payload)
export interface SubmitProductPayload {
  seller_id: string
  product_url: string
  name: string
  category: string
  description?: string
}

export interface GeneratedSalesPage {
  headline: string
  subheadline: string
  problem_statement: string
  features: { title: string; description: string }[]
  use_cases: { title: string; description: string }[]
  cta_primary: string
  cta_secondary: string
  meta_title: string
  meta_description: string
}
```

---

## lib/utils.ts — Helper Functions

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formats number as GBP: 199 → "£199"
export function formatPrice(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Makes URL-safe slugs: "Invoice Bot Pro" → "invoice-bot-pro"
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

---

## lib/supabase/client.ts — Browser Client

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## lib/supabase/server.ts — Server + Service Role Clients

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function cookieMethods(cookieStore) {
  return {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options))
      } catch {} // ignore in Server Components
    },
  }
}

// Use in Server Components — respects user session (anon key)
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods(cookieStore) }
  )
}

// Use in API routes / n8n-triggered endpoints — bypasses RLS (service role)
export async function createServiceClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: cookieMethods(cookieStore) }
  )
}
```

---

## lib/anthropic.ts — Claude API: Sales Page Generator

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { GeneratedSalesPage } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// System prompt tells Claude it's a SaaS copywriter for FORGE
const SYSTEM_PROMPT = `You are a senior SaaS copywriter for GetForged — an AI app marketplace.
Return VALID JSON only. No markdown, no code blocks, no commentary.`

// User prompt includes scraped content (up to 8000 chars) + product name + category
const USER_PROMPT = (scrapedContent: string, productName: string, category: string) => `
Product name: ${productName}
Category: ${category}
Scraped content: ${scrapedContent.slice(0, 8000)}

Generate JSON with: headline, subheadline, problem_statement,
features (4-6 items), use_cases (3-4 items), cta_primary,
cta_secondary, meta_title, meta_description

Rules: Write for UK SME owners. Emphasise time/cost saved.
Tone: confident, direct, no fluff.`

export async function generateSalesPage(
  scrapedContent: string,
  productName: string,
  category: string
): Promise<GeneratedSalesPage> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: USER_PROMPT(scrapedContent, productName, category) }],
    system: SYSTEM_PROMPT,
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  // Strip any accidental markdown code fences
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned) as GeneratedSalesPage
}
```

**Cost:** claude-haiku-4-5 ≈ $0.001/1k tokens ≈ $0.05–0.20 per generated page

---

## lib/firecrawl.ts — URL Scraper

```typescript
// Primary: Firecrawl API (returns clean markdown + metadata)
// Fallback: Native fetch + regex HTML parsing (free, no API key needed)

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) return scrapeUrlFallback(url)  // free fallback

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], actions: [{ type: 'screenshot' }] }),
  })

  const data = await response.json()
  return {
    markdown:    data.data.markdown,
    title:       data.data.metadata?.title,
    description: data.data.metadata?.description,
    screenshot:  data.data.metadata?.ogImage,
  }
}

// ScrapeResult shape: { markdown, title?, description?, screenshot? }
```

---

## lib/resend.ts — Email: Draft Ready Notification

```typescript
// Sends styled HTML email to seller when their AI draft is ready
// Falls back to console.log if RESEND_API_KEY is not set

export async function sendDraftReadyEmail(
  sellerEmail: string,
  sellerName: string,
  productTitle: string,
  productId: string
): Promise<void>

// Email template: dark bg (#0c0b09), amber headline, review button
// Review URL: ${APP_URL}/dashboard/products/${productId}
// From: "GetForged <noreply@getforged.io>"
// Subject: "Your listing draft is ready — {productTitle}"
```

---

## .env.example — All Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key       # safe in frontend
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key             # NEVER in frontend

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Firecrawl (leave blank to use free fallback scraper)
FIRECRAWL_API_KEY=fc-...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@getforged.io

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://getforged.io
GETFORGED_COMMISSION_RATE=0.15
```

---

## app/layout.tsx — Root Layout

```typescript
// Loads 4 Google Fonts via next/font:
//   Bebas Neue  → --font-bebas  (headlines, prices, logo)
//   Instrument Serif → --font-serif (body copy, subtitles)
//   DM Mono    → --font-mono   (tags, labels, code, prices small)
//   Syne       → --font-syne   (UI text, buttons, nav)

// Metadata: title "GetForged — AI App Marketplace"
// OG locale: en_GB
// metadataBase: https://getforged.io
```

---

## app/page.tsx — Homepage Composition

```typescript
// Renders in this order:
// <Cursor />        custom amber cursor
// <Nav />           fixed top nav
// <Hero />          split hero section
// <Ticker />        scrolling tech tags
// <HowItWorks />    4-step grid
// <ProductGrid />   filterable product cards (client)
// <DualPersona />   builders vs businesses
// <FlippaStrip />   exit strategy strip
// <Pricing />       3-tier seller plans
// <CTASection />    final conversion CTA
// <Footer />        3-column footer
// <ScrollReveal />  IntersectionObserver (client)
```

---

## Design Tokens (CSS custom properties)

```css
--ink:    #0c0b09   /* near-black background */
--paper:  #f0ebe2   /* off-white (unused in dark mode) */
--amber:  #e8920a   /* primary accent — all CTAs, prices, highlights */
--amber2: #f5a623   /* hover state for amber */
--rust:   #b83a1a   /* secondary accent — Flippa strip, exclusive tags */
--slate:  #1a1c24   /* card/section backgrounds */
--mid:    #2a2d38   /* mid-tone surfaces */
--dim:    #3e4150   /* dimmed text, disabled states */
--muted:  #7a7670   /* secondary text */
--ghost:  #b8b0a4   /* body text on dark backgrounds */
--white:  #f8f4ee   /* primary text */
--border: rgba(232,146,10,0.18)  /* amber border tint */
--glow:   rgba(232,146,10,0.07)  /* amber glow tint */
```

---

## Seller Plans (from pricing.tsx)

| Plan | Price | Listings | Key Features |
|---|---|---|---|
| Starter | £0/free | 2 | AI page gen, screenshot gallery, basic dashboard |
| Pro | £29/mo | 10 | + Video walkthrough, analytics, Flippa cross-listing |
| Studio | £79/mo | Unlimited | + Live demos, featured placement, dedicated manager |

All plans: 15% commission on sales.

---

## Product Categories (from product-grid.tsx)

Filters: All / AI Automation / Web Apps / CRM & Sales / E-Commerce

Demo products (placeholder until real data):
- InvoiceBot Pro — £149 licensed — AI Automation
- ClientPortal.ai — £1,200 exclusive — Web App
- LeadTrackr — £89/mo — CRM & Sales
- ReviewRadar — £49/mo — Marketing
- ShopBot Assistant — £199 licensed — E-Commerce
- BookingBridge — £299 licensed — Operations

---

## Pages Planned (not yet built)

| Route | Type | Session |
|---|---|---|
| `/` | Public homepage | ✅ Done |
| `/browse` | Public marketplace | Session 2 |
| `/products/[slug]` | Public product listing | Session 8 |
| `/login` | Auth page | Session 3 |
| `/register` | Auth + seller onboarding | Session 3 |
| `/dashboard` | Seller dashboard | Session 7 |
| `/dashboard/products/[id]` | Seller draft review | Session 7 |

---

## supabase/schema.sql — Key Details

File path: `/supabase/schema.sql` — DO NOT duplicate schema elsewhere.

Key constraints:
- `products.status` — CHECK constraint: only 'draft', 'live', 'archived'
- `purchases.purchase_type` — CHECK: only 'licensed', 'exclusive', 'subscription'
- `reviews.rating` — CHECK: integer between 1 and 5
- `reviews(product_id, buyer_id)` — UNIQUE constraint (one review per purchase)
- `sellers.user_id` — UNIQUE (one seller profile per auth user)
- `sales_pages.product_id` — UNIQUE (one sales page per product)

Triggers:
- `on_auth_user_created` → auto-inserts into `sellers` on every new auth signup
- `products_updated_at` → auto-updates `updated_at` on every products row change
- `sales_pages_updated_at` → same for sales_pages

---

## index.html — Static Fallback

The file `index.html` is a self-contained single-file version of the homepage using vanilla HTML, CSS, and JavaScript. No React, no build step. Useful for:
- Quick Framer reference (copy CSS classes and structure directly)
- Previewing design without running Next.js
- Sharing a design preview with non-technical stakeholders

It contains the full design system inline and mirrors the React version exactly.
