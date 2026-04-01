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
  // joined
  seller?: Seller
  sales_page?: SalesPage
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

// ── Pipeline types ──────────────────────────────────────────────
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
