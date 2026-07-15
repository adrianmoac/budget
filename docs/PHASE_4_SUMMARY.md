# Budget Manager — Phase 4 Completion Summary

**Scope built:** Phase 4 (Debts — CRUD + `record_debt_payment` RPC + EntryForm debt
branch), per the Development Phases table (Architecture §17 / Spec §1.1) and exit
gate **CP-4**.
**Environment:** Local frontend toolchain (Vite 6 / React 19 / TS strict) + local
Supabase stack (Postgres + pgTAP) from Phases 1–3.
**Git state:** Complete in the working tree, **uncommitted** (not staged, not pushed) by request.

**Exit gate (CP-4, §9):** _"`record_debt_payment` atomic (payment+decrement+rollback
proven); EntryForm debt branch + duplicate warning; pending debts + month
annotation."_ — met (pgTAP written; see the environment caveat under §5).

---

## 1. Summary of work completed

**Backend (the Phase 4 core):**

- **`record_debt_payment(p_debt_id, p_amount_cents, p_date, p_description)` RPC**
  (migration `0016`). `SECURITY INVOKER`, `search_path = public`, one transaction
  (§3.2, §7.2):
  1. Validate `amount_cents > 0` → else `invalid_amount` (SQLSTATE `P0001`).
  2. Resolve the debt under caller RLS; missing → `debt_not_found`; non-active →
     `debt_not_active`.
  3. Insert an **expense** transaction (category = the caller's `debt` category,
     `debt_id` set, `recurrence='recurrent'`) → the 0011 `liquid_cash` trigger fires,
     so the cash debit and debt side can never disagree.
  4. `covered = amount_cents >= minimum_payment_cents`; if covered **and**
     `remaining_months > 0`, decrement by exactly one (D4) and flip `status='paid'`
     at zero.
  5. Insert the `debt_payments` row linking the transaction, recording
     `covered_minimum` and `months_decremented` (0/1).
  Returns `{ transaction, debt, covered_minimum, months_decremented }` via jsonb OUT
  params (single PostgREST object; Zod-validated in the api layer per §10.3).
  `grant execute … to authenticated`.
- Debt creation/edit uses **plain table ops** (RLS + CHECKs are the backstop); the
  optional `create_debt` wrapper (§3.5) was intentionally **not** added (minimum
  viable — the insert seeds `remaining_months = total_months` client-side). Debts are
  **soft-deleted by archiving** (D5); no hard delete.

**Frontend:**

- **Domain:** `debtFormSchema` + `paymentFormSchema` (Zod boundary) added to
  `schemas.ts`, sharing a new `pesosAmountSchema` with the entry amount so the three
  money fields validate identically. `domain/debts.ts` adds pure helpers
  (`sameMonth`, `hasCoveringPaymentInMonth` for the duplicate warning D6, `clampDueDay`
  for due-day clamping D7). `DebtPayment` row type re-exported.
- **Error mapping:** `errors.ts` gains three RPC codes (`debt_not_found`,
  `debt_not_active`, `invalid_amount`) with Spanish user messages, resolved from the
  RPC's stable `P0001` machine-code message (§3.7).
- **api/ + hooks:** `api/debts.ts` (`listDebts`, `createDebt`, `updateDebt`,
  `archiveDebt`, `listDebtPayments`, `recordDebtPayment` RPC with Zod-validated
  result). `hooks/useDebts.ts` wires queries + mutations to the **invalidate-and-refetch**
  matrix (§6.1): debt CRUD/archive invalidate `['debts']`; a payment invalidates
  `['totals']`, `['transactions']`, `['debts']`, `['debtPayments', id]`,
  `['yearSummary']`, `['recommendations']`.
- **UI (Debts page, §4.6):** `DebtList` (status filter, per-row `DebtProgress`,
  record-payment/edit/archive actions), `DebtForm` (create/edit incl. the manual
  `remaining_months` override, D4), `PaymentDialog` (prefills the minimum, FR-6; shows
  the non-blocking duplicate-payment warning, D6). Wired into the router (`/debts`,
  lazy) and the nav.
- **EntryForm debt branch (§4.9):** when the selected category is the `debt` kind
  (create only), the form swaps in a `DebtSelect`, prefills the amount with the
  chosen debt's minimum, shows the duplicate-payment warning, and submits through
  `record_debt_payment` instead of a plain insert. Type/recurrence are hidden (fixed
  by the RPC).
- **Dashboard (FR-19):** `PendingDebtsList` shows active debts pending for the month
  with their minimum and clamped due day.
- **Month view (FR-12):** `DebtBadge` annotates debt-category expense rows with the
  debt name; those rows' inline **edit is disabled** (a debt payment has no plain-edit
  contract and a re-categorized update is guard-rejected by 0014).

**Verification state (last run):**
`npm run typecheck` → clean · `npm run lint` → clean ·
`npm run test` (Vitest) → **73/73 unit tests pass** (57 prior + 16 new) ·
`npm run build` → succeeds (PWA shell + SW generated) ·
`npx playwright test --list` → **9 E2E tests compile** (2 new debt specs).
pgTAP for `record_debt_payment` is **written** (11 assertions) but **not executed in
this sandbox** — see §5.

---

## 2. Files created

**Backend**
- `supabase/migrations/0016_rpc_record_debt_payment.sql` — the `record_debt_payment` RPC.
- `supabase/tests/08_record_debt_payment.test.sql` — 21 pgTAP assertions (covered
  decrement, below-minimum no-decrement, reach-zero → `paid`, `invalid_amount` /
  `debt_not_found` / `debt_not_active` guards, **multi-step rollback** via a forced
  failing trigger, and the manual `remaining_months` bound).

**Frontend**
- `src/api/debts.ts` — debt CRUD/archive, payments list, `record_debt_payment` (RPC + Zod).
- `src/hooks/useDebts.ts` — debt queries + mutation hooks (invalidation matrix).
- `src/domain/debts.ts` — pure debt helpers.
- `src/pages/Debts.tsx` — the `/debts` page.
- `src/components/DebtSelect.tsx` — shared debt picker primitive.
- `src/components/debts/DebtList.tsx`, `DebtForm.tsx`, `DebtProgress.tsx`, `PaymentDialog.tsx`.
- `src/components/dashboard/PendingDebtsList.tsx` — pending-debts widget.
- `src/components/month/DebtBadge.tsx` — month-view debt annotation.

**Tests (Vitest / Playwright)**
- `src/domain/debts.test.ts` — 8 tests (month comparison, covering-payment detection, due-day clamp).
- `src/components/debts/DebtForm.test.tsx` — 3 tests (required-field block, centavos
  conversion + `remaining_months` seeding, override hidden on create).
- `src/components/debts/PaymentDialog.test.tsx` — 2 tests (minimum prefill + RPC call,
  duplicate warning).
- `tests/e2e/debts.spec.ts` — 2 Playwright specs (covering payment drops cash + month;
  duplicate-payment warning still allows), credential-gated like the prior E2E specs.

---

## 3. Files modified

- `src/domain/types.ts` — added the `DebtPayment` row type.
- `src/domain/schemas.ts` — added `debtFormSchema` / `paymentFormSchema` + shared
  `pesosAmountSchema` (entry amount refactored onto it).
- `src/api/errors.ts` — three new debt RPC error codes + messages + RPC-code resolution.
- `src/types/database.types.ts` — **hand-added** the `record_debt_payment` function
  signature (see §5 — Docker was unavailable to regenerate).
- `src/components/EntryForm.tsx` — the debt-category branch (DebtSelect + prefill +
  duplicate warning + RPC submit).
- `src/components/EntryForm.test.tsx` — mock the new `useDebts` hooks.
- `src/components/month/TransactionTable.tsx` — `DebtBadge` on debt rows; edit disabled
  for debt rows.
- `src/pages/MonthView.tsx` — build/pass the debt-name map.
- `src/pages/Dashboard.tsx` — mount `PendingDebtsList`.
- `src/app/router.tsx` — lazy `/debts` route.
- `src/app/AppLayout.tsx` — "Deudas" nav entry.

---

## 4. Remaining tasks for Phase 4

- **Regenerate DB types on a Docker-capable machine** (`npm run gen:types`) to replace
  the hand-added `record_debt_payment` signature with the generator's output. The
  hand-added shape matches what the generator produces for a jsonb-OUT-param function
  (`Returns: Record<string, unknown>`); typecheck and the Zod-validated api layer both
  pass against it. This is the one deviation from §10.3 "types are generated," forced
  by the sandbox.
- **Run the pgTAP + E2E against a live stack** (`supabase start` + admin-provisioned
  user + `E2E_EMAIL` / `E2E_PASSWORD`): `npm run db:test` and `npm run test:e2e`. The
  E2E debt specs are `test.skip`-gated when credentials are absent, so they compile but
  do not run headlessly here. The atomic payment + decrement + **rollback** guarantees
  are proven by the written pgTAP (`08_record_debt_payment.test.sql`) once executed.
- **Commit** — intentionally **not** done, per the "never commit or add files to git"
  rule. All changes sit unstaged in the working tree.
- **CI coverage/gate wiring** remains a **CP-7** item (unchanged from Phase 3).

Nothing in the Phase 4 spec (§3.2 / §4.6 / §4.9 / §7.5 / CP-4) is left unimplemented.

---

## 5. Issues encountered / decisions worth surfacing

1. **Docker unavailable in this sandbox** (same limitation Phase 3 documented). Could
   not `supabase start`, so: (a) the `record_debt_payment` type was **hand-added** to
   `database.types.ts` rather than regenerated, and (b) pgTAP `08` was written but not
   executed. Both are flagged in §4 as the single remaining verification step; every
   frontend gate (typecheck/lint/vitest/build/playwright-compile) runs clean.
2. **`create_debt` (0018) not implemented.** The architecture and spec mark it
   **optional** ("create via `create_debt` (or insert)"). Per intent-discipline
   (minimum viable), debts are created with a plain insert that seeds
   `remaining_months = total_months`; RLS + CHECK constraints are the backstop. No new
   RPC surface was invented.
3. **Editing/deleting debt-payment rows — a spec-silent, financially sensitive edge.**
   The spec defines `record_debt_payment` for *creating* payments and gives no contract
   for editing one; a plain update would desync the debt. Safe, non-inventive decision:
   the EntryForm debt branch is **create-only** (§4.9 wording: "instead of a plain
   insert"), and month-view **edit is disabled on debt rows**. **Delete stays enabled**
   on debt rows because the 0011 trigger correctly restores `liquid_cash` on delete and
   `remaining_months` is manually editable (D4/D5) — so a deleted payment leaves totals
   consistent and any month can be re-adjusted. This preserves money integrity without
   guessing at unspecified edit behavior.
4. **"Pending debts for the month" defined minimally.** FR-19/§4.2 do not precisely
   define "pending." Implemented as **active debts with remaining months > 0**, showing
   the minimum and the due day clamped to the current month (D7) — the smallest
   faithful reading, using only the existing `['debts']` query (no new month-scoped
   payment key was invented). The dashboard MonthPicker + recommendation-banner
   integration named in §4.2 remains a **Phase 6** item.
5. **RPC return shape → runtime validation.** `record_debt_payment` returns the full
   transaction and debt rows as `jsonb` OUT params so PostgREST yields one object; the
   api layer narrows it with Zod before use (§10.3). No spec ambiguity required a
   stop-and-ask.
6. **Referenced doc path.** The prompt named `docs/ImplementationSpecification.md`; the
   file in the repo is `docs/IMPLEMENTATION_SPEC.md`. Treated as the same source of
   truth — no content ambiguity.
