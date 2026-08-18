# Smoke-testing a migration against Neon

Run this before the first production deploy of any migration, and any time
`drizzle/0000_baseline.sql` changes. It exists because the baseline has to
reconcile two different starting points — the drifted production database and an
empty one — and neither path has ever been executed against Postgres.

The whole test hinges on **step 2**. Without a before-check that shows the drift,
the after-check cannot fail, and a green result would mean nothing.

---

## 1. Create a throwaway branch

Neon console → project `neon-canary-lamp` → **Branches** → **New branch**.

- Name: `smoke-test`
- Parent: `production` (or whichever branch the app points at), **From: current state**

A branch is a copy-on-write clone, so it starts with production's exact schema —
drift included. That is the point: it is the only way to test the adoption path.

Copy its **direct (unpooled)** connection string — the host *without* `-pooler`.
DDL should not go through the pooler.

## 2. Before-check — prove the branch really is broken

Neon console → **SQL Editor**, with `smoke-test` selected. Run:

```sql
select
  (select count(*) from information_schema.columns
     where table_name = 'sellers' and column_name = 'stripe_payouts_enabled') as sellers_col,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'site_settings') as settings_table,
  (select count(*) from information_schema.columns
     where table_name = 'purchases'
       and column_name in ('stripe_payment_intent_id','application_fee_amount',
                           'refunded_at','refund_amount')) as purchases_cols;
```

**Expected: `0 | 0 | 0`.**

If any value is non-zero, stop — the branch does not carry the drift, so it cannot
test the repair. Check you branched from the right parent at current state.

Then confirm the failing query actually fails:

```sql
select p.id, p.title, s.stripe_payouts_enabled
from products p
left join sellers s on p.seller_id = s.id
where p.status = 'live'
limit 5;
```

**Expected: `ERROR: column s.stripe_payouts_enabled does not exist`.** This is the
query behind the 4,294 production failures.

## 3. Apply the migration through the real code path

Not by pasting SQL — run the script the deploy runs, so the migrator, the journal
and `verifySchema()` are all exercised.

```powershell
cd "G:\My Drive\CLAUDE\Ai-projects-BRIAN\GetForged"
```

```powershell
$env:DATABASE_URL = "postgresql://PASTE_THE_SMOKE_TEST_BRANCH_STRING_HERE"
```

```powershell
npm run db:migrate
```

Expected output, all three lines:

```
[migrate] applying migrations from drizzle/
[migrate] migrations applied
[migrate] schema verified — 22 tables match db/schema.ts
```

Failure modes worth recognising:

| Output | Meaning |
|---|---|
| `information_schema returned no columns` | `db.execute()` returned a `{ rows }` envelope the normaliser did not unwrap. Fix `verifySchema()` in scripts/migrate.ts. |
| `<table> is missing column(s): …` | The baseline did not fully reconcile. That list is the remaining drift. |
| `relation "x" already exists` | An idempotency guard was missed on that statement. |

## 4. After-check

Re-run **both** queries from step 2.

- The counts query must now return `1 | 1 | 4`.
- The product join must return rows (or zero rows) — **not** an error.

And confirm the run was recorded, so it will not re-apply:

```sql
select id, hash, created_at from drizzle.__drizzle_migrations order by created_at;
```

**Expected: exactly one row.**

## 5. Fresh-database path

Same branch, now wiped. This proves the baseline also builds from nothing —
ordering, foreign keys, enums.

> Only ever run this against the `smoke-test` branch. Check the branch selector
> in the SQL editor before you run it.

```sql
drop schema if exists public cascade;
create schema public;
drop schema if exists drizzle cascade;
```

Dropping `drizzle` matters: `__drizzle_migrations` lives there, and if it survives,
the migrator considers 0000 already applied and the whole step silently no-ops.

Then run step 3 again. Same three lines of output, and step 4's counts query must
again return `1 | 1 | 4`.

## 6. Clean up

```powershell
Remove-Item Env:\DATABASE_URL
```

Delete the `smoke-test` branch in the Neon console. Branches bill against the
project's storage and compute.

---

## Then deploy

With both paths green, deploying is what applies the migration to production:
`npm run build` runs `db:migrate` first, so the deploy fails rather than shipping
code that queries columns the database does not have.

After the deploy, `GET /api/health` should return **200** with all three checks
`ok`. Until then it returns 503 — correctly.
