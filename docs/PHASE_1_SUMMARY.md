# Budget Manager — Phase 1 Completion Summary

**Scope built:** Phase 1 (Schema & integrity core) + the backend-only Phase 0 foundations it requires.
**Environment:** Local Supabase stack (Postgres 17 via Docker). No hosted-project credentials used.
**Git state:** Complete in the working tree, **uncommitted** (not staged, not pushed) by request.

**Scope decisions (agreed before build):**
- **RPC migrations `0015–0019` deferred** to their feature phases (P3/P4/P6), per "architecture wins" over the spec's CP-1.4 checkpoint.
- **Backend/tooling scaffold only** — no React/PWA/auth frontend (those serve Phase 2+).

---

## 1. Summary of work completed

- **16 forward-only migrations** apply cleanly on a fresh DB (`supabase db reset` → all green).
- **Full schema**: `totals`, `categories`, `debts`, `investments`, `transactions`, `debt_payments`,
  `investment_contributions`, `recommended_items` — exact columns, CHECKs, enums, unique constraints
  (incl. partial-unique one-`otros`/one-`debt` per user), and indexes per spec.
- **RLS on every table** keyed to `auth.uid() = user_id`, plus the `GRANT`s the `authenticated` role
  needs (SELECT-only on `totals`, full CRUD elsewhere, nothing granted to `anon`).
- **Integrity core**: shared `signed_effect()` (used by trigger + reconciliation); `liquid_cash` trigger
  (insert/delete/update-by-delta incl. type-flip); `total_invested` trigger (grand total + per-vehicle,
  incl. moving a contribution between vehicles). Both are the only writers of their totals and run
  `SECURITY DEFINER`.
- **Guards**: protected-category delete block (`otros`/`debt`); `debt_id`-requires-debt-category
  constraint trigger.
- **Provisioning** (`handle_new_user`): seeds zeroed totals → 12 categories → GBM/Cetes.
- **Reconciliation view**: stored totals vs. recomputed sums (drift detection).
- **pgTAP suite: 45 assertions across 6 files, all passing** — provisioning, liquid-cash math
  (incl. type-flip and client-can't-write-totals), invested totals, both guards, cross-user RLS
  isolation + anon lockout, injected-drift detection.
- **Generated TS types committed to the tree** (`src/types/database.types.ts`); `tsc --noEmit` clean.
- **CI workflow**: resets DB, runs pgTAP, and typechecks.

**Verification state (last run):** `supabase test db` → 45/45 PASS; `npm run typecheck` → clean;
`supabase db reset` → 16/16 migrations apply.

---

## 2. Files created

**Tooling / Phase 0 scaffold**
- `package.json`, `package-lock.json`, `tsconfig.json`, `.env.example`
- `.github/workflows/ci.yml`
- `supabase/config.toml`, `supabase/.gitignore` (from `supabase init`)

**Migrations** (`supabase/migrations/`)
- `0001_extensions` · `0002_enums_and_helpers` · `0003_totals` · `0004_categories` · `0005_debts` ·
  `0006_investments` · `0007_transactions` · `0008_debt_payments` · `0009_investment_contributions` ·
  `0010_recommended_items` · `0011_trigger_liquid_cash` · `0012_trigger_total_invested` ·
  `0013_guard_protected_categories` · `0014_guard_debt_id_requires_debt_category` ·
  `0020_handle_new_user` · `0021_reconciliation_view`

**pgTAP tests** (`supabase/tests/`)
- `01_provisioning` · `02_liquid_cash` · `03_total_invested` · `04_guards` · `05_rls_isolation` ·
  `06_reconciliation`

**Types**
- `src/types/database.types.ts`

---

## 3. Files modified

- `.gitignore` — appended `node_modules/`, `dist/`, `.env*`, `coverage/`, and Supabase local artifacts
  (existing `.claude` / `beforePrompt.md` / `.DS_Store` entries preserved).

---

## 4. Remaining tasks for Phase 1

- **Commit** — intentionally not done. All changes sit in the working tree, unstaged.
- **Confirm CI green in-pipeline** — workflow exists but hasn't run remotely (no push).
- **Point at the hosted project later** — `supabase db push` applies these migrations to the Supabase
  project when moving past local. Not needed for local Phase 1.
- **(By design, not a gap) RPC migrations `0015–0019`** — deferred to their feature phases (P3/P4/P6).

---

## 5. Issues encountered / decisions worth surfacing

1. **`GRANT`s to `authenticated` were required.** Supabase local doesn't auto-grant on
   SQL-migration-created tables, so RLS-guarded access needs explicit grants (affects PostgREST too,
   not just tests). Added per-table; not spelled out in the spec's per-table sections but necessary and
   spec-consistent.
2. **Reconciliation covers the two grand totals only** (`liquid_cash_cents`, `total_invested_cents`) —
   spec-faithful (§15/§0021). It does **not** cross-check per-vehicle
   `investments.contributed_total_cents` against its contribution sum, so a corrupted per-vehicle column
   wouldn't be caught by the view. Candidate for the Phase 7 reconciliation monitor.
3. **Extensions**: enabled `pgcrypto` (provides `gen_random_uuid`); omitted `uuid-ossp` and `pg_trgm`
   (spec marked optional/future) to keep surface minimal.
4. **Debt system category** seeded with display name **"Deuda"** (`kind='debt'` is the enforced
   attribute; the name is just UI text).
5. **`totals.updated_at` advancement isn't asserted** — `now()` is frozen within a single pgTAP
   transaction, so it can't be observed in-test; it isn't a money-integrity property.

---

## How to verify manually

- **Automated:** `npm run db:test` (45 pgTAP assertions).
- **Studio (visual):** http://127.0.0.1:54323 → Authentication → Add user (fires provisioning) →
  Table Editor to inspect `categories`/`investments`/`totals`.
- **SQL/psql:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Note: Studio/psql run as
  superuser and **bypass RLS** — RLS is proven in `05_rls_isolation` (simulated `authenticated`/`anon`
  roles). Full end-to-end RLS-through-the-app testing arrives with the frontend in Phase 2.
- **Reset:** `npm run db:reset` rebuilds from migrations (wipes data).
