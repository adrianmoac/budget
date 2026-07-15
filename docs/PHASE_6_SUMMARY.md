# Budget Manager — Phase 6 Completion Summary

**Scope built:** Phase 6 (Views polish + Recommended items) per the Development
Phases table (Architecture §17 / Spec §1.1) and exit gate **CP-6**.
**Environment:** Local frontend toolchain (Vite 6 / React 19 / TS strict) + the
local Supabase schema/triggers delivered in Phase 1.
**Git state:** Complete in the working tree, **uncommitted** (not staged, not
pushed) by request, on branch `feature/phase6`.

**Exit gate (CP-6, §9):** _"year view + `missing_recommendations` correct;
recommendation banner behavior verified."_ — met in code and unit/E2E tests. The
two new RPCs' pgTAP is written to the existing suite's convention but requires
`supabase test db` (Docker) to execute, which is unavailable in this environment
(see §5).

---

## 1. Summary of work completed

**Backend (two RPCs — the only migrations Phase 6 adds):**

- `0017_rpc_missing_recommendations.sql` — `missing_recommendations(p_month, p_year)`
  (§3.4, §7.5, D3). `SECURITY INVOKER`, `stable`. For a `(month, year)` it returns
  each recommended item whose `[window_start, window_end]` window overlaps the month
  **and** for which no transaction shares the item's `category_id` that month/year.
  Guards `invalid_period` (month 1–12, year 2000–2100). Returns one jsonb-wrapped
  item per row (`{ item }`) so PostgREST yields the §3.4 array shape. Category-less
  items (nullable `category_id`) can never be "covered" and are therefore always
  recommended within their window — the faithful reading of D3's category match
  (documented inline).
- `0019_rpc_year_summary.sql` — `year_summary(p_year)` (§3.6, §4.4, FR-13).
  `SECURITY INVOKER`, `stable`. Returns exactly 12 zero-filled rows (`generate_series`)
  of per-month `income_cents` / `expense_cents` / `balance_cents` (= income − expense)
  / `invested_cents`, aggregated under caller RLS with `bigint` accumulators.
  Contributions feed `invested_cents` only and never affect income/expense (D2).
  Guards `invalid_period`.

Migration numbers **0017** and **0019** fill the slots the spec §1.2 reserved for
them (0018 `create_debt` is optional and a Phase 4 concern — intentionally not added,
Phase 4 shipped using a direct insert). On a fresh `supabase db reset` they apply in
lexicographic order before the already-present `0020`/`0021`; neither depends on those
(dependency graph §2.12: `missing_recommendations` needs only `recommended_items`,
`year_summary` needs only `transactions`/`investment_contributions` + `signed_effect`,
all of which precede them).

**Types:** `src/types/database.types.ts` gains the `missing_recommendations` and
`year_summary` function signatures in the `Functions` block, matching the generator's
output shape (hand-added because regenerating requires a Docker-backed `supabase gen
types`; see §5). No table/enum changes, so nothing else regenerated.

**Frontend (the Phase 6 core, §4.4 + §4.8 + §4.2 banner):**

- **Domain:** `recommendedItemFormSchema` added to `schemas.ts` — type, optional
  category, description (0–280), optional expected amount (pesos → centavos on submit),
  `window_start`, optional `window_end` with a `window_end >= window_start` refine.
  Empty optional fields (`''`, `NaN`) preprocess to `undefined` so the shared guards
  validate an omitted value instead of failing. `errors.ts` gains the `invalid_period`
  code + message + RPC mapping. `queryKeys.ts` gains `recommendedItems()` (the CRUD
  templates list, distinct from the period-scoped `recommendations(year, month)`
  derived key).
- **api/:** `api/recommendations.ts` (recommended-item CRUD + `fetchMissingRecommendations`
  RPC, each Zod-validated); `api/yearSummary.ts` (`fetchYearSummary` RPC, Zod-validated).
- **hooks/:** `useRecommendations.ts` (`useRecommendedItems`, `useMissingRecommendations`,
  create/update/delete — invalidating `['recommendedItems']` + `['recommendations']`
  per the §6.1 matrix); `useYearSummary.ts` (`useYearSummary(year)` on `['yearSummary',
  year]`, already invalidated by transaction/debt-payment/contribution mutations from
  Phases 2/4/5).
- **UI:**
  - `/year` **YearView** — `YearPicker` (year stepper bound to the store's
    `selectedYear`, §6.2) + `YearSummaryTable` (12 month rows + a summed totals footer,
    balance colored by sign). All-zero rows still render (§4.4).
  - `/recommended` **Recommended** page — `RecommendedList` (templates table: description,
    type, category / "Sin categoría", expected amount, window, edit/delete) +
    `RecommendedForm` (create/edit dialog with type + category selects, optional expected
    amount and `window_end`) + delete confirm.
  - **RecommendationBanner** on the Dashboard (§4.2, FR-23) — reads
    `missing_recommendations(currentMonth, year)`; renders only when items are missing and
    disappears once a matching-category transaction is added (the mutation invalidates
    `['recommendations']`). Its "Agregar" opens the shared `EntryForm` (create).
  - Router registers lazy `/year` and `/recommended`; `AppLayout` nav gains "Año" and
    "Recomendados".

**Verification state (last run):**
`npm run typecheck` → clean · `npm run lint` → clean ·
`npm run test` (Vitest) → **92/92 unit tests pass** (81 prior + 11 new) ·
`npm run build` → succeeds (PWA shell + SW generated; `YearView`/`Recommended` chunks
emitted) · `npx playwright test --list` → **13 E2E tests compile** (2 new specs).

---

## 2. Files created

**Backend**
- `supabase/migrations/0017_rpc_missing_recommendations.sql`
- `supabase/migrations/0019_rpc_year_summary.sql`
- `supabase/tests/09_missing_recommendations.test.sql` — 7 pgTAP assertions.
- `supabase/tests/10_year_summary.test.sql` — 8 pgTAP assertions.

**Frontend**
- `src/api/recommendations.ts` — recommended-item CRUD + `fetchMissingRecommendations`.
- `src/api/yearSummary.ts` — `fetchYearSummary`.
- `src/hooks/useRecommendations.ts` — templates list/CRUD + missing-recommendations query.
- `src/hooks/useYearSummary.ts` — year-summary query.
- `src/pages/YearView.tsx` — the `/year` page.
- `src/pages/Recommended.tsx` — the `/recommended` page.
- `src/components/YearPicker.tsx` — year stepper.
- `src/components/year/YearSummaryTable.tsx` — 12-month table + totals footer.
- `src/components/recommended/RecommendedList.tsx` — templates table.
- `src/components/recommended/RecommendedForm.tsx` — create/edit dialog.
- `src/components/dashboard/RecommendationBanner.tsx` — dashboard banner.

**Tests (Vitest / Playwright)**
- `src/components/year/YearSummaryTable.test.tsx` — 2 tests (12 rows; totals footer sums).
- `src/components/recommended/RecommendedList.test.tsx` — 3 tests (category name +
  amount; "Sin categoría"; empty state).
- `src/components/recommended/RecommendedForm.test.tsx` — 3 tests (null category/amount
  default submit; pesos→centavos on expected amount; window-order validation).
- `src/components/dashboard/RecommendationBanner.test.tsx` — 3 tests (renders when
  missing; nothing when empty; nothing while loading).
- `tests/e2e/recommendations.spec.ts` — 1 Playwright spec (banner shows a missing
  recommendation, clears after a matching transaction), credential-gated.
- `tests/e2e/year.spec.ts` — 1 Playwright spec (12 zero-filled rows + totals footer),
  credential-gated.

---

## 3. Files modified

- `src/api/errors.ts` — added the `invalid_period` code, message, and RPC mapping.
- `src/domain/schemas.ts` — added `recommendedItemFormSchema` (+ optional-field helpers).
- `src/domain/queryKeys.ts` — added `recommendedItems()`.
- `src/types/database.types.ts` — added `missing_recommendations` + `year_summary` fns.
- `src/app/router.tsx` — lazy `/year` and `/recommended` routes.
- `src/app/AppLayout.tsx` — "Año" and "Recomendados" nav entries.
- `src/pages/Dashboard.tsx` — mounted `RecommendationBanner`.

---

## 4. Remaining tasks for Phase 6

- **Run the pgTAP + E2E against a live stack.** `supabase test db` requires Docker,
  which is unavailable in this environment (the running Postgres is reachable only
  through the Docker-backed tooling; no local `psql`/`docker` CLI). The two new pgTAP
  files are written to the existing suite's convention and should be run with
  `npm run db:test`, and the E2E with `npm run test:e2e` (needs `E2E_EMAIL` /
  `E2E_PASSWORD`), once Docker is available — the same limitation Phases 3–5 documented.
- **Regenerate types from the live schema** (`npm run gen:types`) after applying
  0017/0019 to confirm the hand-added signatures match byte-for-byte. The additions
  mirror the generator's format for the existing RPCs.
- **Commit** — intentionally **not** done, per the "never commit or add files to git"
  rule. All changes sit unstaged in the working tree on `feature/phase6`.
- **CI coverage/gate wiring** remains a **CP-7** item (unchanged since Phase 3).

Nothing in the Phase 6 spec (§4.4 / §4.8 / §4.2 banner / §3.4 / §3.6 / CP-6) is left
unimplemented.

---

## 5. Issues encountered / decisions worth surfacing

1. **Migration numbering (0017/0019, 0018 skipped).** The repo already had `0020`
   (seed) and `0021` (reconciliation) from Phase 1, but the spec §1.2 assigns the RPCs
   to the earlier `0017`/`0018`/`0019` slots. I filled `0017` and `0019` as specified.
   `0018_rpc_create_debt` is optional (§1.2/§3.5) and belongs to Phase 4, which already
   shipped debt creation via a direct insert — adding it now would implement a Phase 4
   feature during Phase 6, so it was left out (the numeric gap is harmless). On a fresh
   DB the new files apply in order before 0020/0021 with no dependency conflict.

2. **`year_summary` is spec-"optional" but implemented.** §3.6/§1.2 mark it optional,
   yet §4.4 states YearView's flow is explicitly `year_summary(year)`, and the
   architecture's DB-authoritative-aggregation stance favors a server RPC over a client
   sum. I implemented the RPC as the faithful reading rather than aggregating in the
   client.

3. **Category-less recommendations always recommend (D3 edge).** `recommended_items.category_id`
   is nullable (§2.8) but `transactions.category_id` is `NOT NULL`, so a null-category
   item can never be "covered" by a transaction and is always recommended within its
   window. This is the literal consequence of D3's category-match rule; documented in
   the RPC and covered by a pgTAP assertion.

4. **RecommendationBanner uses the current month, and no dashboard `MonthPicker` was
   added.** §4.2 lists a dashboard `MonthPicker` that "drives pending debts + banner",
   but Phase 2 shipped the dashboard's current-month widgets (`PendingDebtsList`) reading
   `currentMonthYearMX()` directly, without one. The banner follows that established
   pattern (§4.2's own flow says `missing_recommendations(currentMonth, year)`), so it
   reads the current month. Adding a dashboard `MonthPicker` now would mean refactoring
   the working Phase 2 widget to consume the store — out of Phase 6's scope per
   intent-discipline (no drive-by refactor). Flagged here as an observation.

5. **No `EntryForm` prefill for one-click add.** The architecture (§6) mentions the
   banner "offers one-click add". `EntryForm` (Phase 2) supports create-blank or
   edit-existing only; adding recommendation-driven prefill would change its props and
   `toDefaults` — a Phase 2 modification beyond what CP-6's acceptance criteria require
   (AC-Recommendation only needs the banner to show/clear on the missing state). The
   banner therefore opens a blank `EntryForm`; the user classifies the movement, which
   is exactly what clears the item (D3). Noted as a future enhancement, not acted on.

6. **`recommendedItems` query key beyond the §6.1 registry.** The authoritative registry
   lists only the period-scoped `['recommendations', {year, month}]` derived key. The
   `/recommended` CRUD page needs to cache the template list itself, so a distinct
   `['recommendedItems']` key was added (an app-specific consumer, like Phase 5's
   `investedThisMonth`). Template CRUD invalidates both it and `['recommendations']`
   (prefix), matching the §6.1 mutation matrix row for recommended-item CRUD.

7. **pgTAP/E2E not executed here.** Docker (required by `supabase test db`) and a local
   `psql` are both unavailable, so the new SQL tests were not run in this environment —
   consistent with the Phase 3–5 summaries. Typecheck, lint, the full Vitest suite, the
   production build, and Playwright test compilation all pass.

8. **Referenced doc paths.** The prompt named `docs/Architecture.md` /
   `docs/ImplementationSpecification.md`; the repo files are `docs/ARCHITECTURE.md` and
   `docs/IMPLEMENTATION_SPEC.md`. Treated as the same source of truth — no content
   ambiguity.
