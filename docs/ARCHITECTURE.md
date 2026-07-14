# Budget Manager — Architecture & Implementation Plan

**Status:** Approved architecture (awaiting go-ahead for implementation)
**Type:** Single-user, installable, online-only PWA
**Backend:** Supabase (Postgres + Auth + RLS + Edge Functions)
**Money:** Integer centavos, single currency **MXN**

---

## Locked Architectural Decisions

These were confirmed by the product owner and are not re-litigated:

1. **PWA is installable and online-only.** Service worker caches the app shell/assets; all data operations require a network connection. No local-first / offline sync / conflict resolution.
2. **Running-total integrity lives in Postgres.** Triggers and RPC functions atomically adjust the saved `totals` row on every insert/update/delete. The client only *reads* totals.
3. **Single currency (MXN).** All monetary amounts stored as integer minor units (centavos). No FX logic.
4. **Supabase is the backend (BaaS).** Postgres + Auth + RLS + Edge Functions. RPC functions for atomic multi-step operations. No separate self-hosted API server.

---

## Part 0 — Resolved Decisions & Assumptions

### 0.1 Resolved decisions (previously open questions)

| # | Topic | Decision |
|---|-------|----------|
| D1 | **`totalInterestMoney` semantics** | Redefined using **market value**. Each investment vehicle has a manually editable `market_value_cents`. `totalMarketValue = SUM(market_value_cents)`. **`totalInterestMoney = totalMarketValue − totalInvested`** (derived, not stored). Percentage = `totalInterestMoney / totalInvested × 100`, guarded against divide-by-zero. |
| D2 | **Do contributions reduce `liquidCash`?** | **No.** A contribution affects only `totalInvested` / per-vehicle totals, never `liquidCash`. |
| D3 | **Recommended-item match key** | Match on **category + month + year**. An item is recommended when its window includes the month and **no transaction shares its `category_id` in that month/year**. Type is a display attribute only. |
| D4 | **Debt overpayment** | A payment covering the minimum decrements **exactly one month**. Additionally, `remaining_months` is **manually editable** (bounded `0 … total_months`). |
| D5 | **Deleting a debt** | **Soft delete / archive** (`status='archived'`); payment history and `liquidCash` preserved. |
| D6 | **Multiple covering payments per month** | **Allowed**; each covering payment decrements one month; UI **warns** if the debt already has a covering payment that month. |
| D7 | **`due_day` on short months** | **Clamp** to the month's last day (e.g., 31 → Feb 28/29). |
| D8 | **Auth provisioning & recovery** | **Supabase admin dashboard only.** No password-reset or MFA UI, no self-serve flows. App has a login screen only. |
| D9 | **Category name collisions** | Rejected via `UNIQUE(user_id, name)` on both create and rename. |
| D10 | **Year view granularity** | Per-month income/expense/balance/invested first; category matrix deferred. |

### 0.2 Assumptions

1. Single user, single currency (MXN), one Supabase project; auth account provisioned manually via the Supabase admin dashboard. RLS is built as if multi-user for future-proofing.
2. Online-only. Service worker caches the **app shell only**; all data reads/writes require network.
3. Line-item amounts fit `INTEGER` centavos (max ≈ $21,474,836.47 MXN/row); denormalized **totals use `BIGINT`**.
4. `recurrent`/`variable` is a **pure label** for filtering/visualization — no auto-generation of entries.
5. Investments = vehicles (GBM, Cetes); contributions = money-add events; per-vehicle and grand totals are trigger-maintained.
6. Amounts stored **positive**; sign is derived from `type` (expense/income).
7. Deployment: static SPA on Vercel/Netlify/Cloudflare Pages; backend fully managed by Supabase.
8. Timezone `America/Mexico_City` for month/due-day logic; dates stored as `DATE` (no time) to avoid TZ drift.

---

## 1. Executive Summary

The Budget Manager is an **installable, online-only Progressive Web App** for a single household budget, built with **React + Vite** on the front end and **Supabase** (managed Postgres, Auth, Row-Level Security, Edge Functions) as the entire backend. It tracks expenses, incomes, debts, and investment contributions in **Mexican pesos stored as integer centavos**, and surfaces an always-current picture of liquid cash on hand, total invested, market value, and pending debts.

The defining architectural stance is that **financial integrity lives in the database, not the client.** A denormalized `totals` row holds `liquidCash` and `totalInvested`; Postgres triggers atomically adjust these on every transaction and contribution insert/update/delete (including the update-by-delta case). Multi-step money operations that must be all-or-nothing — applying a debt payment (which both creates a cash-affecting transaction *and* decrements the debt's remaining months) and deleting a category (which must reassign orphaned records to "Otros") — run inside **single Postgres RPC functions**, giving transactional atomicity for free. The client only ever *reads* the saved totals.

Security is enforced via **Row-Level Security keyed to `auth.uid()`** on every table, so although v1 is single-user, a second user could be added with zero schema rewrites. The public `anon` key ships to the browser (by design); the `service_role` key never leaves the server. Money is integer centavos everywhere and formatted to MXN only at the display layer via `Intl.NumberFormat`.

---

## 2. Functional Requirements

**Transactions (entries)**
- FR-1 CRUD a transaction that is either **EXPENSE or INCOME** (default EXPENSE).
- FR-2 Date may be past/future; default = today.
- FR-3 Free-text description.
- FR-4 Category from a managed list (add/rename/delete). Deleting a category with existing records **reassigns those records to "Otros"**.
- FR-5 Category **"Otros" cannot be deleted**; system `debt` category cannot be deleted.
- FR-6 When category = **debt**, form shows a dropdown of active debts and defaults the amount to that debt's **minimum monthly payment**.
- FR-7 Each entry flagged **recurrent or variable** (label/filter only; no generation).
- FR-8 Seed categories: Casa, Coche, Suscripciones, Comida, Salidas, Viajes, Entretenimiento, Súper, Ropa, Personal, Otros (+ system `debt`).

**Investments**
- FR-9 Record a contribution: pick investment vehicle + amount + date.
- FR-10 CRUD the investment vehicles themselves (name + manually-editable market value). Seed: GBM, Cetes.

**Views**
- FR-11 Default view: expenses and incomes in **separate tables, per selected month**.
- FR-12 For debt-category expenses in the monthly view, show **which debt** is being paid.
- FR-13 Full-year view with year selector (per-month income/expense/balance/invested).
- FR-14 Period totals: **total income, total expense, balance**.
- FR-15 **Total investment added** in the period.

**Main / dashboard**
- FR-16 Show **liquidCash** (all-time income − expense), read from the saved denormalized total.
- FR-17 Show **totalInvested** per vehicle and grand total.
- FR-18 Show **market value** per vehicle and **totalInterestMoney** (= totalMarketValue − totalInvested) in amount and %.
- FR-19 Show **pending debts for the month**.

**Debts**
- FR-20 Create a debt with total months, due day-of-month, start date, minimum payment.
- FR-21 Modify total months / due day / start date / remaining months (manual override).
- FR-22 Record a monthly payment; when it covers the minimum, **decrement remaining months by one** — atomically with the resulting cash transaction.

**Recommended items**
- FR-23 If an expected expense/income is missing for a month, **recommend adding it** (derived by category + month + year).
- FR-24 CRUD recommended items and their start/end recommendation window.

**Backend**
- FR-25 Supabase backend; single user with a Supabase Auth account (admin-provisioned); RLS enforced.

---

## 3. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Correctness** | `liquidCash` / `totalInvested` exactly consistent with underlying rows at all times. Integrity in DB, not client. Money never in floats. |
| **Availability** | Online-only; app unusable for data ops without network. Inherits Supabase SLA. App shell loads instantly from SW cache. |
| **Performance** | Dashboard read < 300 ms (single indexed row + small aggregates). Month view < 500 ms typical. |
| **Security** | RLS on all tables; `service_role` never client-side; Zod boundary validation + DB constraints; secure cookie-based sessions. |
| **Scalability** | Personal scale (thousands of rows/year). Denormalized totals keep dashboard O(1). Pagination for multi-year queries. |
| **Installability** | Manifest, icons, service worker, HTTPS → passes PWA install criteria. |
| **Accessibility** | WCAG 2.1 AA: keyboard nav, labels, focus management, contrast (Radix/shadcn primitives). |
| **Maintainability** | Typed end-to-end (TS types generated from DB schema). 80% overall / 90% new / 95% financial-path coverage. |
| **Localization** | Spanish UI, `es-MX` number/date formatting, `America/Mexico_City` for month/due-day logic. |

---

## 4. Technology Stack & Justification

| Concern | Choice | Why | Alternatives considered |
|---------|--------|-----|-------------------------|
| **Build tool** | **Vite** | Fast dev/HMR; `vite-plugin-pwa` (Workbox) gives a service worker with near-zero config. | *Next.js* — SSR/SSG unneeded, adds server surface. *CRA* — deprecated. |
| **Language** | **TypeScript (strict)** | End-to-end type safety; Supabase generates DB types so queries check against schema. | Plain JS — loses money-math safety. |
| **Routing** | **React Router v7** | Simple for a handful of routes. | *TanStack Router* — heavier than needed. |
| **Server state** | **TanStack Query** + `@supabase/supabase-js` | Caching, background refetch, **auto-invalidation** after mutations (refetch saved total). | *SWR* — weaker mutation ergonomics. *RTK Query* — pulls in Redux. |
| **UI state** | **Zustand** | Tiny; only selected month/year + modals. | *Redux Toolkit* — overkill. |
| **Forms + validation** | **React Hook Form + Zod** | Zod = single boundary validator, reusable payload types. | *Formik + Yup* — weaker TS inference. |
| **Styling / components** | **Tailwind CSS + shadcn/ui (Radix)** | Accessible primitives; fast, consistent forms. | *MUI* — heavier bundle. |
| **Money formatting** | **`Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN'})`** at display only | Correct MXN; storage stays integer centavos. | Custom formatter — reinvents Intl. |
| **PWA tooling** | **vite-plugin-pwa (Workbox)** | Precache app shell; **NetworkOnly for Supabase API** (online-only). | Hand-written SW — error-prone. |
| **Backend** | **Supabase** | One managed platform: relational integrity, triggers, RLS, Deno Edge Functions. | Firebase — no relational triggers/constraints. Self-hosted API — out of scope. |
| **Atomic server logic** | **Postgres RPC** (primary) + **Edge Functions** (only where secrets/orchestration needed) | RPC runs in a single DB transaction → free atomicity. | Client multi-call sequences — non-atomic, corrupts totals. |
| **Testing** | **Vitest + RTL, Playwright, MSW, pgTAP** | pgTAP proves trigger/RPC math (highest-risk code). | Jest — no schema-level testing. |
| **CI** | GitHub Actions: typecheck, lint, unit/integration, migration apply + pgTAP, dependency audit, Playwright | Enforces coverage gates + secret scanning. | — |

**Cross-cutting rationale:** minimize moving parts (no custom server), push correctness into Postgres, keep the client a thin, well-typed rendering + input-validation layer.

---

## 5. Overall System Architecture

```mermaid
flowchart TB
    subgraph Client["Browser — Installable PWA"]
        SW["Service Worker<br/>(Workbox: precache shell,<br/>NetworkOnly for API)"]
        UI["React SPA<br/>Router · RHF+Zod · Tailwind/shadcn"]
        RQ["TanStack Query cache"]
        SB["supabase-js client<br/>(anon key, httpOnly session)"]
        UI --> RQ --> SB
        SW -.serves shell.-> UI
    end

    subgraph Supabase["Supabase (BaaS)"]
        AUTH["Supabase Auth<br/>(single user, JWT)"]
        API["PostgREST + RPC endpoint"]
        subgraph PG["Postgres"]
            RLS["Row-Level Security<br/>auth.uid() = user_id"]
            TBL["Tables"]
            TRG["Triggers:<br/>liquidCash / totalInvested<br/>maintenance (insert/update/delete)"]
            RPC["RPC functions:<br/>record_debt_payment()<br/>delete_category()<br/>missing_recommendations()"]
        end
        EF["Edge Functions (Deno)<br/>(reserved: orchestration<br/>needing service_role)"]
    end

    SB -- HTTPS --> AUTH
    SB -- HTTPS/REST --> API
    SB -- HTTPS/RPC --> RPC
    SB -- HTTPS --> EF
    API --> RLS --> TBL
    RPC --> TBL
    TBL --> TRG
    EF -- service_role --> PG
```

**Key data-flow rules**
- Every read of `liquidCash`/`totalInvested` hits the **saved totals row** (never a client-side sum).
- Every mutation returns; the client then **invalidates the totals query** so the dashboard refetches the authoritative value.
- Multi-step money ops go through **one RPC call = one DB transaction**.

---

## 6. Frontend Architecture

**Layers**
1. **Routing shell** — `AppLayout` + routes: `/` (dashboard), `/month`, `/year`, `/debts`, `/investments`, `/categories`, `/recommended`, `/settings`, `/login`.
2. **Data layer** — a thin `src/api/` module wrapping `supabase-js` calls and RPCs, consumed exclusively via **TanStack Query hooks**. No component calls Supabase directly.
3. **Domain/validation** — `src/domain/` holds **Zod schemas** (the boundary validator) and pure money helpers (`toCentavos`, `formatMXN`, `signedEffect`). Money math never uses floats.
4. **UI** — shadcn/Radix components; forms via RHF + Zod resolver.
5. **State** — server state in TanStack Query; ephemeral UI state (selected month/year, modals) in Zustand.

**Design decisions & why**
- **Thin client, DB-authoritative totals.** The dashboard reads `totals` and renders; never recomputes. *Alternative* (client recompute) rejected — drifts from truth, re-sums on every render.
- **Optimistic UI intentionally limited.** After a mutation, invalidate + refetch the totals rather than optimistically mutate them, because the true delta (esp. debt payment side effects) is server-computed. Optimistic updates are fine for list rows, not the authoritative total.
- **Money boundary discipline.** UI holds centavos as integers; converts pesos↔centavos only at input/format edges.
- **`recurrence` is a filter facet** (toggle/badge); no scheduling engine.

**Component highlights**
- `EntryForm` — create/edit transaction. Watches `category`; when it resolves to the **debt** category, swaps in a **DebtSelect**, prefills `amount = debt.minimum_payment` (FR-6), and **warns if the debt already has a covering payment this month** (D6). Submitting a debt entry routes to the `record_debt_payment` RPC instead of a plain insert.
- `MonthView` / `YearView` — separate income/expense tables + period totals + investment-added total; debt annotation for debt rows (FR-12).
- `RecommendationBanner` — reads `missing_recommendations(month, year)` (§7.5) and offers one-click add.
- `InvestmentsPanel` — per-vehicle contributed total + editable market value; shows `totalInterestMoney` amount and % (D1).

---

## 7. Backend Architecture (Supabase)

Four layers: **schema**, **RLS**, **triggers/RPC**, **Edge Functions**.

### 7.1 Totals maintenance triggers (core integrity mechanism)

A single-row-per-user **`totals`** table holds `liquid_cash_cents` and `total_invested_cents`. Triggers on `transactions` keep `liquid_cash_cents` correct:

- **`signed_effect(type, amount)`** = `+amount` for income, `−amount` for expense.
- **AFTER INSERT** → `liquid_cash_cents += signed_effect(NEW)`.
- **AFTER DELETE** → `liquid_cash_cents -= signed_effect(OLD)`.
- **AFTER UPDATE (delta case)** → `liquid_cash_cents += (signed_effect(NEW) − signed_effect(OLD))`. This one expression correctly handles amount changes, type flips (expense↔income), and both at once.

Analogous triggers on `investment_contributions` maintain `total_invested_cents` **and** the per-vehicle running total on `investments.contributed_total_cents` (same insert/delete/update-by-delta pattern).

`totalInterestMoney` is **not stored** — it is derived at read time: `SUM(investments.market_value_cents) − total_invested_cents`, with percentage `= totalInterestMoney / total_invested_cents × 100` (returns 0/undefined when `total_invested_cents = 0`).

> **Concurrency note:** trigger updates to the single totals row serialize on that row's lock. At personal scale this is a non-issue and guarantees correctness under any interleaving.

*Why triggers over app code:* they fire inside the same transaction as the row change, cannot be bypassed from the client, and cannot partially apply. *Alternative* (recompute-on-read `SUM()`) rejected: O(n) reads, race-prone, violates locked decision #2.

### 7.2 Debt payment (atomic RPC)

`record_debt_payment(p_debt_id, p_amount_cents, p_date, p_description)` runs as **one Postgres function = one transaction**:

```mermaid
sequenceDiagram
    participant C as Client
    participant R as RPC record_debt_payment()
    participant T as transactions
    participant TR as trigger (liquidCash)
    participant D as debts
    participant P as debt_payments
    C->>R: (debt_id, amount, date, desc)
    R->>R: validate debt active, amount>0, RLS user match
    R->>T: INSERT expense row (category=debt, debt_id)
    T-->>TR: AFTER INSERT → liquidCash -= amount
    R->>P: INSERT debt_payment (links transaction_id)
    R->>R: covered = amount >= debt.minimum_payment
    alt covered && remaining_months > 0
        R->>D: remaining_months -= 1 (status='paid' if hits 0)
    end
    R-->>C: {transaction, debt, covered}
```

If any step fails, the whole thing rolls back — the cash debit and the month decrement can never disagree. *Why RPC not client sequence:* client-side "insert transaction, then patch debt" is two network calls; a failure between them corrupts `liquidCash` vs. debt state. *Why RPC not Edge Function:* no secrets/external calls needed, so a `SECURITY INVOKER` SQL function under the caller's RLS is simpler and safer.

Note: `remaining_months` is also **manually editable** via a plain `debts` update (bounded `0 … total_months`), independent of payments (D4).

### 7.3 Category deletion + reassignment (atomic RPC)

`delete_category(p_category_id)`:
1. **Guard:** reject if target `kind IN ('otros','debt')` → raises error (protects "Otros" and system `debt`; FR-5).
2. `UPDATE transactions SET category_id = <otros_id> WHERE category_id = p_category_id`.
3. `UPDATE recommended_items SET category_id = <otros_id> WHERE category_id = p_category_id`.
4. `DELETE FROM categories WHERE id = p_category_id`.

All in one transaction → no window where rows point at a deleted category. Reassignment does not change any amount, so `liquid_cash_cents` is untouched (correct). *Alternative* (`ON DELETE SET DEFAULT` FK) rejected: can't target a per-user "Otros" row dynamically or enforce the protection guard.

### 7.4 Debt lifecycle

Debts hold `total_months`, `remaining_months`, `minimum_payment_cents`, `due_day` (1–31, clamped to month length in the app/view per D7), `start_date`, `status` (`active`/`paid`/`archived`). Editing total months adjusts `remaining_months` sensibly (never below paid-so-far); `remaining_months` is also directly editable. **Deleting a debt = archive (soft delete)** so historical payment transactions and `liquidCash` remain intact (D5).

### 7.5 Recommended items — derived, not stored per month

Recommended items are **template rows** with a `[window_start, window_end]` recommendation window. "Missing for month M / year Y" is a **query/derived view**, never materialized per month:

> For a given `(month, year)` in America/Mexico_City: return each active recommended item whose window overlaps the month **and** for which **no `transaction` exists in that month/year sharing the item's `category_id`** (D3).

Exposed as RPC `missing_recommendations(p_month, p_year)`. *Why derived:* storing per-month rows would require a monthly job and could drift; a query is always correct and stateless.

### 7.6 Recurrent/variable flag

A plain `recurrence` enum column (`recurrent` | `variable`) on `transactions`, used **only** for filtering/coloring in views. No trigger, no generator, no cron.

### 7.7 Investments vs. contributions

- **`investments`** = the vehicles (GBM, Cetes, …), each with a trigger-maintained `contributed_total_cents` and a manually-editable `market_value_cents`.
- **`investment_contributions`** = money-add events (`investment_id`, `amount_cents`, `contrib_date`).
- **"Invested this month"** = `SUM(amount_cents)` of contributions where `contrib_date` in month (indexed).
- **"Invested per vehicle"** = `investments.contributed_total_cents` (trigger-maintained, O(1)).
- **Grand total invested** = `totals.total_invested_cents` (trigger-maintained).
- **Market value / interest** = per-vehicle `market_value_cents` (manual); `totalInterestMoney` derived (§7.1).
- Contributions **do not** affect `liquidCash` (D2).

---

## 8. Database Design

### 8.1 ER diagram

```mermaid
erDiagram
    USERS ||--|| TOTALS : has
    USERS ||--o{ CATEGORIES : owns
    USERS ||--o{ TRANSACTIONS : owns
    USERS ||--o{ DEBTS : owns
    USERS ||--o{ INVESTMENTS : owns
    USERS ||--o{ RECOMMENDED_ITEMS : owns
    CATEGORIES ||--o{ TRANSACTIONS : classifies
    CATEGORIES ||--o{ RECOMMENDED_ITEMS : classifies
    DEBTS ||--o{ TRANSACTIONS : "debt payments (category=debt)"
    DEBTS ||--o{ DEBT_PAYMENTS : records
    TRANSACTIONS ||--o| DEBT_PAYMENTS : "backs"
    INVESTMENTS ||--o{ INVESTMENT_CONTRIBUTIONS : receives

    TOTALS {
        uuid user_id PK_FK
        bigint liquid_cash_cents
        bigint total_invested_cents
        timestamptz updated_at
    }
    CATEGORIES {
        uuid id PK
        uuid user_id FK
        text name
        text kind "normal|otros|debt"
        timestamptz created_at
    }
    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        text type "expense|income"
        integer amount_cents "CHECK > 0"
        date tx_date
        text description
        uuid category_id FK
        text recurrence "recurrent|variable"
        uuid debt_id FK "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    DEBTS {
        uuid id PK
        uuid user_id FK
        text name
        integer total_months
        integer remaining_months
        integer minimum_payment_cents
        smallint due_day "1..31"
        date start_date
        text status "active|paid|archived"
        timestamptz created_at
    }
    DEBT_PAYMENTS {
        uuid id PK
        uuid user_id FK
        uuid debt_id FK
        uuid transaction_id FK
        integer amount_cents
        date payment_date
        boolean covered_minimum
        smallint months_decremented
        timestamptz created_at
    }
    INVESTMENTS {
        uuid id PK
        uuid user_id FK
        text name
        bigint contributed_total_cents
        bigint market_value_cents
        timestamptz created_at
    }
    INVESTMENT_CONTRIBUTIONS {
        uuid id PK
        uuid user_id FK
        uuid investment_id FK
        integer amount_cents "CHECK > 0"
        date contrib_date
        timestamptz created_at
    }
    RECOMMENDED_ITEMS {
        uuid id PK
        uuid user_id FK
        text type "expense|income"
        uuid category_id FK "nullable"
        text description
        integer expected_amount_cents "nullable"
        date window_start
        date window_end "nullable"
        timestamptz created_at
    }
```

### 8.2 Table notes, constraints, indexes

- **`totals`** — one row per user (`user_id` PK, FK → `auth.users`). `BIGINT` for headroom. Seeded all-zero on user creation. `totalInterestMoney` is **derived**, not stored.
- **`categories`** — `UNIQUE(user_id, name)` (D9). `kind` CHECK `IN ('normal','otros','debt')`. Partial unique indexes enforcing exactly one `otros` and one `debt` per user. Deletion of `otros`/`debt` blocked in RPC + belt-and-suspenders trigger.
- **`transactions`** — `amount_cents INTEGER CHECK (> 0)`; `type`/`recurrence` CHECK enums; `category_id` FK `ON DELETE RESTRICT` (deletion routed through the reassignment RPC); `debt_id` nullable FK, allowed only with the debt category (enforced in RPC + optional constraint trigger). Indexes: `(user_id, tx_date)`, `(user_id, category_id)`, `(user_id, type, tx_date)`, `(user_id, debt_id)`.
- **`debts`** — `CHECK (remaining_months BETWEEN 0 AND total_months)`, `CHECK (due_day BETWEEN 1 AND 31)`, `CHECK (minimum_payment_cents > 0)`. Index `(user_id, status)`.
- **`debt_payments`** — links `transaction_id` (FK) so the cash side and debt side trace to one event. Index `(user_id, debt_id, payment_date)`.
- **`investments`** — `UNIQUE(user_id, name)`; `contributed_total_cents BIGINT` (trigger-maintained); `market_value_cents BIGINT` (manual, default 0).
- **`investment_contributions`** — `amount_cents INTEGER CHECK (> 0)`. Indexes `(user_id, contrib_date)`, `(user_id, investment_id)`.
- **`recommended_items`** — `CHECK (window_end IS NULL OR window_end >= window_start)`. Index `(user_id, type, category_id)`.
- **All tables** carry `user_id uuid NOT NULL DEFAULT auth.uid()` to drive RLS.

*Why `DATE` not `timestamptz` for `tx_date`:* budgeting is day-granular; storing time invites TZ off-by-one at month boundaries. Audit columns (`created_at`) stay `timestamptz`.

---

## 9. API Design

No custom REST server — access is **PostgREST auto-API (RLS-guarded) for CRUD** plus **named RPCs for atomic multi-step ops**.

### 9.1 Direct table access (via supabase-js, RLS-filtered)

| Operation | Access pattern | Notes |
|-----------|----------------|-------|
| Read dashboard totals | `select` on `totals` (1 row) + `investments` for market value | O(1); interest derived client-side or via a view. |
| Month view | `select` on `transactions` by `tx_date` range + `type`, ordered | Uses `(user_id, type, tx_date)` index; paginate if needed. |
| Year view | Wider date range; per-month subtotals via view/RPC. |
| Investment "added this month" | `select sum(amount_cents)` on `investment_contributions` in range. |
| CRUD transaction (non-debt) | `insert`/`update`/`delete` on `transactions` | Triggers adjust `liquidCash`; client invalidates `totals` query. |
| CRUD investments / contributions | table ops | Triggers adjust invested totals; market value is a plain update. |
| CRUD categories (add/rename) | table ops | **Delete goes through RPC.** |
| CRUD recommended items | table ops | |
| Update debt / remaining months | `update` on `debts` | Manual override (D4). |

### 9.2 RPC signatures

| RPC | Request | Response | Guarantees |
|-----|---------|----------|-----------|
| `record_debt_payment` | `debt_id, amount_cents, date, description` | `{transaction, debt(updated), covered_minimum, months_decremented}` | Atomic cash expense + payment row + conditional one-month decrement. |
| `delete_category` | `category_id` | `{deleted_id, reassigned_count}` | Atomic reassign-to-Otros + delete; rejects Otros/debt. |
| `missing_recommendations` | `month, year` | `[{recommended_item, reason:'missing'}]` | Pure derived query by category + month + year. |
| `create_debt` (optional) | `name, total_months, minimum_payment_cents, due_day, start_date` | `{debt}` | Sets `remaining_months = total_months`. |
| `year_summary` (optional) | `year` | `[{month, income_cents, expense_cents, balance_cents, invested_cents}]` | Server-side aggregation for the year view. |

*Why some ops are RPC and others direct-table:* single-row CRUD is safely handled by PostgREST + triggers + RLS; only multi-row/multi-table atomic operations need an RPC.

---

## 10. Authentication & Authorization

- **Auth:** Supabase Auth (email + password). The single account is **created and managed entirely via the Supabase admin dashboard** (D8). **No password-reset or MFA UI, no self-serve signup.** The app exposes only a login screen. Session via supabase-js with tokens in **httpOnly, secure, sameSite cookies** (never `localStorage`); refresh handled by supabase-js.
- **Authorization:** **RLS on every table**, policy `USING (auth.uid() = user_id)` and `WITH CHECK (auth.uid() = user_id)` for insert/update. RPCs run `SECURITY INVOKER` so they execute under the caller's RLS (no privilege escalation).
- **Single-user, multi-user-ready:** everything is keyed to `auth.uid()`, so adding a user requires only creating their account + seeding their `totals`/categories/investments (a `handle_new_user` trigger can auto-seed) — no schema or policy change.
- **Keys:** browser ships the **`anon` public key** (safe by design; RLS is the guard). **`service_role` key never reaches the client** — used only in server-side Edge Functions/CI, from env/secret manager.

---

## 11. File Storage Strategy

**None required for v1.** The app stores only structured financial records; no receipts, attachments, avatars, or file exports are in scope. Supabase Storage is therefore not provisioned, reducing attack surface.

*If added later* (e.g., attach a receipt image): Supabase Storage with RLS-scoped buckets, validate by **magic bytes not extension**, random filenames, EXIF stripping, size caps, and signed URLs.

---

## 12. External Services & Integrations

| Service | Purpose | Notes |
|---------|---------|-------|
| **Supabase** | Postgres, Auth, RLS, Edge Functions | The only backend. |
| **Static host** (Vercel/Netlify/Cloudflare Pages) | Serve the built PWA over HTTPS | Set security headers here (§13). |
| **None else for v1** | No FX, email/SMS, bank sync, or analytics | Auth recovery handled in the Supabase admin dashboard (D8). |

FX, bank aggregation, and breached-password checks (HIBP) are future integrations (§20).

---

## 13. Security Considerations

- **Secret management:** `anon` key injected via build-time env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). **`service_role` never in the client bundle or repo.** `.env` gitignored at project creation. CI + pre-commit secret scanning.
- **Input validation at the boundary:** Zod schemas validate every form/RPC payload (type, length, range, allowlist enums for `type`/`recurrence`), rejecting invalid input with descriptive errors — never silent coercion. **Numeric guards:** positive integer centavos within `INTEGER` range; reject NaN/Infinity/negative; `due_day` 1–31; months ≥ 0. **DB CHECK constraints re-validate** as defense in depth.
- **SQL safety:** all access via supabase-js/PostgREST parameterization; RPCs are parameterized SQL functions — no string-concatenated SQL.
- **AuthZ:** RLS on 100% of tables; RPCs `SECURITY INVOKER`.
- **Sessions/JWT:** httpOnly secure cookies, short-lived access token + rotating refresh; invalidate on logout.
- **HTTP headers (at static host / CDN):** HSTS (≥1yr, includeSubDomains, preload), CSP (`default-src 'self'`; `connect-src` to the Supabase project URL; no `unsafe-eval`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` locking camera/mic/geo, `Cache-Control: no-store` for authed responses. Remove `X-Powered-By`.
- **CORS:** Supabase project allowlists the app origin(s) from config, not `*`.
- **Dependency scanning:** `npm audit` + Dependabot/Renovate in CI; pinned versions; block critical/high CVEs.
- **PWA/SW caveat:** service worker uses **NetworkOnly for `/rest`, `/auth`, `/functions`** — never cache authed financial responses. Precache only shell/static assets.

---

## 14. Performance & Scalability

- **Denormalized totals** make the dashboard **O(1)** regardless of history size — the central perf decision.
- **Indexes** on `(user_id, tx_date)`, `(user_id, type, tx_date)`, `(user_id, category_id)`, `(user_id, contrib_date)` keep month/year views index-range scans.
- **Pagination** on month/year lists via PostgREST range/keyset on `(tx_date, id)`; year view uses the `year_summary` aggregate RPC.
- **Trigger cost** is a single-row UPDATE per write; the totals-row lock serializes concurrent writes correctly.
- **Bundle/PWA perf:** Vite code-splitting per route; Workbox precache for instant shell load; MXN formatting via native `Intl`.
- **Scale ceiling:** even a decade of daily entries (~4k rows/yr) is trivial for Postgres. `transactions` can be year-partitioned if ever needed — noted, not required.

---

## 15. Logging, Monitoring & Error Handling

- **DB/Edge:** Supabase Postgres/API/Edge logs. RPCs raise descriptive typed errors (`cannot_delete_protected_category`, `debt_not_active`) mapped to user messages. Never log secret values or tokens.
- **Client:** central error boundary + TanStack Query `onError` toasts; distinguish network-offline (explicit "You're offline" state) from validation vs. server errors.
- **Invariant monitoring (recommended):** a periodic **reconciliation check** asserting `liquid_cash_cents == SUM(signed_effect(transactions))` and `total_invested_cents == SUM(contributions)`. Any drift is a trigger bug and must alert — the single most valuable monitor in a money app.
- **Optional:** Sentry for client error tracking (PII-scrubbed).

---

## 16. Folder / Project Structure

```
budget-app/
├─ .env.example                 # names only, no values
├─ index.html
├─ vite.config.ts               # + vite-plugin-pwa config
├─ tailwind.config.ts
├─ public/
│  ├─ manifest.webmanifest
│  └─ icons/                    # PWA icons (maskable + any)
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ router.tsx
│  │  └─ AppLayout.tsx
│  ├─ pages/
│  │  ├─ Dashboard.tsx
│  │  ├─ MonthView.tsx
│  │  ├─ YearView.tsx
│  │  ├─ Debts.tsx
│  │  ├─ Investments.tsx
│  │  ├─ Categories.tsx
│  │  ├─ Recommended.tsx
│  │  └─ Login.tsx
│  ├─ api/                      # supabase-js wrappers + RPC calls
│  │  ├─ supabaseClient.ts
│  │  ├─ transactions.ts
│  │  ├─ totals.ts
│  │  ├─ debts.ts               # record_debt_payment
│  │  ├─ categories.ts          # delete_category
│  │  ├─ investments.ts
│  │  └─ recommendations.ts     # missing_recommendations
│  ├─ hooks/                    # TanStack Query hooks
│  ├─ domain/
│  │  ├─ schemas.ts             # Zod (boundary validation)
│  │  ├─ money.ts               # centavos ↔ pesos, formatMXN, signedEffect
│  │  └─ types.ts               # generated DB types re-exported
│  ├─ components/               # shadcn/ui + app components (EntryForm, DebtSelect…)
│  └─ store/                    # Zustand (selected month/year, modals)
├─ supabase/
│  ├─ migrations/               # SQL: tables, RLS, triggers, RPCs (source of truth)
│  ├─ functions/                # Edge Functions (Deno) — only if needed
│  ├─ tests/                    # pgTAP tests for triggers/RPCs
│  └─ seed.sql                  # seed categories, investments, totals row
├─ tests/
│  ├─ unit/                     # Vitest + RTL
│  └─ e2e/                      # Playwright
└─ .github/workflows/ci.yml
```

*Why `supabase/migrations` is source of truth:* schema, RLS, triggers, and RPCs are versioned SQL applied in CI — reproducible and reviewable, not clicked in a dashboard.

---

## 17. Development Phases

Each phase has a verifiable exit criterion.

- **Phase 0 — Foundations.** Vite+TS+Tailwind+shadcn scaffold; Supabase project; env wiring; PWA manifest + SW. *Verify:* app installs; Lighthouse PWA pass; login works against an admin-seeded user.
- **Phase 1 — Schema & integrity core.** Migrations for all tables, RLS, seed data, and the `liquidCash`/`totalInvested` triggers. *Verify:* pgTAP proves insert/update(delta)/delete keep totals exactly correct, including type-flip.
- **Phase 2 — Transactions CRUD + dashboard.** EntryForm, month view, dashboard reading saved totals. *Verify:* E2E CRUD reflects in `liquidCash`; float-free money round-trip tests.
- **Phase 3 — Categories.** Category CRUD + `delete_category` RPC (reassign to Otros, protect Otros/debt, reject name collisions). *Verify:* pgTAP atomic reassignment; protected deletions rejected.
- **Phase 4 — Debts.** Debt CRUD (incl. manual remaining-months override); `record_debt_payment` RPC; debt-category branch in EntryForm (DebtSelect + min-payment prefill + duplicate-payment warning); pending-debts widget; debt annotation in month view. *Verify:* pgTAP atomic payment + one-month decrement + rollback.
- **Phase 5 — Investments.** Vehicle CRUD, contributions, per-vehicle contributed + market value, grand totals via triggers; `totalInterestMoney` amount + %; "invested this period." *Verify:* pgTAP totals; UI shows per-vehicle contributed/market value/interest.
- **Phase 6 — Views polish + Recommended items.** Year view + aggregates; `missing_recommendations(month, year)` + banner. *Verify:* derived recommendations correct for seeded scenarios.
- **Phase 7 — Hardening.** Security headers, CORS allowlist, dependency scan, reconciliation monitor, a11y pass, coverage gates green. *Verify:* CI gates pass; header scan clean; reconciliation asserts zero drift.

---

## 18. Milestones

| M | Milestone | Definition of done |
|---|-----------|--------------------|
| **M1** | Installable shell + auth | PWA installs; single user logs in; RLS blocks cross-user reads. |
| **M2** | Integrity core proven | Triggers pass pgTAP for all insert/update-delta/delete cases. |
| **M3** | Everyday budgeting usable | Add/edit/delete expenses & incomes; month view; live dashboard balance. |
| **M4** | Category management | Reassign-to-Otros + protection + collision rejection working atomically. |
| **M5** | Debt engine | Atomic debt payment (cash + one-month decrement); manual override; pending-debts view. |
| **M6** | Investments & full views | Contributions, per-vehicle contributed/market value, interest %, year view, recommendations. |
| **M7** | Production hardened | Security headers, scans, reconciliation monitor, coverage & a11y gates green → **release candidate**. |

---

## 19. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Trigger math bug silently corrupts totals | High | pgTAP for every path incl. update-by-delta & type-flip; reconciliation monitor; triggers are the only totals writer. |
| Client tries to compute/patch totals | High | Rule: client reads totals, never writes them; code review; consider revoking direct writes to totals columns. |
| Debt payment partial failure | High | Single RPC = single transaction; atomic by construction. |
| Category delete leaves orphans / deletes Otros | Medium | RPC guard + `ON DELETE RESTRICT` FK + partial unique index. |
| Float creep in money | High | Integers everywhere; conversion only at edges; property tests on money helpers. |
| `service_role` leak | Critical | Never in client bundle; secret scanning in CI + pre-commit. |
| Online-only UX friction | Low/Medium | Clear offline state; SW keeps shell fast; documented trade-off. |
| Timezone month-boundary bugs (due_day, month filters) | Medium | `DATE`-only storage; fixed `America/Mexico_City`; tests around day 29–31. |
| Market value staleness (manual entry) | Low | Clearly labeled as manual; `totalInterestMoney` derived from it; future price-feed noted. |
| Supabase vendor lock-in | Low/Medium | Standard Postgres SQL + thin isolated `src/api/` wrapper. |

---

## 20. Future Extensibility

- **Multi-user:** already RLS-ready; add signup UI + `handle_new_user` auto-seed trigger. No schema rewrite.
- **Multi-currency:** add `currency` per amount (still integer minor units) + FX rate table; display layer already isolated.
- **Offline/local-first:** deliberately out of v1; would need an outbox + IndexedDB mirror + server-side reconciliation because DB-authoritative totals can't be trusted offline.
- **Budgets/limits & alerts:** add a `budgets` table (per category, per month) derived over existing indexed queries.
- **Reporting/exports:** CSV/PDF export, trend charts, category breakdowns — read-side; would introduce File Storage (§11) if persisted.
- **Receipts/attachments:** Supabase Storage with the file-upload hardening in §11.
- **Automated market value / interest:** integrate a price feed to update `market_value_cents` per vehicle automatically.
- **Recurrence automation:** if auto-generated recurring entries are ever wanted, add a scheduled Edge Function (pg_cron) — out of v1 (the flag stays a label).
- **Year view category matrix:** per-category-per-month breakdown (D10 deferred).

---

*Prepared for the Budget Manager project. All ten open questions resolved (see Part 0). Implementation pending explicit approval.*
