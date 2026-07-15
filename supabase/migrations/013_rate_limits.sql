-- ═══════════════════════════════════════════════════════════════
-- Migration 013 — Rate limiting backing store
-- Durable fixed-window counters for anon/cost-bearing endpoints
-- (concierge LLM calls, subscribe, view counts, checkout, contact-seller).
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

create table if not exists rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         integer not null default 1,
  primary key (key, window_start)
);

alter table rate_limits enable row level security;
-- No policies — service role (used exclusively via the rate_limit_hit
-- function below) bypasses RLS; there is no legitimate public access path.

-- Atomically increments the counter for (key, window_start) and reports
-- whether the caller is still within `p_limit`. security definer so it can
-- be invoked via the service-role client without a public grant on the
-- underlying table. Also opportunistically prunes windows older than a day
-- on ~1% of calls, so the table doesn't grow unbounded without needing a
-- separate cron job.
create or replace function rate_limit_hit(p_key text, p_window_start timestamptz, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  insert into rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;
