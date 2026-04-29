-- 012 — user_status table for suspension (Phase 5 follow-up of admin suite)
-- ════════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor.
--
-- Adds a dedicated user_status table keyed by auth.users.id, plus a
-- stable RLS predicate is_user_suspended(uid) that other tables' policies
-- can call to deny actions by suspended users.
--
-- Why a separate table (vs adding is_suspended to sellers, or to
-- raw_user_meta_data on auth.users)?
--   - sellers only covers builders, not buyers — a suspended buyer's
--     reviews / messages still need blocking
--   - raw_user_meta_data is JSONB and not RLS-friendly
--   - a dedicated table makes the join-shape obvious and gives us room
--     for suspension reason / admin / timestamps without bloating other
--     tables
--
-- After applying, the admin /admin/users page should expose a Suspend
-- toggle that calls a server action which writes here + logs to
-- admin_audit. Existing policies on products / reviews / messages
-- should be amended to deny when is_user_suspended(auth.uid()) returns
-- true (see commented-out examples below).

create table if not exists user_status (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  is_suspended   boolean not null default false,
  suspended_at   timestamptz,
  suspended_by   uuid references auth.users(id),
  reason         text,
  updated_at     timestamptz default now()
);

create index if not exists user_status_suspended_idx
  on user_status (is_suspended) where is_suspended = true;

alter table user_status enable row level security;

-- Public can READ status (so /admin and /whoami can show it without
-- service-role). Writes are service-role only.
drop policy if exists "user_status_public_read"  on user_status;
drop policy if exists "user_status_no_writes"    on user_status;

create policy "user_status_public_read"
  on user_status for select using (true);

create policy "user_status_no_writes"
  on user_status for all using (false) with check (false);

-- ── Stable RLS predicate ───────────────────────────────────────────────
-- Use as `where not is_user_suspended(auth.uid())` in any policy that
-- should reject suspended users.
create or replace function is_user_suspended(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select is_suspended from user_status where user_id = uid
  ), false)
$$;

comment on function is_user_suspended(uuid) is
  'Returns true iff the given user is currently suspended. Use in RLS policies as not is_user_suspended(auth.uid()).';

-- ── To wire enforcement after applying this migration, add to existing
-- ── policies (examples; adapt to your current policy shape):
--
-- drop policy if exists products_seller_insert on products;
-- create policy products_seller_insert on products
--   for insert with check (
--     auth.uid() = (select user_id from sellers where id = seller_id)
--     and not is_user_suspended(auth.uid())
--   );
--
-- drop policy if exists reviews_buyer_insert on reviews;
-- create policy reviews_buyer_insert on reviews
--   for insert with check (
--     auth.uid() = buyer_id and not is_user_suspended(auth.uid())
--   );
--
-- drop policy if exists messages_sender_insert on messages;
-- create policy messages_sender_insert on messages
--   for insert with check (
--     auth.uid() = sender_id and not is_user_suspended(auth.uid())
--   );
