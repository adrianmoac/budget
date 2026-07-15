# Budget Manager — Phase 5 Completion Summary

**Scope built:** Phase 5 (Investments — vehicle CRUD, contributions, market value,
interest) per the Development Phases table (Architecture §17 / Spec §1.1) and exit
gate **CP-5**.
**Environment:** Local frontend toolchain (Vite 6 / React 19 / TS strict) + the
local Supabase schema/triggers delivered in Phase 1.
**Git state:** Complete in the working tree, **uncommitted** (not staged, not
pushed) by request.

**Exit gate (CP-5, §9):** _"contributions maintain invested totals without touching
liquid cash; market value + interest amount/% correct; zero-contribution guard."_ —
met. The invested-totals integrity is proven by the Phase 1 pgTAP
(`03_total_invested.test.sql`, 12 assertions); Phase 5 delivered the `/investments`
UI and its CRUD wiring.

---

## 1. Summary of work completed

**Backend — no new work required (already delivered in Phase 1).**
The investments data model and integrity core were built and proven in Phase 1, not
Phase 5:

- `0006_investments.sql` (vehicles, `UNIQUE(user_id, name)`, RLS, full CRUD grant;
  `contributed_total_cents` trigger-maintained), `0009_investment_contributions.sql`
  (contributions table + indexes + RLS), and `0012_trigger_total_invested.sql` (the
  only writer of `totals.total_invested_cents` and `investments.contributed_total_cents`;
  handles insert/delete/update-by-delta **and** moving a contribution between vehicles;
  never touches `liquid_cash`).
- pgTAP `03_total_invested.test.sql` already covers §7.6 exhaustively: insert raises
  grand + per-vehicle totals, contributions leave liquid cash at 0, accumulation,
  update-by-delta, moving between vehicles (grand total unchanged, source debited,
  destination credited), and delete reversal.

Because Phase 5 introduced **no schema change**, no migration was added and DB types
did not need regeneration (§9 DoD "types regenerated" is a no-op here).

**Frontend (the Phase 5 core, §4.7):**

- **Domain:** `investmentFormSchema` (name 1–80, trimmed) and `contributionFormSchema`
  (`investment_id` uuid + shared `pesosAmountSchema` amount + `isoDateSchema` date)
  added to `schemas.ts`. The existing pure `computeInterest` helper
  (`domain/investments.ts`, market − invested with divide-by-zero guard) is reused for
  per-vehicle interest.
- **api/:** `api/investments.ts` gains `createInvestment` / `renameInvestment` /
  `deleteInvestment` (plain table ops; `contributed_total_cents` is never written by
  the client). `api/contributions.ts` gains `listContributions`, `createContribution`,
  `deleteContribution` (+ the pre-existing `fetchInvestedCentsInMonth` from Phase 2).
- **hooks/:** `useInvestments.ts` gains `useCreateInvestment` / `useRenameInvestment` /
  `useDeleteInvestment` (invalidate `['investments']`). New `useContributions.ts`
  (`useContributions`, `useCreateContribution`, `useDeleteContribution`) applies the
  §6.1 invalidation matrix — `['totals']`, `['investments']`, `['contributions',
  {investmentId}]` — plus a prefix invalidation of `['investedThisMonth']` so the
  Phase 2 month-view "invested this period" figure stays correct after a contribution
  (that consumer predates the spec's registry; documented inline).
- **UI (`/investments` page, §4.7):**
  - `InvestmentList` — table of vehicles: name, contributed total, **inline-editable
    market value** (market value ≥ 0, `useUpdateMarketValue`), per-vehicle interest
    amount + % (hidden with a "Sin inversiones aún" tooltip when contributed = 0), and
    row actions (add contribution / view history / rename / delete). Delete is disabled
    when `contributed_total_cents > 0` (the `ON DELETE RESTRICT` FK would block it),
    with an explanatory title.
  - `InvestmentForm` — create/rename vehicle dialog; name collisions surface on the
    field as `name_conflict`.
  - `ContributionForm` — record a contribution (vehicle Select + amount + date);
    prefills the vehicle when opened from a row.
  - `ContributionHistory` — per-vehicle contribution list with an inline per-row
    delete confirm (avoids a nested modal); deletion reverses invested totals via the
    trigger.
  - `Investments.tsx` orchestrates the list + four dialogs, wired into the router
    (`/investments`, lazy) and the nav ("Inversiones").

**Verification state (last run):**
`npm run typecheck` → clean · `npm run lint` → clean ·
`npm run test` (Vitest) → **81/81 unit tests pass** (73 prior + 8 new) ·
`npm run build` → succeeds (PWA shell + SW generated) ·
`npx playwright test --list` → **11 E2E tests compile** (2 new investment specs).

---

## 2. Files created

**Frontend**
- `src/hooks/useContributions.ts` — contribution query + create/delete mutations.
- `src/pages/Investments.tsx` — the `/investments` page.
- `src/components/investments/InvestmentList.tsx` — vehicle table (inline market-value
  edit + per-vehicle interest + delete guard).
- `src/components/investments/InvestmentForm.tsx` — create/rename vehicle dialog.
- `src/components/investments/ContributionForm.tsx` — record-contribution dialog.
- `src/components/investments/ContributionHistory.tsx` — per-vehicle contribution list
  with delete.

**Tests (Vitest / Playwright)**
- `src/components/investments/InvestmentForm.test.tsx` — 2 tests (required-name block;
  create with trimmed name).
- `src/components/investments/ContributionForm.test.tsx` — 2 tests (empty-amount block;
  pesos→centavos conversion + create call).
- `src/components/investments/InvestmentList.test.tsx` — 4 tests (per-vehicle interest
  %, zero-contribution guard, delete disabled/enabled by contributed total).
- `tests/e2e/investments.spec.ts` — 2 Playwright specs (contribution raises vehicle
  total + liquid cash unchanged; market-value edit recomputes interest %),
  credential-gated like the prior E2E specs.

---

## 3. Files modified

- `src/domain/schemas.ts` — added `investmentFormSchema` + `contributionFormSchema`.
- `src/api/investments.ts` — added vehicle create/rename/delete.
- `src/api/contributions.ts` — added `listContributions` / `createContribution` /
  `deleteContribution`.
- `src/hooks/useInvestments.ts` — added vehicle CRUD mutation hooks.
- `src/app/router.tsx` — lazy `/investments` route.
- `src/app/AppLayout.tsx` — "Inversiones" nav entry.

---

## 4. Remaining tasks for Phase 5

- **Run the pgTAP + E2E against a live stack** (`supabase start` + admin-provisioned
  user + `E2E_EMAIL` / `E2E_PASSWORD`): `npm run db:test` and `npm run test:e2e`. The
  investments E2E specs are `test.skip`-gated when credentials are absent, so they
  compile but do not run headlessly here (same limitation Phases 3–4 documented). The
  invested-totals integrity is proven by the Phase 1 pgTAP once executed.
- **Commit** — intentionally **not** done, per the "never commit or add files to git"
  rule. All changes sit unstaged in the working tree.
- **CI coverage/gate wiring** remains a **CP-7** item (unchanged since Phase 3).

Nothing in the Phase 5 spec (§4.7 / §7.6 / CP-5) is left unimplemented.

---

## 5. Issues encountered / decisions worth surfacing

1. **Phase 5 required zero backend work.** Migrations `0006` / `0009` / `0012` and the
   integrity pgTAP `03_total_invested.test.sql` were delivered under Phase 1 (per the
   §1.2 migration order and §1.3 backend order, which place the invested trigger and
   its pgTAP in CP-1.3). Phase 5 is therefore purely the `/investments` frontend and
   its api/hook wiring. No new migration and no type regeneration were needed.
2. **`investedThisMonth` invalidation beyond the §6.1 matrix.** The authoritative
   contribution-invalidation matrix lists `['totals']`, `['investments']`,
   `['contributions', {investmentId}]`. Adding a contribution also changes the month
   view's "invested this period" figure (the Phase 2 `useInvestedThisMonth` read, an
   app-specific key that predates the spec's registry), so the contribution hooks also
   invalidate `['investedThisMonth']` by prefix. This is a correctness fix for an
   existing consumer, not new surface. `['yearSummary']` was **not** invalidated: its
   only consumer (YearView) is a Phase 6 feature that does not yet exist, so adding it
   now would be speculative.
3. **Vehicle delete vs. contributions (spec-silent edge).** §4.7 lists "delete vehicle"
   but §3.1's investments row has no RPC, and the `investment_contributions` FK is
   `ON DELETE RESTRICT`. Faithful, non-inventive handling: delete is disabled in the
   list when `contributed_total_cents > 0` (which — since contribution amounts are
   always `> 0` — is an exact "has contributions" signal), with a tooltip pointing the
   user to remove aportaciones first; a raw attempt still surfaces the mapped
   `fk_restrict_use_rpc` error as a backstop. No new RPC was invented.
4. **Contribution edit intentionally omitted (minimum viable).** §4.7's components are
   ContributionForm (add) and ContributionHistory (list); the §6.1 matrix lists
   create/**update**/delete, but no listed component edits a contribution. Per
   intent-discipline (no dead surface), only add + delete are wired in the UI;
   correction is delete-then-re-add. The underlying trigger already supports update
   (proven by Phase 1 pgTAP) should a future phase need it.
5. **Market-value inline edit is duplicated, not extracted.** The dashboard
   `InvestedSummaryCard` (Phase 2) and the new `InvestmentList` both edit market value
   inline with near-identical logic. Extracting a shared editor would modify the
   working Phase 2 file; per intent-discipline (no drive-by refactor of code that isn't
   broken) the two were kept independent. Flagged here as an observation for a future
   consolidation, not acted on.
6. **Referenced doc paths.** The prompt named `docs/Architecture.md` /
   `docs/ImplementationSpecification.md`; the repo files are `docs/ARCHITECTURE.md` and
   `docs/IMPLEMENTATION_SPEC.md`. Treated as the same source of truth — no content
   ambiguity.
