-- 008 — products: featured flag + admin internal notes (Phase 3 of admin suite)
-- ════════════════════════════════════════════════════════════════════════
-- Apply via Supabase SQL Editor.
--
-- Adds three columns to enable admin curation of homepage placement:
--
--   featured            — boolean, drives "is this card pinned?"
--   featured_position   — smallint, sort order across featured products
--                          (lower = closer to the top of the hero stack)
--   forge_of_the_week   — boolean, exclusive flag for the newsletter pick
--                          (UI enforces "at most one true at a time")
--   internal_notes      — text, admin-facing private notes (never rendered
--                          publicly; useful for moderation, "talk to seller
--                          about X", etc.)
--
-- All four are optional / nullable so existing products are unaffected.
-- The homepage / browse queries opt in by sorting on featured_position
-- before created_at.

alter table products
  add column if not exists featured            boolean default false,
  add column if not exists featured_position   smallint,
  add column if not exists forge_of_the_week   boolean default false,
  add column if not exists internal_notes      text;

-- Indexes:
-- - featured-first ordering needs a partial index on featured = true
--   so the WHERE clause can short-circuit on the much smaller subset
create index if not exists products_featured_idx
  on products (featured_position asc nulls last)
  where featured = true;

-- - forge_of_the_week is a singleton — partial unique-ish index helps
--   us find the current pick fast
create index if not exists products_forge_of_the_week_idx
  on products (id)
  where forge_of_the_week = true;
