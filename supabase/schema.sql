-- ═══════════════════════════════════════════════════════════════
-- GETFORGED — Supabase Schema
-- Run this once in your Supabase project → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── Enable UUID extension ────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── sellers ──────────────────────────────────────────────────────
create table if not exists sellers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null unique,
  display_name     text not null,
  bio              text,
  avatar_url       text,
  tool_tags        text[],
  stripe_account_id text,
  verified         boolean default false,
  created_at       timestamptz default now()
);

-- ── products ─────────────────────────────────────────────────────
create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid references sellers(id) on delete cascade not null,
  title            text not null,
  tagline          text,
  description      text,
  features         jsonb,
  use_cases        jsonb,
  screenshots      text[],
  demo_url         text,
  video_url        text,
  price_licensed   numeric(10,2),
  price_exclusive  numeric(10,2),
  status           text default 'draft' check (status in ('draft','live','archived')),
  slug             text unique,
  source_url       text,
  category         text,
  tool_tags        text[],
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── sales_pages ──────────────────────────────────────────────────
create table if not exists sales_pages (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid references products(id) on delete cascade not null unique,
  headline           text,
  subheadline        text,
  problem_statement  text,
  body_copy          jsonb,
  cta_primary        text,
  cta_secondary      text,
  meta_title         text,
  meta_description   text,
  published_at       timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ── purchases ────────────────────────────────────────────────────
create table if not exists purchases (
  id                 uuid primary key default gen_random_uuid(),
  buyer_id           uuid references auth.users(id) not null,
  product_id         uuid references products(id) not null,
  purchase_type      text check (purchase_type in ('licensed','exclusive','subscription')),
  amount             numeric(10,2),
  stripe_payment_id  text,
  created_at         timestamptz default now()
);

-- ── reviews ──────────────────────────────────────────────────────
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade not null,
  buyer_id    uuid references auth.users(id) not null,
  rating      integer check (rating between 1 and 5),
  body        text,
  created_at  timestamptz default now(),
  unique(product_id, buyer_id)
);

-- ── error_log ────────────────────────────────────────────────────
create table if not exists error_log (
  id            uuid primary key default gen_random_uuid(),
  scenario      text,
  payload       jsonb,
  error_message text,
  created_at    timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

alter table sellers     enable row level security;
alter table products    enable row level security;
alter table sales_pages enable row level security;
alter table purchases   enable row level security;
alter table reviews     enable row level security;
alter table error_log   enable row level security;

-- ── sellers policies ─────────────────────────────────────────────
create policy "sellers_public_read"   on sellers for select using (true);
create policy "sellers_own_insert"    on sellers for insert with check (auth.uid() = user_id);
create policy "sellers_own_update"    on sellers for update using (auth.uid() = user_id);
create policy "sellers_own_delete"    on sellers for delete using (auth.uid() = user_id);

-- ── products policies ────────────────────────────────────────────
create policy "products_public_read"  on products for select using (status = 'live');
create policy "products_seller_all"   on products for all
  using (seller_id in (select id from sellers where user_id = auth.uid()));

-- ── sales_pages policies ─────────────────────────────────────────
create policy "sales_pages_public_read" on sales_pages for select
  using (product_id in (select id from products where status = 'live'));
create policy "sales_pages_seller_all"  on sales_pages for all
  using (product_id in (
    select p.id from products p
    join sellers s on p.seller_id = s.id
    where s.user_id = auth.uid()
  ));

-- ── purchases policies ───────────────────────────────────────────
create policy "purchases_buyer_read"  on purchases for select using (auth.uid() = buyer_id);
create policy "purchases_buyer_insert" on purchases for insert with check (auth.uid() = buyer_id);

-- ── reviews policies ─────────────────────────────────────────────
create policy "reviews_public_read"   on reviews for select using (true);
create policy "reviews_buyer_insert"  on reviews for insert
  with check (
    auth.uid() = buyer_id and
    buyer_id in (select buyer_id from purchases where product_id = reviews.product_id)
  );

-- ── error_log: service_role only (no user policy) ────────────────

-- ═══════════════════════════════════════════════════════════════
-- UTILITY FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at    before update on products    for each row execute function update_updated_at();
create trigger sales_pages_updated_at before update on sales_pages for each row execute function update_updated_at();

-- Auto-create seller profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into sellers (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
