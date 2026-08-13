/**
 * Drizzle schema — Neon Postgres.
 *
 * Ported table-for-table from supabase/schema.sql + migrations 001–015 (see
 * that directory for the original Supabase source of truth, kept for
 * historical reference). Column names, defaults and constraints are
 * preserved wherever Postgres syntax allows a direct translation.
 *
 * Two structural changes from the Supabase version:
 *
 *   1. `auth.users` is replaced by `users` here (Auth.js's own table, in the
 *      public schema). Every foreign key that pointed at `auth.users(id)`
 *      now points at `users.id`. `users`/`accounts`/`sessions`/
 *      `verificationTokens` follow the exact shape @auth/drizzle-adapter
 *      expects — don't rename their columns without updating auth.ts.
 *
 *   2. Row Level Security doesn't exist outside Postgres-as-a-service with a
 *      request-scoped `auth.uid()` — Neon has no equivalent, and RLS is not
 *      defined here. Every access rule the old RLS policies encoded is now
 *      an explicit check in application code. See docs/rls-to-app-authz.md
 *      for the policy → guard mapping, kept in lockstep with this file.
 */

import {
  pgTable, pgEnum, uuid, text, timestamp, boolean, integer, smallint,
  numeric, jsonb, primaryKey, uniqueIndex, index,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import type { AdapterAccountType } from '@auth/core/adapters'

/* ────────────────────────────────────────────────────────────────────
   Auth.js core tables — shape is fixed by @auth/drizzle-adapter.
   ──────────────────────────────────────────────────────────────────── */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  // Credentials provider support — null for OAuth/magic-link-only accounts.
  passwordHash: text('password_hash'),
  // Not part of the Auth.js core schema, but cheap and useful for the admin
  // users table. `lastSignInAt` is stamped by the `signIn` event in auth.ts.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
})

export const accounts = pgTable('accounts', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccountType>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
}))

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.identifier, table.token] }),
}))

/**
 * Bridges the register form's "name" field to account creation.
 *
 * The magic-link (Resend) provider only ever carries an email address through
 * to `events.createUser` — there's no request-scoped channel for the extra
 * form field the way Supabase's `signInWithOtp({ options: { data } })` used
 * to provide. The register action writes a row here before sending the link;
 * `events.createUser` in auth.ts reads and deletes it. Falls back to the
 * email's local part if the row is missing or has expired, matching the old
 * Postgres trigger's fallback.
 */
export const pendingDisplayNames = pgTable('pending_display_names', {
  email: text('email').primaryKey(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

/* ────────────────────────────────────────────────────────────────────
   Enums
   ──────────────────────────────────────────────────────────────────── */

export const userRoleEnum = pgEnum('user_role', ['superadmin', 'admin', 'moderator', 'support'])
export const productStatusEnum = pgEnum('product_status', ['draft', 'live', 'archived'])
export const purchaseTypeEnum = pgEnum('purchase_type', ['licensed', 'exclusive', 'subscription'])
export const claimStatusEnum = pgEnum('claim_status', ['sent', 'viewed', 'claimed', 'expired', 'revoked'])

/* ────────────────────────────────────────────────────────────────────
   sellers
   ──────────────────────────────────────────────────────────────────── */

export const sellers = pgTable('sellers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  toolTags: text('tool_tags').array(),
  stripeAccountId: text('stripe_account_id'),
  // Cached from the account.updated webhook (charges_enabled && payouts_enabled
  // && details_submitted) so checkout can gate on it without a live Stripe API
  // call per request. Sellers without this true have no way to receive a
  // split payout — checkout refuses to sell their products until it's true.
  stripePayoutsEnabled: boolean('stripe_payouts_enabled').notNull().default(false),
  verified: boolean('verified').default(false),
  // Migration 015 — house account that owns unclaimed prospect listings.
  isHouseAccount: boolean('is_house_account').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // "At most one house account" — migration 015's partial unique index.
  houseAccountUnique: uniqueIndex('sellers_house_account_unique')
    .on(table.isHouseAccount)
    .where(sql`${table.isHouseAccount} = true`),
}))

/* ────────────────────────────────────────────────────────────────────
   products
   ──────────────────────────────────────────────────────────────────── */

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull().references(() => sellers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  features: jsonb('features').$type<Record<string, unknown>[]>(),
  useCases: jsonb('use_cases').$type<Record<string, unknown>[]>(),
  screenshots: text('screenshots').array(),
  demoUrl: text('demo_url'),
  videoUrl: text('video_url'),
  priceLicensed: numeric('price_licensed', { precision: 10, scale: 2, mode: 'number' }),
  priceExclusive: numeric('price_exclusive', { precision: 10, scale: 2, mode: 'number' }),
  status: productStatusEnum('status').notNull().default('draft'),
  slug: text('slug').unique(),
  sourceUrl: text('source_url'),
  category: text('category'),
  toolTags: text('tool_tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Migration 001 — spec-sheet fields
  platform: text('platform').array(),
  architecture: text('architecture'),
  aiModels: text('ai_models').array(),
  integrations: text('integrations').array(),
  monthlyCost: numeric('monthly_cost', { precision: 10, scale: 2, mode: 'number' }),
  deployTime: text('deploy_time'),
  docsUrl: text('docs_url'),
  repoUrl: text('repo_url'),
  supportTerms: text('support_terms'),
  // Migration 003
  views: integer('views').notNull().default(0),
  // Migration 008 — homepage curation
  featured: boolean('featured').default(false),
  featuredPosition: smallint('featured_position'),
  forgeOfTheWeek: boolean('forge_of_the_week').default(false),
  internalNotes: text('internal_notes'),
  // Migration 015 — prospect/claim flow
  isProspect: boolean('is_prospect').notNull().default(false),
}, (table) => ({
  platformIdx: index('products_platform_idx').using('gin', table.platform),
  aiModelsIdx: index('products_ai_models_idx').using('gin', table.aiModels),
  integrationsIdx: index('products_integrations_idx').using('gin', table.integrations),
  featuredIdx: index('products_featured_idx').on(table.featuredPosition).where(sql`${table.featured} = true`),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(sellers, { fields: [products.sellerId], references: [sellers.id] }),
  salesPage: one(salesPages, { fields: [products.id], references: [salesPages.productId] }),
  reviews: many(reviews),
}))

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  user: one(users, { fields: [sellers.userId], references: [users.id] }),
  products: many(products),
}))

/* ────────────────────────────────────────────────────────────────────
   sales_pages
   ──────────────────────────────────────────────────────────────────── */

export const salesPages = pgTable('sales_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().unique().references(() => products.id, { onDelete: 'cascade' }),
  headline: text('headline'),
  subheadline: text('subheadline'),
  problemStatement: text('problem_statement'),
  bodyCopy: jsonb('body_copy'),
  ctaPrimary: text('cta_primary'),
  ctaSecondary: text('cta_secondary'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

/* ────────────────────────────────────────────────────────────────────
   purchases
   ──────────────────────────────────────────────────────────────────── */

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Nullable, unlike the original Supabase schema's `not null`. Guest
  // checkout (no session at purchase time) is a real path — app/api/checkout
  // doesn't require sign-in, and the Stripe webhook already treated an empty
  // metadata.buyer_id as "insert null." The stricter original constraint
  // would have thrown on every anonymous purchase; not carried forward.
  buyerId: uuid('buyer_id').references(() => users.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  purchaseType: purchaseTypeEnum('purchase_type'),
  amount: numeric('amount', { precision: 10, scale: 2, mode: 'number' }),
  stripePaymentId: text('stripe_payment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  // Migration 006 — idempotent email sends
  receiptSentAt: timestamp('receipt_sent_at', { withTimezone: true }),
  sellerNotifiedAt: timestamp('seller_notified_at', { withTimezone: true }),
  // Migration 014
  reviewRequestSentAt: timestamp('review_request_sent_at', { withTimezone: true }),
  // Stripe Connect — captured at webhook time so the admin refund action can
  // call stripe.refunds.create({ payment_intent }) without a lookup roundtrip.
  // stripePaymentId above stays the Checkout Session id (cs_...) for the
  // existing idempotency constraint; this is the separate PaymentIntent id
  // (pi_...) refunds actually key on.
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  applicationFeeAmount: numeric('application_fee_amount', { precision: 10, scale: 2, mode: 'number' }),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  refundAmount: numeric('refund_amount', { precision: 10, scale: 2, mode: 'number' }),
}, (table) => ({
  // Migration 006 — partial unique index; NULLs (pre-Stripe historical rows)
  // are exempt so the constraint only governs real payment idempotency.
  stripePaymentIdKey: uniqueIndex('purchases_stripe_payment_id_key')
    .on(table.stripePaymentId)
    .where(sql`${table.stripePaymentId} is not null`),
}))

/* ────────────────────────────────────────────────────────────────────
   reviews
   ──────────────────────────────────────────────────────────────────── */

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),
  rating: integer('rating').notNull(),
  body: text('body'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  // Migration 005 — builder reply (1:1, see original migration for why)
  sellerReply: text('seller_reply'),
  sellerRepliedAt: timestamp('seller_replied_at', { withTimezone: true }),
}, (table) => ({
  oneReviewPerBuyer: uniqueIndex('reviews_product_buyer_unique').on(table.productId, table.buyerId),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  buyer: one(users, { fields: [reviews.buyerId], references: [users.id] }),
}))

/* ────────────────────────────────────────────────────────────────────
   error_log
   ──────────────────────────────────────────────────────────────────── */

export const errorLog = pgTable('error_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  scenario: text('scenario'),
  payload: jsonb('payload'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

/* ────────────────────────────────────────────────────────────────────
   bookmarks (migration 002)
   ──────────────────────────────────────────────────────────────────── */

export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userProductUnique: uniqueIndex('bookmarks_user_product_unique').on(table.userId, table.productId),
  userIdx: index('bookmarks_user_idx').on(table.userId),
  productIdx: index('bookmarks_product_idx').on(table.productId),
}))

/* ────────────────────────────────────────────────────────────────────
   messages (migration 002)
   ──────────────────────────────────────────────────────────────────── */

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sellerId: uuid('seller_id').notNull().references(() => sellers.id, { onDelete: 'cascade' }),
  senderUserId: uuid('sender_user_id').references(() => users.id),
  senderName: text('sender_name'),
  senderEmail: text('sender_email').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  sellerIdx: index('messages_seller_idx').on(table.sellerId),
  productIdx: index('messages_product_idx').on(table.productId),
  createdIdx: index('messages_created_idx').on(table.createdAt),
}))

/* ────────────────────────────────────────────────────────────────────
   product_view_events (migration 003)
   ──────────────────────────────────────────────────────────────────── */

export const productViewEvents = pgTable('product_view_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  productIdx: index('view_events_product_idx').on(table.productId),
  timeIdx: index('view_events_time_idx').on(table.viewedAt),
}))

/* ────────────────────────────────────────────────────────────────────
   subscribers (migration 004)
   ──────────────────────────────────────────────────────────────────── */

export const subscribers = pgTable('subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  source: text('source').notNull().default('unknown'),
  unsubscribed: boolean('unsubscribed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  emailSourceUnique: uniqueIndex('subscribers_email_source_unique').on(table.email, table.source),
  emailIdx: index('subscribers_email_idx').on(table.email),
  createdIdx: index('subscribers_created_at_idx').on(table.createdAt),
}))

/* ────────────────────────────────────────────────────────────────────
   user_roles (migration 007)
   ──────────────────────────────────────────────────────────────────── */

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(),
  grantedBy: uuid('granted_by').references(() => users.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.role] }),
  userIdx: index('user_roles_user_idx').on(table.userId),
}))

/* ────────────────────────────────────────────────────────────────────
   admin_audit (migration 007)
   ──────────────────────────────────────────────────────────────────── */

export const adminAudit = pgTable('admin_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  actorEmail: text('actor_email'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  createdIdx: index('admin_audit_created_at_idx').on(table.createdAt),
  actorIdx: index('admin_audit_actor_idx').on(table.actorId),
  targetIdx: index('admin_audit_target_idx').on(table.targetType, table.targetId),
}))

/* ────────────────────────────────────────────────────────────────────
   site_content (migration 009)
   ──────────────────────────────────────────────────────────────────── */

export const siteContent = pgTable('site_content', {
  key: text('key').primaryKey(),
  valueJson: jsonb('value_json').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
}, (table) => ({
  updatedIdx: index('site_content_updated_at_idx').on(table.updatedAt),
}))

/* ────────────────────────────────────────────────────────────────────
   site_settings (migration 010)
   ──────────────────────────────────────────────────────────────────── */

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  valueJson: jsonb('value_json').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
})

/* ────────────────────────────────────────────────────────────────────
   user_status (migration 012)
   ──────────────────────────────────────────────────────────────────── */

export const userStatus = pgTable('user_status', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  isSuspended: boolean('is_suspended').notNull().default(false),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendedBy: uuid('suspended_by').references(() => users.id),
  reason: text('reason'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  suspendedIdx: index('user_status_suspended_idx').on(table.isSuspended).where(sql`${table.isSuspended} = true`),
}))

/* ────────────────────────────────────────────────────────────────────
   rate_limits (migration 013)
   ──────────────────────────────────────────────────────────────────── */

export const rateLimits = pgTable('rate_limits', {
  key: text('key').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull().default(1),
}, (table) => ({
  pk: primaryKey({ columns: [table.key, table.windowStart] }),
}))

/* ────────────────────────────────────────────────────────────────────
   claim_invites (migration 015)
   ──────────────────────────────────────────────────────────────────── */

export const claimInvites = pgTable('claim_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  prospectEmail: text('prospect_email'),
  prospectName: text('prospect_name'),
  source: text('source').notNull(),
  status: claimStatusEnum('status').notNull().default('sent'),
  viewedAt: timestamp('viewed_at', { withTimezone: true }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  claimedBy: uuid('claimed_by').references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: index('claim_invites_token_idx').on(table.token),
  productIdx: index('claim_invites_product_idx').on(table.productId),
  statusIdx: index('claim_invites_status_idx').on(table.status),
}))
