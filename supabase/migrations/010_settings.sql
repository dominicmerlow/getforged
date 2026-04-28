-- 010 — site settings (feature flags) — Phase 5 of admin suite
-- ════════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor.
--
-- Stores boolean flags + small config values that admins toggle from
-- /admin/settings without a redeploy. Schema mirrors site_content (key/value)
-- but with a separate table because:
--   - Different cache tag — settings change rarely, content changes more
--   - Different read path — middleware reads settings to gate the whole site
--     (e.g. maintenance mode), content is only read inside RSC pages
--
-- Stored as jsonb so the UI can later add config-with-numbers (e.g. commission
-- rate) or string options (e.g. featured carousel mode) without a schema change.

create table if not exists site_settings (
  key            text primary key,
  value_json     jsonb not null,
  description    text,
  updated_at     timestamptz default now(),
  updated_by     uuid references auth.users(id)
);

alter table site_settings enable row level security;

drop policy if exists "site_settings_public_read"        on site_settings;
drop policy if exists "site_settings_no_public_insert"   on site_settings;
drop policy if exists "site_settings_no_public_update"   on site_settings;
drop policy if exists "site_settings_no_public_delete"   on site_settings;

-- Public reads OK — middleware checks maintenance mode pre-auth
create policy "site_settings_public_read"      on site_settings for select using (true);
create policy "site_settings_no_public_insert" on site_settings for insert with check (false);
create policy "site_settings_no_public_update" on site_settings for update using (false);
create policy "site_settings_no_public_delete" on site_settings for delete using (false);
