-- 011 — admin_audit log retention (30-day TTL)
-- ════════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor (or `supabase db push`).
--
-- Background: admin_audit grows unbounded as every admin mutation appends
-- a row. Old entries beyond ~30 days have low forensic value and waste
-- storage. This migration adds a parameterless cleanup function the
-- operator can call from any scheduler — Vercel Cron, Supabase pg_cron
-- (if enabled), a manual `select cleanup_old_admin_audit()` from psql,
-- or just leave it untriggered and prune manually.
--
-- We deliberately do NOT enable pg_cron + auto-schedule here. That's a
-- persistent infrastructure decision (every Supabase plan supports
-- pg_cron differently, and the operator may prefer Vercel Cron for
-- visibility). To wire pg_cron after applying this migration:
--
--   create extension if not exists pg_cron with schema extensions;
--   select cron.schedule(
--     'cleanup-admin-audit-30d',
--     '0 3 * * *',
--     $$select cleanup_old_admin_audit()$$
--   );
--
-- To wire Vercel Cron instead: add a route at app/api/cron/cleanup/route.ts
-- that calls this function via the service-role client, gated on the
-- CRON_SECRET env var, and add the cron entry in vercel.json.

create or replace function cleanup_old_admin_audit(retention_days int default 30)
returns int
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from admin_audit
    where created_at < now() - (retention_days || ' days')::interval
    returning 1
  )
  select count(*)::int from deleted
$$;

comment on function cleanup_old_admin_audit(int) is
  'Deletes admin_audit rows older than retention_days (default 30). Returns count deleted. Call from a scheduler.';

-- Lock down so only service-role can call (RLS bypass via security definer
-- is dangerous if exposed to anon — explicit revoke).
revoke all on function cleanup_old_admin_audit(int) from public;
revoke all on function cleanup_old_admin_audit(int) from anon;
revoke all on function cleanup_old_admin_audit(int) from authenticated;
