# Budget Manager — Implementation Specification

**Companion to:** `docs/ARCHITECTURE.md` (the source of truth; this document expands it, it does not override it).
**Audience:** A senior engineer who will build the app without making architectural decisions.
**Rule:** If this spec and the architecture ever disagree, the architecture wins — raise the conflict, do not silently diverge.

No application code appears here. Schema, triggers, RPCs, and components are specified as contracts and pseudocode.

---

## 0. How to read this document

- **Contracts are normative.** Field names, enum values, error codes, and query keys are exact and must be used verbatim.
- **Pseudocode is illustrative** of behavior, not the implementation.
- **"MUST / SHOULD / MAY"** follow RFC 2119 sense.
- Money is always **integer centavos** in code and DB; pesos exist only at the display edge.

---

## 1. Complete Implementation Order

### 1.1 Phase order (hard sequence — do not parallelize across phases)

| # | Phase | Depends on | Exit gate |
|---|-------|-----------|-----------|
| P0 | Foundations (repo, tooling, Supabase project, PWA shell, auth login) | — | CP-0 |
| P1 | Schema & integrity core (all tables, RLS, seed, totals triggers) | P0 | CP-1 |
| P2 | Transactions CRUD + dashboard | P1 | CP-2 |
| P3 | Categories (CRUD + delete_category RPC) | P2 | CP-3 |
| P4 | Debts (CRUD + record_debt_payment RPC + EntryForm debt branch) | P3 | CP-4 |
| P5 | Investments (vehicles, contributions, market value, interest) | P2 (P3 optional) | CP-5 |
| P6 | Views polish + Recommended items | P2–P5 | CP-6 |
| P7 | Hardening (headers, CORS, scans, reconciliation, a11y, coverage) | P2–P6 | CP-7 |

> P5 depends only on P2 for the totals/trigger pattern; it may begin once P2 is merged even if P3/P4 are in flight, but it MUST NOT merge before P1.

### 1.2 Database migration order (each is a separate, forward-only migration file)

Migrations are numbered `NNNN_description.sql`. Apply strictly in order.

1. `0001_extensions` — enable `pgcrypto`/`uuid-ossp` (for `gen_random_uuid`), `pg_trgm` (optional, future search). No app tables.
2. `0002_enums_and_helpers` — enum-like CHECK domains or Postgres enums for `tx_type` (`expense|income`), `recurrence` (`recurrent|variable`), `category_kind` (`normal|otros|debt`), `debt_status` (`active|paid|archived`); shared immutable function `signed_effect(tx_type, integer) → bigint`.
3. `0003_totals` — `totals` table + RLS.
4. `0004_categories` — `categories` table + RLS + partial unique indexes (one `otros`, one `debt` per user) + `UNIQUE(user_id, name)`.
5. `0005_debts` — `debts` table + RLS + CHECKs.
6. `0006_investments` — `investments` table + RLS + `UNIQUE(user_id, name)`.
7. `0007_transactions` — `transactions` table + RLS + FKs (`category_id` RESTRICT, `debt_id` nullable) + indexes.
8. `0008_debt_payments` — `debt_payments` table + RLS + FKs.
9. `0009_investment_contributions` — `investment_contributions` table + RLS + indexes.
10. `0010_recommended_items` — `recommended_items` table + RLS + CHECK window.
11. `0011_trigger_liquid_cash` — triggers on `transactions` (insert/update/delete) maintaining `totals.liquid_cash_cents`.
12. `0012_trigger_total_invested` — triggers on `investment_contributions` maintaining `totals.total_invested_cents` and `investments.contributed_total_cents`.
13. `0013_guard_protected_categories` — trigger blocking delete of `otros`/`debt` kinds (defense-in-depth behind the RPC).
14. `0014_guard_debt_id_requires_debt_category` — constraint trigger: `transactions.debt_id` may be non-null only when `category_id` is the user's `debt` category.
15. `0015_rpc_delete_category` — `delete_category(uuid)`.
16. `0016_rpc_record_debt_payment` — `record_debt_payment(uuid, integer, date, text)`.
17. `0017_rpc_missing_recommendations` — `missing_recommendations(integer month, integer year)`.
18. `0018_rpc_create_debt` — optional convenience wrapper.
19. `0019_rpc_year_summary` — optional aggregate for year view.
20. `0020_handle_new_user` — trigger on `auth.users` insert seeding `totals` (zeros), seed categories (11 + `debt`), seed investments (GBM, Cetes).
21. `0021_reconciliation_view` — read-only view/function asserting totals equal recomputed sums (uses the same `signed_effect`).

**Dependency notes:**
- `signed_effect` (0002) MUST exist before both the triggers (0011) and the reconciliation view (0021) — they share it.
- `totals` (0003) MUST exist before 0011/0012 and before `handle_new_user` (0020).
- `categories` (0004) MUST exist before `transactions` (0007), the debt-id guard (0014), and `delete_category` (0015).
- `debts` (0005) before `debt_payments` (0008) and `record_debt_payment` (0016).
- Seeding (0020) is last among schema so every referenced object exists.

### 1.3 Backend (Supabase) development order

1. Local Supabase (`supabase start`); apply migrations 0001–0010 (schema + RLS).
2. Prove RLS with a throwaway second user (must see zero cross-user rows).
3. Migrations 0011–0014 (triggers/guards) + pgTAP for each.
4. Migrations 0015–0019 (RPCs) + pgTAP for each.
5. Migration 0020 (seed) + verify a freshly created user is fully provisioned.
6. Migration 0021 (reconciliation) + a pgTAP test that drift is detectable.
7. Generate TypeScript types from the DB schema; commit them.

### 1.4 Frontend development order

1. App shell: providers (React Query, Supabase client, router), `AppLayout`, protected-route wrapper, `Login`.
2. Domain foundation: `money.ts`, `schemas.ts` (Zod), `types.ts` (generated), query-key registry.
3. `api/` wrappers per resource (thin, typed).
4. `Dashboard` (read-only totals) — proves the read path end to end.
5. `EntryForm` + `MonthView` (transactions CRUD).
6. `Categories` page (after `delete_category` RPC exists).
7. `Debts` page + EntryForm debt branch (after `record_debt_payment` RPC exists).
8. `Investments` page (contributions + market value + interest).
9. `YearView`.
10. `Recommended` page + `RecommendationBanner`.
11. Hardening pass (headers via host config, a11y, error/empty/loading states audit).

---

## 2. Database Implementation

RLS policy pattern for **every** table (unless noted): enable RLS; policies `select/insert/update/delete` with `USING (auth.uid() = user_id)` and, for insert/update, `WITH CHECK (auth.uid() = user_id)`. `user_id` default `auth.uid()`, `NOT NULL`.

Types: `id uuid PK default gen_random_uuid()`. Timestamps `timestamptz default now()`. Money line items `integer`, denormalized totals `bigint`.

### 2.1 `totals`

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | PK, FK → auth.users(id) ON DELETE CASCADE |
| liquid_cash_cents | bigint | NOT NULL default 0 |
| total_invested_cents | bigint | NOT NULL default 0 |
| updated_at | timestamptz | NOT NULL default now() |

One row per user. `totalInterestMoney` is **not** stored (derived). No index beyond PK.

### 2.2 `categories`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK → auth.users, default auth.uid() |
| name | text | NOT NULL, length 1–64 (CHECK) |
| kind | category_kind | NOT NULL default `normal` |
| created_at | timestamptz | NOT NULL default now() |

Constraints/indexes:
- `UNIQUE(user_id, name)` (collision rejection, create + rename).
- Partial unique `UNIQUE(user_id) WHERE kind='otros'`.
- Partial unique `UNIQUE(user_id) WHERE kind='debt'`.

### 2.3 `debts`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK, default auth.uid() |
| name | text | NOT NULL, length 1–120 |
| total_months | integer | NOT NULL, CHECK > 0 |
| remaining_months | integer | NOT NULL, CHECK BETWEEN 0 AND total_months |
| minimum_payment_cents | integer | NOT NULL, CHECK > 0 |
| due_day | smallint | NOT NULL, CHECK BETWEEN 1 AND 31 |
| start_date | date | NOT NULL |
| status | debt_status | NOT NULL default `active` |
| created_at | timestamptz | NOT NULL default now() |

Index: `(user_id, status)`.

### 2.4 `investments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK, default auth.uid() |
| name | text | NOT NULL, length 1–80 |
| contributed_total_cents | bigint | NOT NULL default 0 (trigger-maintained; app MUST NOT write) |
| market_value_cents | bigint | NOT NULL default 0 (manual) |
| created_at | timestamptz | NOT NULL default now() |

Constraint: `UNIQUE(user_id, name)`.

### 2.5 `transactions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK, default auth.uid() |
| type | tx_type | NOT NULL |
| amount_cents | integer | NOT NULL, CHECK > 0 |
| tx_date | date | NOT NULL |
| description | text | NOT NULL default '', length 0–280 |
| category_id | uuid | NOT NULL, FK → categories(id) ON DELETE RESTRICT |
| recurrence | recurrence | NOT NULL default `variable` |
| debt_id | uuid | NULL, FK → debts(id) ON DELETE RESTRICT |
| created_at | timestamptz | NOT NULL default now() |
| updated_at | timestamptz | NOT NULL default now() |

Indexes: `(user_id, tx_date)`, `(user_id, category_id)`, `(user_id, type, tx_date)`, `(user_id, debt_id) WHERE debt_id IS NOT NULL`.

Guard trigger (0014): `debt_id` non-null allowed only when `category_id = user's debt category`.

### 2.6 `debt_payments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK, default auth.uid() |
| debt_id | uuid | NOT NULL, FK → debts(id) ON DELETE RESTRICT |
| transaction_id | uuid | NOT NULL, FK → transactions(id) ON DELETE CASCADE |
| amount_cents | integer | NOT NULL, CHECK > 0 |
| payment_date | date | NOT NULL |
| covered_minimum | boolean | NOT NULL |
| months_decremented | smallint | NOT NULL default 0, CHECK IN (0,1) |
| created_at | timestamptz | NOT NULL default now() |

Index: `(user_id, debt_id, payment_date)`.

### 2.7 `investment_contributions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK, default auth.uid() |
| investment_id | uuid | NOT NULL, FK → investments(id) ON DELETE RESTRICT |
| amount_cents | integer | NOT NULL, CHECK > 0 |
| contrib_date | date | NOT NULL |
| created_at | timestamptz | NOT NULL default now() |

Indexes: `(user_id, contrib_date)`, `(user_id, investment_id)`.

### 2.8 `recommended_items`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | NOT NULL, FK, default auth.uid() |
| type | tx_type | NOT NULL |
| category_id | uuid | NULL, FK → categories(id) ON DELETE SET NULL (reassigned to Otros by RPC before delete) |
| description | text | NOT NULL default '', length 0–280 |
| expected_amount_cents | integer | NULL, CHECK (NULL OR > 0) |
| window_start | date | NOT NULL |
| window_end | date | NULL, CHECK (window_end IS NULL OR window_end >= window_start) |
| created_at | timestamptz | NOT NULL default now() |

Index: `(user_id, type, category_id)`.

### 2.9 Shared function `signed_effect`

`signed_effect(p_type tx_type, p_amount integer) → bigint`: returns `+p_amount` when `income`, `-p_amount` when `expense`. `IMMUTABLE`. Used by triggers **and** reconciliation (single source of truth).

### 2.10 Triggers

**`liquid_cash` (on `transactions`, AFTER, per row):**
```
INSERT: totals.liquid_cash_cents += signed_effect(NEW.type, NEW.amount_cents)
DELETE: totals.liquid_cash_cents -= signed_effect(OLD.type, OLD.amount_cents)
UPDATE: totals.liquid_cash_cents += signed_effect(NEW...) - signed_effect(OLD...)
        AND set NEW.updated_at = now() (via BEFORE UPDATE, separate)
All scoped to the row's user_id; bump totals.updated_at.
```

**`total_invested` (on `investment_contributions`, AFTER, per row):**
```
INSERT: totals.total_invested_cents += NEW.amount_cents;
        investments.contributed_total_cents (NEW.investment_id) += NEW.amount_cents
DELETE: subtract OLD.amount_cents from both
UPDATE: apply delta to both; if investment_id changed, move the delta between vehicles
```

**`protected_categories` (on `categories`, BEFORE DELETE):** raise `cannot_delete_protected_category` when `OLD.kind IN ('otros','debt')`.

**`debt_id_requires_debt_category` (on `transactions`, constraint trigger, AFTER INSERT/UPDATE):** raise `debt_id_requires_debt_category` when `debt_id IS NOT NULL` and `category_id` is not the user's debt category.

### 2.11 RPC functions (behavior; all `SECURITY INVOKER`, run under caller RLS)

Specified as contracts in §3.

### 2.12 Migration dependency graph

```mermaid
flowchart LR
    E[0001 ext] --> H[0002 enums+signed_effect]
    H --> T[0003 totals]
    H --> C[0004 categories]
    H --> D[0005 debts]
    H --> I[0006 investments]
    C --> TX[0007 transactions]
    D --> TX
    T --> LC[0011 liquid_cash trg]
    TX --> LC
    D --> DP[0008 debt_payments]
    TX --> DP
    I --> IC[0009 contributions]
    C --> RI[0010 recommended]
    T --> TI[0012 invested trg]
    IC --> TI
    I --> TI
    C --> G1[0013 protected cats]
    TX --> G2[0014 debt-id guard]
    C --> DC[0015 delete_category]
    DP --> RDP[0016 record_debt_payment]
    RI --> MR[0017 missing_recs]
    T --> SEED[0020 handle_new_user]
    H --> REC[0021 reconciliation]
    LC --> REC
```

---

## 3. API Contracts

**Transport:** `@supabase/supabase-js`. Direct table ops go through PostgREST (RLS-guarded); multi-step ops through `rpc()`. **Authorization for every operation:** a valid authenticated session; RLS restricts rows to `auth.uid()`. Unauthenticated calls fail with PostgREST 401.

Money fields are integer centavos. Dates are ISO `YYYY-MM-DD` strings.

### 3.1 Direct table operations

For each resource, standard `select/insert/update/delete`. Client-side Zod validation MUST pass before any write; DB constraints are the backstop.

| Resource | Writable by client | Notes |
|----------|--------------------|-------|
| `transactions` | insert/update/delete (non-debt) | Debt-category entries go through `record_debt_payment`, NOT direct insert. |
| `categories` | insert/update (rename) | Delete via `delete_category` RPC only. |
| `debts` | insert/update (incl. `remaining_months`, `status='archived'`) | Hard delete disallowed by convention; UI only archives. |
| `investments` | insert/update (incl. `market_value_cents`)/delete | MUST NOT write `contributed_total_cents`. |
| `investment_contributions` | insert/update/delete | Triggers keep totals correct. |
| `recommended_items` | insert/update/delete | — |
| `totals` | select only | Client never writes. |

**Common error surface (PostgREST/Postgres):**

| Condition | Error |
|-----------|-------|
| No session | 401 Unauthorized |
| RLS blocks row | 403 / empty result |
| CHECK/enum violation | 400 with Postgres code `23514`/`22P02` |
| Unique violation (`categories.name`, `investments.name`) | 409, code `23505` → map to "name already exists" |
| FK RESTRICT (delete used category directly) | 409, code `23503` → instruct to use RPC |

### 3.2 RPC: `record_debt_payment`

- **Authorization:** session required; RPC resolves debt under caller RLS.
- **Request:** `{ debt_id: uuid, amount_cents: integer, date: 'YYYY-MM-DD', description: string }`
- **Validation:**
  - `debt_id` references an `active` debt owned by the user → else `debt_not_found`.
  - `amount_cents` integer > 0 → else `invalid_amount`.
  - `date` valid date (past/future allowed).
  - `description` length 0–280.
- **Behavior (one transaction):** insert an `expense` transaction (category = user's debt category, `debt_id` set, `recurrence='recurrent'` by default, given date/description/amount) → liquid_cash trigger fires; insert `debt_payments` row linking the transaction; `covered = amount_cents >= minimum_payment_cents`; if `covered AND remaining_months > 0` then `remaining_months -= 1` and set `status='paid'` when it reaches 0; `months_decremented` recorded (0 or 1).
- **Response:** `{ transaction: Transaction, debt: Debt, covered_minimum: boolean, months_decremented: 0|1 }`
- **Errors:** `debt_not_found`, `invalid_amount`, `debt_not_active`.

### 3.3 RPC: `delete_category`

- **Authorization:** session; resolves user's Otros category.
- **Request:** `{ category_id: uuid }`
- **Validation:** category exists & owned → else `category_not_found`; `kind NOT IN ('otros','debt')` → else `cannot_delete_protected_category`.
- **Behavior (one transaction):** reassign `transactions` and `recommended_items` from `category_id` to Otros; delete the category. Amounts untouched → `liquid_cash` unchanged.
- **Response:** `{ deleted_id: uuid, reassigned_transactions: integer, reassigned_recommendations: integer }`
- **Errors:** `category_not_found`, `cannot_delete_protected_category`.

### 3.4 RPC: `missing_recommendations`

- **Request:** `{ month: 1..12, year: integer }`
- **Validation:** `month` in 1–12, `year` in 2000–2100 → else `invalid_period`.
- **Behavior:** for the given month/year (America/Mexico_City), return active recommended items whose `[window_start, window_end]` overlaps the month AND for which **no transaction shares `category_id` in that month/year**.
- **Response:** `Array<{ item: RecommendedItem }>`
- **Errors:** `invalid_period`.

### 3.5 RPC: `create_debt` (optional wrapper)

- **Request:** `{ name, total_months, minimum_payment_cents, due_day, start_date }`
- **Validation:** name 1–120; `total_months>0`; `minimum_payment_cents>0`; `due_day` 1–31; valid `start_date`.
- **Behavior:** insert debt with `remaining_months = total_months`, `status='active'`.
- **Response:** `{ debt: Debt }`
- **Errors:** `invalid_debt_params`.

### 3.6 RPC: `year_summary` (optional)

- **Request:** `{ year: integer }`
- **Response:** `Array<{ month: 1..12, income_cents, expense_cents, balance_cents, invested_cents }>` (12 rows, zero-filled).
- **Errors:** `invalid_period`.

### 3.7 Error contract (client mapping)

All RPC errors surface as Postgres exceptions with a stable machine code in the message. The `api/` layer maps each code → a typed `AppError { code, userMessage }`. Unknown codes → generic `unexpected_error`. Never surface raw Postgres text to users.

---

## 4. Frontend Specification (per page)

Global states convention: **loading** = skeletons (never layout shift), **empty** = illustration + primary CTA, **error** = inline retry with mapped message, **offline** = banner "Sin conexión — se requiere internet".

### 4.1 `/login`

- **Purpose:** authenticate the single admin-provisioned user.
- **Components:** `LoginForm` (email, password), submit button, error alert.
- **Flow:** submit → supabase sign-in → on success redirect to `/`; on failure show mapped error. No signup/reset links (D8).
- **Loading:** button spinner, inputs disabled.
- **Empty:** n/a.
- **Validation:** email format, password non-empty (Zod).
- **Errors:** `invalid_credentials` → "Correo o contraseña incorrectos"; network → offline banner.

### 4.2 `/` Dashboard

- **Purpose:** at-a-glance financial position.
- **Components:** `LiquidCashCard`, `InvestedSummaryCard` (per-vehicle contributed + market value + interest amount/%), `PendingDebtsList` (current month), `QuickAddButton` (opens `EntryForm` modal), `MonthPicker` (drives pending debts + recommendation banner), `RecommendationBanner`.
- **Flow:** loads `totals` + `investments` + pending debts + `missing_recommendations(currentMonth, year)`.
- **Loading:** card skeletons.
- **Empty:** fresh account shows zeros + "Agrega tu primer movimiento" CTA.
- **Validation:** market-value inline edit → integer ≥ 0.
- **Errors:** per-card retry; interest hidden (not zero) when `total_invested_cents = 0`, with tooltip "Sin inversiones aún".

### 4.3 `/month` MonthView

- **Purpose:** monthly expenses & incomes in **separate tables** + period totals.
- **Components:** `MonthPicker`, `PeriodTotalsBar` (income, expense, balance, invested-this-month), `TransactionTable` (income), `TransactionTable` (expense) with `recurrence` badge and, for debt rows, a `DebtBadge` naming the debt (FR-12), row actions (edit/delete), `RecurrenceFilter`.
- **Flow:** pick month → fetch transactions in `[monthStart, monthEnd]`; edit/delete inline (delete confirms).
- **Loading:** table skeleton rows.
- **Empty:** per table "Sin movimientos este mes".
- **Validation:** edit reuses `EntryForm` schema.
- **Errors:** mapped; failed delete keeps the row.

### 4.4 `/year` YearView

- **Purpose:** 12-month overview.
- **Components:** `YearPicker`, `YearSummaryTable` (per-month income/expense/balance/invested), totals footer.
- **Flow:** pick year → `year_summary(year)`.
- **Empty:** all-zero rows still render (structure visible).

### 4.5 `/categories`

- **Purpose:** manage categories.
- **Components:** `CategoryList` (Otros & debt shown locked), `CategoryForm` (add/rename), delete action (confirm dialog warning "Los movimientos pasarán a Otros").
- **Flow:** add/rename via table ops; delete via `delete_category` RPC → toast with reassigned counts.
- **Validation:** name 1–64, unique (client pre-check + handle 409).
- **Errors:** `cannot_delete_protected_category` (buttons disabled anyway), name collision.

### 4.6 `/debts`

- **Purpose:** manage debts and view progress.
- **Components:** `DebtList` (active/paid/archived filter), `DebtForm` (create/edit incl. `remaining_months` manual override), `DebtProgress` (remaining/total months, due day), `RecordPaymentButton` → `PaymentDialog`, archive action.
- **Flow:** create via `create_debt` (or insert); record payment via `record_debt_payment` (prefills minimum) with **duplicate-payment warning** if a covering payment exists this month; archive sets `status='archived'`.
- **Validation:** debt fields per §3.5; `remaining_months` 0–total_months.
- **Errors:** `debt_not_active`, `invalid_amount`.

### 4.7 `/investments`

- **Purpose:** manage vehicles, contributions, and market value.
- **Components:** `InvestmentList` (name, contributed_total, market_value editable, interest per vehicle), `InvestmentForm` (add/rename/delete vehicle), `ContributionForm` (vehicle + amount + date), `ContributionHistory`.
- **Flow:** add contribution → invested totals update (invalidate totals + investments); edit market value inline.
- **Validation:** vehicle name 1–80 unique; contribution amount > 0; market value ≥ 0.
- **Errors:** name collision (409), amount invalid.

### 4.8 `/recommended`

- **Purpose:** manage recommendation templates.
- **Components:** `RecommendedList`, `RecommendedForm` (type, category, description, expected amount optional, window_start, window_end optional).
- **Flow:** CRUD; results feed `RecommendationBanner` + dashboard.
- **Validation:** window_end ≥ window_start; expected amount > 0 if present.

### 4.9 `EntryForm` (shared modal component)

- **Purpose:** create/edit a transaction.
- **Fields:** type (default expense), amount (pesos input → centavos), tx_date (default today), description, category (dropdown), recurrence (default variable). When category resolves to **debt kind**: replace amount with a `DebtSelect`, prefill amount = minimum payment, and on submit call `record_debt_payment` instead of a plain insert; show duplicate-payment warning.
- **Validation (Zod):** amount > 0 integer centavos after conversion; date valid; description ≤ 280; category required.
- **States:** submitting spinner; success closes modal + toast + invalidations (§6); error inline.

---

## 5. Component Hierarchy

```
<AppProviders>              # QueryClientProvider, SupabaseProvider, Router
└── <AppLayout>             # nav, offline banner, toaster
    ├── <ProtectedRoute>
    │   ├── <Dashboard>
    │   │   ├── <LiquidCashCard>
    │   │   ├── <InvestedSummaryCard>
    │   │   ├── <PendingDebtsList>
    │   │   ├── <RecommendationBanner>
    │   │   └── <QuickAddButton> → <EntryForm/>
    │   ├── <MonthView>
    │   │   ├── <MonthPicker>
    │   │   ├── <PeriodTotalsBar>
    │   │   ├── <TransactionTable kind="income">
    │   │   └── <TransactionTable kind="expense"> (DebtBadge, RecurrenceBadge)
    │   ├── <YearView> → <YearPicker> + <YearSummaryTable>
    │   ├── <Categories> → <CategoryList> + <CategoryForm> + <ConfirmDialog>
    │   ├── <Debts> → <DebtList> + <DebtForm> + <DebtProgress> + <PaymentDialog>
    │   ├── <Investments> → <InvestmentList> + <InvestmentForm> + <ContributionForm> + <ContributionHistory>
    │   └── <Recommended> → <RecommendedList> + <RecommendedForm>
    └── <Login> (public) → <LoginForm>
Shared primitives: <EntryForm>, <DebtSelect>, <MoneyInput>, <DatePicker>,
                   <ConfirmDialog>, <Skeleton>, <EmptyState>, <ErrorState>, <Toast>
```

`api/` and `hooks/` are non-visual layers consumed by pages; no page imports `supabase-js` directly.

---

## 6. State Management

### 6.1 React Query (server state) — query-key registry (exact)

| Key | Source | Invalidated by |
|-----|--------|----------------|
| `['totals']` | `totals` row | any transaction/contribution mutation, debt payment, market-value edit* |
| `['investments']` | `investments` list | contribution mutations, vehicle CRUD, market-value edit |
| `['transactions', { year, month }]` | month range | transaction mutations, debt payment in that month |
| `['transactions','year', year]` / `['yearSummary', year]` | aggregate | any transaction mutation in that year |
| `['categories']` | categories | category CRUD, `delete_category` |
| `['debts', { status }]` | debts | debt CRUD, `record_debt_payment`, archive |
| `['debtPayments', debtId]` | payments | `record_debt_payment` |
| `['contributions', { investmentId }]` | contributions | contribution CRUD |
| `['recommendations', { year, month }]` | RPC | transaction mutations in that period, recommended-item CRUD |

\* market-value edit invalidates `['investments']`; `['totals']` need not refetch for market value (interest is computed client-side from investments), but the dashboard MUST recompute interest from the fresh investments list.

**Mutation → invalidation matrix (authoritative):**

| Mutation | Invalidate |
|----------|-----------|
| create/update/delete transaction | `['totals']`, `['transactions', period]`, `['yearSummary', year]`, `['recommendations', period]` |
| `record_debt_payment` | `['totals']`, `['transactions', period]`, `['debts', *]`, `['debtPayments', debtId]`, `['yearSummary', year]`, `['recommendations', period]` |
| create/update/delete contribution | `['totals']`, `['investments']`, `['contributions', {investmentId}]` |
| edit market_value | `['investments']` |
| category create/rename | `['categories']` |
| `delete_category` | `['categories']`, `['transactions', *]`, `['recommendations', *]` |
| debt create/edit/archive | `['debts', *]` |
| recommended item CRUD | `['recommendations', *]` |

**Policy:** prefer **invalidate-and-refetch** over optimistic cache edits for anything touching money totals (the true delta is server-side). Optimistic updates MAY be used for list-row add/remove UX but the totals card MUST reflect refetched values.

### 6.2 Zustand (client/UI state)

- `useUiStore`: `selectedMonth`, `selectedYear` (default now, MX tz), open-modal descriptor, active filters (recurrence). No server data.

### 6.3 Local component state

- Form field state via React Hook Form; ephemeral toggles (dialog open) local unless shared.

### 6.4 Cache/session

- Supabase session in httpOnly cookies (SDK-managed). React Query `staleTime` 30s default; `['totals']` `staleTime` 0 (always fresh after mutations). Refetch-on-window-focus enabled.

---

## 7. Testing Strategy (per feature)

Coverage gates: 80% overall, 90% new/modified, **95% financial-critical** (triggers, RPCs, money helpers, EntryForm submit path).

### 7.1 Money & domain helpers
- **Unit:** `toCentavos`/`formatMXN` round-trip; rejects NaN/Infinity/negative; `signed_effect` parity (TS mirror vs. DB via integration).

### 7.2 Totals integrity (P1) — **highest priority**
- **pgTAP:** insert income/expense adjusts `liquid_cash_cents` correctly; delete reverses; **update-by-delta** for amount change, type flip (expense↔income), and both; multiple rows accumulate; RLS prevents cross-user total mutation; reconciliation view reports zero drift after a randomized sequence and non-zero after a deliberately corrupted row.

### 7.3 Transactions (P2)
- **Integration (real test DB):** CRUD reflects in `totals`.
- **E2E (Playwright):** add expense → dashboard balance decreases by amount; edit → adjusts by delta; delete → reverses; month view shows row in correct table.
- **Unit:** EntryForm validation branches.

### 7.4 Categories (P3)
- **pgTAP:** `delete_category` reassigns transactions + recommended items to Otros atomically; rejects Otros/debt; name uniqueness enforced.
- **E2E:** delete used category → rows show Otros; totals unchanged.

### 7.5 Debts (P4)
- **pgTAP:** `record_debt_payment` creates expense + payment + decrements one month when covered; no decrement when below minimum; rollback on forced failure leaves totals and debt untouched; manual `remaining_months` edit bounded.
- **E2E:** record payment prefilled with minimum; duplicate-payment warning appears; balance decreases; remaining months drop by one; archive hides from active list but keeps history.

### 7.6 Investments (P5)
- **pgTAP:** contribution insert/delete/update maintains `total_invested_cents` and per-vehicle `contributed_total_cents`, including moving between vehicles; contributions do NOT change `liquid_cash_cents`.
- **E2E:** add contribution → invested total rises, liquid cash unchanged; edit market value → interest amount/% recompute; interest hidden when contributed = 0.

### 7.7 Recommendations (P6)
- **pgTAP:** `missing_recommendations` returns items with no matching category transaction in the month/year; excludes when a match exists; respects window overlap.
- **E2E:** banner appears when expected item missing; disappears after adding a matching transaction.

### 7.8 Auth & RLS (cross-cutting)
- **Integration:** unauthenticated calls 401; second user sees zero rows across all tables; RPCs run under caller RLS.

### 7.9 PWA/offline
- **E2E:** app installs; offline → data mutations show offline banner and do not corrupt state; shell still loads.

### 7.10 Mock policy
- Unit tests mock supabase-js via MSW at the network boundary. Integration/pgTAP use a real local Postgres. Never mock the code under test or DB in integration.

---

## 8. Acceptance Criteria (per feature, Given/When/Then)

- **AC-Transactions:** *Given* a balance of X, *when* I add an expense of Y, *then* the dashboard `liquidCash` reads X−Y and the row appears in the month's expense table. Edit adjusts by delta; delete reverses exactly.
- **AC-Category-delete:** *Given* category C with N transactions, *when* I delete C, *then* those N transactions show "Otros", C is gone, `liquidCash` is unchanged, and I cannot delete Otros or debt.
- **AC-Debt-payment:** *Given* an active debt with minimum M and R remaining months, *when* I record a payment ≥ M, *then* an expense of that amount is created, `liquidCash` decreases by it, remaining months = R−1 (or status `paid` at 0), and the month view labels the row with the debt; a payment < M creates the expense but does not decrement.
- **AC-Debt-duplicate:** *Given* a covering payment already this month, *when* I open the payment dialog, *then* a warning is shown but the payment is still allowed.
- **AC-Investment:** *Given* liquid cash L, *when* I add a contribution of A, *then* `totalInvested` and the vehicle's contributed total increase by A and `liquidCash` stays L. Editing market value updates `totalInterestMoney` = totalMarketValue − totalInvested and its %.
- **AC-Interest-zero:** *Given* zero contributions, *when* I view the dashboard, *then* interest % is not shown (no divide-by-zero) and a tooltip explains why.
- **AC-Recommendation:** *Given* a recommended item for category K active this month with no K transaction, *when* I open the month, *then* it is recommended; after I add a K transaction it disappears.
- **AC-Month/Year views:** period totals equal the sum of displayed rows; year view shows 12 rows zero-filled.
- **AC-Auth:** only the admin-provisioned user can sign in; there is no reset/signup UI; RLS blocks any cross-user read.
- **AC-Reconciliation:** the reconciliation check reports zero drift after any sequence of operations in the test suite.

---

## 9. Definition of Done (per phase)

A phase is done only when **all** hold:

**Every phase:** migrations apply cleanly forward on a fresh DB; TS types regenerated & committed; lint + typecheck clean; unit/integration/pgTAP/E2E for the phase pass; coverage gates met; no `service_role` in client bundle; PR reviewed; docs/handoff updated.

- **CP-0 done:** app installs as PWA (Lighthouse PWA pass), login works against a seeded user, protected routes redirect when logged out.
- **CP-1 done:** all tables + RLS live; totals triggers proven by pgTAP incl. delta/type-flip; reconciliation view exists and detects injected drift; second-user RLS test green.
- **CP-2 done:** transaction CRUD end-to-end; dashboard reads saved totals; money round-trips float-free; month view separates income/expense.
- **CP-3 done:** category CRUD; `delete_category` atomic reassign + protection + collision rejection proven.
- **CP-4 done:** `record_debt_payment` atomic (payment+decrement+rollback proven); EntryForm debt branch + duplicate warning; pending debts + month annotation.
- **CP-5 done:** contributions maintain invested totals without touching liquid cash; market value + interest amount/% correct; zero-contribution guard.
- **CP-6 done:** year view + `missing_recommendations` correct; recommendation banner behavior verified.
- **CP-7 done:** security headers + CORS allowlist configured at host; dependency scan clean (no critical/high); reconciliation monitor scheduled; a11y AA audit passes; all coverage gates green → **release candidate**.

---

## 10. Coding Standards

### 10.1 Folder conventions
Per architecture §16. One resource module per file in `api/` and `hooks/`. Co-locate a component's test as `Name.test.tsx`. Pure logic in `domain/`; no React imports there.

### 10.2 Naming
- Files: components `PascalCase.tsx`; hooks `useThing.ts`; api modules `resource.ts`; SQL migrations `NNNN_snake_case.sql`.
- DB: tables/columns `snake_case`, plural tables. Money columns end in `_cents`. Enums singular.
- TS: types/interfaces `PascalCase`; variables/functions `camelCase`; constants `UPPER_SNAKE`. Query keys from the central registry only — no inline literals.
- Error codes: `snake_case` machine codes, stable, mirrored between DB and the `api/` mapper.

### 10.3 TypeScript rules
`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any` (use `unknown` + narrow). DB types are generated, never hand-edited. Money is a branded `Centavos` type where practical to prevent unit mix-ups. All API responses validated/narrowed before use.

### 10.4 ESLint rules
`@typescript-eslint/recommended-type-checked`, `eslint-plugin-react`, `react-hooks` (exhaustive-deps error), `import/order`, `no-floating-promises`, `@tanstack/eslint-plugin-query`. Ban direct `supabase` import outside `api/` (custom `no-restricted-imports`). Prettier for formatting; no style debates in review.

### 10.5 React best practices
Function components + hooks only. Server state exclusively via React Query hooks; never fetch in `useEffect`. Keep components presentational where possible; push data logic into hooks. Stable keys; no index keys on dynamic lists. Suspense/error boundaries at route level. Controlled inputs via RHF. Accessibility: label every input, manage focus in dialogs, honor reduced motion.

### 10.6 Supabase best practices
RLS on every table, always keyed to `auth.uid()`. RPCs `SECURITY INVOKER`. Never expose `service_role` to the client. Schema/RLS/functions live in versioned migrations (source of truth), not the dashboard. Regenerate types after every schema change. Client never writes trigger-maintained columns (`contributed_total_cents`) or `totals`. Handle PostgREST error codes explicitly; map to typed app errors. Use `.single()`/`.maybeSingle()` deliberately.

---

## 11. Implementation Risks (extra care)

| Area | Why risky | Guardrail |
|------|-----------|-----------|
| Totals triggers (update-by-delta, type flip) | Silent money corruption | Exhaustive pgTAP incl. type flip + reconciliation drift test; the ONLY writer of totals. |
| Shared `signed_effect` | Two copies would hide drift | Single DB function used by triggers AND reconciliation; assert parity in tests. |
| `record_debt_payment` atomicity | Partial failure desyncs cash vs. debt | Single RPC/transaction; rollback test with forced error. |
| Seeding order (`totals` before first tx) | Missing totals row → trigger no-op/error | `handle_new_user` seeds totals first; migration order pinned; test fresh-user provisioning. |
| Money unit mixups (pesos vs centavos) | Off-by-100 bugs | Branded `Centavos` type; conversion only in `MoneyInput`/`formatMXN`; property tests. |
| Timezone month boundaries & `due_day` clamp | Off-by-one at edges | `DATE`-only storage; fixed America/Mexico_City; tests for day 29–31 and month edges. |
| Divide-by-zero in interest % | NaN/Infinity in UI | Guard when `total_invested_cents = 0`; hide %, show tooltip. |
| RLS gaps | Cross-user leakage (future multi-user) | Second-user test across every table in CI. |
| Direct debt-category insert bypassing RPC | Debt state desync | Constraint trigger + UI routes debt entries to RPC; test that a raw insert with debt_id+non-debt category is rejected. |
| Optimistic totals | Showing wrong balance | Policy: invalidate-and-refetch for money; no optimistic totals. |
| Service-role/secret leakage | Critical exposure | Pre-commit + CI secret scan; only anon key in bundle. |

---

## 12. Suggested Implementation Checkpoints

Small, reviewable stops (finer-grained than phases). Each checkpoint = a mergeable PR with its tests green.

- **CP-0.1** Repo + tooling (Vite, TS strict, ESLint, Prettier, Tailwind, shadcn, Vitest, Playwright) — CI runs empty suite.
- **CP-0.2** Supabase local + client provider + auth login + protected routes + PWA manifest/SW.
- **CP-1.1** Migrations 0001–0006 (enums, signed_effect, totals, categories, debts, investments) + RLS + second-user test.
- **CP-1.2** Migrations 0007–0010 (transactions, debt_payments, contributions, recommended) + indexes.
- **CP-1.3** Migrations 0011–0014 (triggers/guards) + pgTAP (delta/type-flip).
- **CP-1.4** Migrations 0015–0019 (RPCs) + pgTAP.
- **CP-1.5** Migration 0020 (seed) + 0021 (reconciliation) + fresh-user provisioning test + generated types committed.
- **CP-2.1** Domain foundation (money, schemas, query-key registry) + api wrappers.
- **CP-2.2** Dashboard read path (totals + investments cards).
- **CP-2.3** EntryForm + transaction create/edit/delete + invalidations.
- **CP-2.4** MonthView (separate tables, period totals, recurrence badge).
- **CP-3.1** Categories CRUD + delete_category integration + UI protection.
- **CP-4.1** Debts CRUD + DebtProgress + manual remaining-months.
- **CP-4.2** record_debt_payment wiring + EntryForm debt branch + duplicate warning + month annotation + pending debts.
- **CP-5.1** Investment vehicles CRUD + market value edit + interest display/guard.
- **CP-5.2** Contributions CRUD + invested totals + "invested this period".
- **CP-6.1** YearView + year_summary.
- **CP-6.2** Recommended items CRUD + missing_recommendations + banner.
- **CP-7.1** Security headers + CORS + dependency scan + secret scan in CI.
- **CP-7.2** Reconciliation monitor scheduled + a11y AA audit + coverage gate enforcement → RC.

Review protocol at each CP: demo the acceptance criteria for the slice, confirm coverage on new code, confirm reconciliation reports zero drift (from CP-1.5 onward), then proceed.

---

*End of Implementation Specification. Build strictly in the order of §1; treat §2–§3 contracts as normative; gate each phase on §9.*
