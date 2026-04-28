-- 007 — admin foundation: roles + audit log
-- ════════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor.
--
-- Replaces env-var-based admin gating with DB-backed roles. The existing
-- ADMIN_EMAIL fallback in lib/admin.ts stays in place during the migration
-- window so current admins don't get locked out before being granted roles
-- via SQL. The fallback is removed in Phase 5.
--
-- Schema choices:
--   - user_roles is many-to-many: a user can be both 'superadmin' and
--     hold a seller row at the same time. Sellers and admins are not
--     mutually exclusive identities.
--   - admin_audit is append-only; mutation actions write rows but never
--     update or delete them. Truncation will be done by a separate TTL
--     job in Phase 5.
--   - RLS denies all public reads on both tables. Admin tooling uses
--     the service-role key which bypasses RLS.

-- ── Role enum ─────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('superadmin', 'admin', 'moderator', 'support');
  end if;
end $$;

-- ── user_roles (many-to-many) ─────────────────────────────────────────
create table if not exists user_roles (
  user_id    uuid references auth.users(id) on delete cascade,
  role       user_role not null,
  granted_at timestamptz default now(),
  granted_by uuid references auth.users(id),
  primary key (user_id, role)
);

create index if not exists user_roles_user_idx on user_roles (user_id);

alter table user_roles enable row level security;

-- Drop any existing policies first so re-running the migration is idempotent.
drop policy if exists "user_roles_no_public_read"   on user_roles;
drop policy if exists "user_roles_no_public_write"  on user_roles;
drop policy if exists "user_roles_no_public_update" on user_roles;
drop policy if exists "user_roles_no_public_delete" on user_roles;

create policy "user_roles_no_public_read"   on user_roles for select using (false);
create policy "user_roles_no_public_write"  on user_roles for insert with check (false);
create policy "user_roles_no_public_update" on user_roles for update using (false);
create policy "user_roles_no_public_delete" on user_roles for delete using (false);

-- ── admin_audit (append-only) ─────────────────────────────────────────
create table if not exists admin_audit (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id),
  actor_email text,
  action      text not null,
  target_type text,
  target_id   text,
  payload     jsonb,
  created_at  timestamptz default now()
);

create index if not exists admin_audit_created_at_idx on admin_audit (created_at desc);
create index if not exists admin_audit_actor_idx      on admin_audit (actor_id);
create index if not exists admin_audit_target_idx     on admin_audit (target_type, target_id);

alter table admin_audit enable row level security;

drop policy if exists "admin_audit_no_public" on admin_audit;
create policy "admin_audit_no_public" on admin_audit for select using (false);

-- ── One-shot admin seed ───────────────────────────────────────────────
-- Grant superadmin to the current ADMIN_EMAIL allowlist. This is safe to
-- re-run because of the (user_id, role) primary key — duplicates are
-- silently ignored via on conflict do nothing.
insert into user_roles (user_id, role)
select id, 'superadmin'::user_role
from auth.users
where lower(email) in (
  'dominicmerlow@gmail.com',
  'cliftonflack@gmail.com'
)
on conflict (user_id, role) do nothing;
