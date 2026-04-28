-- 009 — site_content table for CMS-lite (Phase 4 of admin suite)
-- ════════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor.
--
-- Stores per-key overrides for marketing copy site-wide. The application
-- code in lib/content.ts looks up keys here; if a key is missing, it falls
-- back to a hardcoded default in lib/content-defaults.ts. This means:
--   - Fresh deploys never break (defaults always work)
--   - Adding a new content key is code-only (no migration needed)
--   - Admins edit a key → row inserted/updated → cache invalidates → live
--
-- Schema choices:
--   - value_json (jsonb) supports text, arrays, objects — no separate
--     content_type column needed; the consuming component knows the shape.
--   - description (text) is the admin-facing label shown in /admin/content.
--   - updated_by tracks the last admin to touch each key for audit trail.

create table if not exists site_content (
  key            text primary key,
  value_json     jsonb not null,
  description    text,
  updated_at     timestamptz default now(),
  updated_by     uuid references auth.users(id)
);

create index if not exists site_content_updated_at_idx on site_content (updated_at desc);

alter table site_content enable row level security;

-- Drop existing policies first so re-running is idempotent
drop policy if exists "site_content_public_read"        on site_content;
drop policy if exists "site_content_no_public_insert"   on site_content;
drop policy if exists "site_content_no_public_update"   on site_content;
drop policy if exists "site_content_no_public_delete"   on site_content;

-- Public can READ all overrides (so client-side reads work without auth)
create policy "site_content_public_read"      on site_content for select using (true);

-- Writes are admin-only via service-role (bypasses RLS)
create policy "site_content_no_public_insert" on site_content for insert with check (false);
create policy "site_content_no_public_update" on site_content for update using (false);
create policy "site_content_no_public_delete" on site_content for delete using (false);
