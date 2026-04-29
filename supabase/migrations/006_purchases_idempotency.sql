-- 006 — purchases idempotency hardening
-- ════════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor.
--
-- Background: the Stripe webhook used a SELECT-then-INSERT pattern keyed
-- on `stripe_payment_id`. This has a TOCTOU window — two concurrent
-- webhook retries can both read "no existing row" and both INSERT,
-- creating duplicate purchase rows and double-emails.
--
-- Fix: a UNIQUE constraint on `stripe_payment_id` makes idempotency atomic.
-- The webhook then INSERTs unconditionally and treats unique-violation
-- (Postgres error code 23505) as "this is a retry, succeed silently".
--
-- Also adds two timestamp columns so receipt + seller-notification emails
-- become independently idempotent — if the first delivery fails, the
-- next retry can resend without double-sending the receipt.

-- Drop any pre-existing duplicate rows before adding the constraint.
-- "Keep oldest" strategy — the first row wins; later duplicates are deleted.
delete from purchases p
where p.stripe_payment_id is not null
  and p.id <> (
    select min(p2.id::text)::uuid
    from purchases p2
    where p2.stripe_payment_id = p.stripe_payment_id
  );

-- Atomic idempotency primitive — partial index ignores the historical NULLs.
create unique index if not exists purchases_stripe_payment_id_key
  on purchases (stripe_payment_id)
  where stripe_payment_id is not null;

-- Independent email-send tracking so retries can resend on failure.
alter table purchases
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists seller_notified_at timestamptz;
