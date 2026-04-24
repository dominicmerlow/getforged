-- ═══════════════════════════════════════════════════════════════
-- Migration 002 — Bookmarks (wishlist) + Messages (contact seller)
-- Safe to re-run (uses `if not exists`).
-- ═══════════════════════════════════════════════════════════════

-- ── Bookmarks (wishlist) ─────────────────────────────────────────
create table if not exists bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  product_id  uuid references products(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique (user_id, product_id)
);

alter table bookmarks enable row level security;

drop policy if exists "bookmarks_own_all" on bookmarks;
create policy "bookmarks_own_all" on bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists bookmarks_user_idx    on bookmarks(user_id);
create index if not exists bookmarks_product_idx on bookmarks(product_id);

-- ── Messages (buyer → seller) ────────────────────────────────────
create table if not exists messages (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references products(id) on delete cascade not null,
  seller_id      uuid references sellers(id) on delete cascade not null,
  sender_user_id uuid references auth.users(id),
  sender_name    text,
  sender_email   text not null,
  body           text not null,
  created_at     timestamptz default now()
);

alter table messages enable row level security;

-- Sellers see messages addressed to them
drop policy if exists "messages_seller_read" on messages;
create policy "messages_seller_read" on messages
  for select
  using (seller_id in (select id from sellers where user_id = auth.uid()));

-- Anyone (logged in or not) can submit a contact message.
-- Spam control is handled upstream by Resend rate-limits + honeypot field.
drop policy if exists "messages_public_insert" on messages;
create policy "messages_public_insert" on messages
  for insert
  with check (true);

create index if not exists messages_seller_idx  on messages(seller_id);
create index if not exists messages_product_idx on messages(product_id);
create index if not exists messages_created_idx on messages(created_at desc);
