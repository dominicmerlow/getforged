-- ═══════════════════════════════════════════════════════════════
-- Migration 001 — Product spec fields
-- Adds structured technical fields sellers can fill in to describe
-- their app beyond the AI-generated sales copy.
-- Safe to re-run (all uses `if not exists`).
-- ═══════════════════════════════════════════════════════════════

alter table products
  add column if not exists platform       text[],
  add column if not exists architecture   text,
  add column if not exists ai_models      text[],
  add column if not exists integrations   text[],
  add column if not exists monthly_cost   numeric(10,2),
  add column if not exists deploy_time    text,
  add column if not exists docs_url       text,
  add column if not exists repo_url       text,
  add column if not exists support_terms  text;

-- Optional: index the array columns for @> / && queries later
create index if not exists products_platform_idx     on products using gin (platform);
create index if not exists products_ai_models_idx    on products using gin (ai_models);
create index if not exists products_integrations_idx on products using gin (integrations);
