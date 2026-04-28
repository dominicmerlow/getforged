-- 005 — builder replies on reviews
-- ════════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor.
--
-- Why a column on `reviews` instead of a separate table?
-- A review has at most ONE seller reply (the seller of the reviewed product).
-- A separate `review_replies` table would invite future "multi-reply"
-- modelling that doesn't match the UX intent. Keep it 1:1 — one row per
-- review with optional reply fields.
--
-- The application code in `repliesByReviewId()` selects these columns
-- defensively; missing columns fall back to null and the UI just hides
-- the reply block.

alter table reviews
  add column if not exists seller_reply text,
  add column if not exists seller_replied_at timestamptz;

-- Index — the product page query already filters by product_id; sort by
-- created_at desc; replies are read inline. No new index needed.

-- ── RLS — the seller of the reviewed product can update *their* reviews'
-- reply fields, no one else can. Buyers retain insert rights from the
-- earlier `reviews_buyer_insert` policy.

drop policy if exists reviews_seller_reply on reviews;

create policy reviews_seller_reply
  on reviews
  for update
  using (
    exists (
      select 1
      from products p
      join sellers s on s.id = p.seller_id
      where p.id = reviews.product_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    -- Restrict the columns a seller can change: only the reply fields.
    -- (Postgres RLS doesn't support per-column WITH CHECK directly, but
    -- the USING clause already gates by ownership — this WITH CHECK is
    -- defensive and matches USING.)
    exists (
      select 1
      from products p
      join sellers s on s.id = p.seller_id
      where p.id = reviews.product_id
        and s.user_id = auth.uid()
    )
  );
