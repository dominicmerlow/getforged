-- ═══════════════════════════════════════════════════════════════
-- Migration 014 — review-request email idempotency column
-- sendReviewRequestEmail() (lib/resend.ts) was fully written but never
-- called. Wiring it into the Stripe webhook needs its own timestamp
-- column, following the same pattern as receipt_sent_at / seller_notified_at
-- in migration 006.
-- ═══════════════════════════════════════════════════════════════

alter table purchases
  add column if not exists review_request_sent_at timestamptz;
