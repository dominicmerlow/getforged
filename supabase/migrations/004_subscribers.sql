-- 004 — newsletter subscribers (Forge of the Week + buyer-need waitlist)
-- ═══════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor. The application code in
-- `app/api/subscribe/route.ts` no-ops gracefully if this table is missing,
-- so deploys won't break before the migration runs.

create table if not exists subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  source        text not null default 'unknown',  -- 'homepage', 'blog', 'concierge_zero_result', etc.
  unsubscribed  boolean not null default false,
  created_at    timestamptz default now(),
  unique (email, source)
);

create index if not exists subscribers_email_idx on subscribers (email);
create index if not exists subscribers_created_at_idx on subscribers (created_at desc);

-- Public can insert (signups happen pre-auth); only service-role can read.
alter table subscribers enable row level security;

create policy "subscribers_public_insert"
  on subscribers for insert
  with check (true);

-- Reads are admin-only. The `service_role` bypasses RLS, so admin tools
-- using the service-role key can still query.
create policy "subscribers_no_public_read"
  on subscribers for select
  using (false);
