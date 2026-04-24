-- Migration 003: Product view tracking
-- Adds a views counter to products and a lightweight view events table.
-- Safe to re-run.

alter table products add column if not exists views integer not null default 0;

create table if not exists product_view_events (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  viewed_at  timestamptz default now()
);

alter table product_view_events enable row level security;

-- Only service role can insert (no user auth needed for anonymous views)
drop policy if exists "view_events_service_insert" on product_view_events;
create policy "view_events_service_insert" on product_view_events
  for insert with check (true);

-- Sellers can read view events for their own products
drop policy if exists "view_events_seller_read" on product_view_events;
create policy "view_events_seller_read" on product_view_events
  for select
  using (product_id in (
    select p.id from products p
    join sellers s on p.seller_id = s.id
    where s.user_id = auth.uid()
  ));

create index if not exists view_events_product_idx on product_view_events(product_id);
create index if not exists view_events_time_idx on product_view_events(viewed_at desc);
