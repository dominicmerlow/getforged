-- ═══════════════════════════════════════════════════════════════
-- Migration 015 — Claim invites (prospect outreach → pre-filled listing)
-- See docs/launch/CLAIM-FLOW-SPEC.md for the full design.
--
-- Prospect drafts are owned by a single "house" seller account (marked via
-- sellers.is_house_account) until claimed, at which point seller_id is
-- reassigned to the claiming user's own seller row. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

alter table sellers  add column if not exists is_house_account boolean not null default false;
alter table products add column if not exists is_prospect       boolean not null default false;

-- At most one house account.
create unique index if not exists sellers_house_account_unique
  on sellers (is_house_account)
  where is_house_account;

create table if not exists claim_invites (
  id            uuid primary key default gen_random_uuid(),
  token         text unique not null,
  product_id    uuid not null references products(id) on delete cascade,
  prospect_email text,
  prospect_name  text,
  source        text not null,
  status        text not null default 'sent'
    check (status in ('sent','viewed','claimed','expired','revoked')),
  viewed_at     timestamptz,
  claimed_at    timestamptz,
  claimed_by    uuid references auth.users(id),
  expires_at    timestamptz not null default now() + interval '30 days',
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

alter table claim_invites enable row level security;
-- No policies — every access path (claim page, admin prospect tool, auth
-- callback) goes through the service-role client. There is no legitimate
-- anon/authenticated access to this table directly.

create index if not exists claim_invites_token_idx   on claim_invites(token);
create index if not exists claim_invites_product_idx on claim_invites(product_id);
create index if not exists claim_invites_status_idx  on claim_invites(status);
