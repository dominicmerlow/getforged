import type { products, sellers, salesPages, purchases, reviews } from '@/db/schema'

// ── Row types — inferred from the Drizzle schema, camelCase ─────────────
// These replace the hand-written snake_case interfaces that used to mirror
// Supabase's PostgREST JSON shape. Field access on these types is now
// `product.priceLicensed`, not `product.price_licensed` — every consumer
// was updated at its call site when its data source moved to Drizzle.
export type ProductStatus = 'draft' | 'live' | 'archived'
export type PurchaseType = 'licensed' | 'exclusive' | 'subscription'

export type Seller = typeof sellers.$inferSelect
export type Product = typeof products.$inferSelect
export type SalesPage = typeof salesPages.$inferSelect
export type Purchase = typeof purchases.$inferSelect
export type Review = typeof reviews.$inferSelect

// ── Pipeline types ──────────────────────────────────────────────
// Not DB row shapes — these describe the AI sales-page-generation pipeline's
// input/output and stay hand-written.
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
