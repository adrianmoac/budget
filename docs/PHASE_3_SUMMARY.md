# Budget Manager — Phase 3 Completion Summary

**Scope built:** Phase 3 (Categories — CRUD + `delete_category` RPC), per the
Development Phases table (§17) and exit gate **CP-3**.
**Environment:** Local frontend toolchain (Vite 6 / React 19 / TS strict) + local
Supabase stack (Postgres + pgTAP) from Phase 1.
**Git state:** Complete in the working tree, **uncommitted** (not staged, not pushed) by request.

**Exit gate (CP-3, §17):** _"Category CRUD + `delete_category` RPC (reassign to Otros,
protect Otros/debt, reject name collisions). Verify: pgTAP atomic reassignment; protected
deletions rejected."_ — met.

---

## 1. Summary of work completed

**Backend (the Phase 3 core):**

- **`delete_category(p_category_id)` RPC** (migration `0015`, deferred from Phase 1 per the
  architecture-wins decision). `SECURITY INVOKER`, `search_path = public`, one transaction
  (§7.3):
  1. Look up the target `kind`; raise `category_not_found` (SQLSTATE `P0001`) if it does not exist.
  2. Raise `cannot_delete_protected_category` (`P0001`) if `kind IN ('otros','debt')` (FR-5).
  3. Reassign `transactions` **and** `recommended_items` from the target category to the
     user's `otros` category; capture the affected row counts via `GET DIAGNOSTICS`.
  4. `DELETE` the category.
  Returns `{ deleted_id, reassigned_transactions, reassigned_recommendations }` via OUT
  parameters. Reassignment changes no amounts, so `liquid_cash_cents` is untouched (§7.3).
  `grant execute … to authenticated`.
- **Name-collision rejection** is enforced by the existing `UNIQUE(user_id, name)` constraint
  (D9) — surfaced on both create and rename as PostgREST `23505` → typed `name_conflict`.

**Frontend:**

- **Domain:** `categoryFormSchema` (Zod boundary — `name` trimmed, 1–64 chars) added to
  `schemas.ts`.
- **Error mapping:** `errors.ts` extended with the two RPC codes (`category_not_found`,
  `cannot_delete_protected_category`) and their Spanish user messages; `P0001` PostgREST
  errors are resolved to a typed code by matching the RPC's stable machine-code message (§3.7).
- **api/ + hooks:** `categories.ts` gains `createCategory` / `renameCategory` (table ops) and
  `deleteCategory` (RPC call, result **Zod-validated** before use per §10.3). `useCategories.ts`
  gains create/rename/delete mutation hooks wired to the **invalidate-and-refetch** matrix
  (§6.1): create/rename invalidate `categories`; delete invalidates `categories`,
  `transactions`, and `recommendations` (not totals — amounts are unchanged).
- **UI:** `CategoryList` (table; protected `otros`/`debt` rows show a lock icon with disabled
  edit/delete, FR-5), `CategoryForm` (shared create/rename dialog; field-level `name_conflict`
  error), and the `Categories` page (orchestrates list + form + delete `ConfirmDialog` warning
  about reassignment to Otros). Wired into the router (`/categories`, lazy) and the nav.

**Verification state (last run):**
`npm run typecheck` → clean · `npm run lint` → clean ·
`npm run test` (Vitest) → **57/57 unit tests pass** (49 prior + 8 new) ·
`npm run build` → succeeds (PWA shell + SW generated) ·
`npx playwright test --list` → **7 E2E tests compile** (2 new category specs) ·
pgTAP → **56/56 assertions pass** (45 prior + 11 new `delete_category`), **0 failures**.

---

## 2. Files created

**Backend**
- `supabase/migrations/0015_rpc_delete_category.sql` — the `delete_category` RPC.
- `supabase/tests/07_delete_category.test.sql` — 11 pgTAP assertions (reassignment counts,
  tx + recommendation reassignment to Otros, `liquid_cash` unchanged, protected-delete
  rejection for otros/debt, unknown-id rejection, duplicate-name + rename-collision rejection).

**Frontend**
- `src/pages/Categories.tsx` — the `/categories` page.
- `src/components/categories/CategoryList.tsx` — category table with protected-row guards.
- `src/components/categories/CategoryForm.tsx` — create/rename dialog.

**Tests (Vitest / Playwright)**
- `src/api/errors.test.ts` — 4 tests for the PostgREST/RPC → `AppError` mapping.
- `src/components/categories/CategoryForm.test.tsx` — 3 tests (empty-name block, trim+create,
  name-collision field error).
- `src/components/categories/CategoryList.test.tsx` — 1 test (protected rows disabled).
- `tests/e2e/categories.spec.ts` — 2 Playwright specs (protected Otros not deletable;
  create → delete → liquid cash untouched), credential-gated like the Phase 2 E2E specs.

---

## 3. Files modified

- `src/api/categories.ts` — added `createCategory` / `renameCategory` / `deleteCategory`
  (RPC + Zod result validation); kept `fetchCategories`.
- `src/api/errors.ts` — two new RPC error codes + messages; `P0001` → typed-code resolution.
- `src/domain/schemas.ts` — added `categoryFormSchema` / `CategoryFormInput`.
- `src/hooks/useCategories.ts` — added create/rename/delete mutation hooks (invalidation matrix).
- `src/app/router.tsx` — added the lazy `/categories` route.
- `src/app/AppLayout.tsx` — added the "Categorías" nav entry.
- `src/types/database.types.ts` — **regenerated** (`supabase gen types`) to include the
  `delete_category` RPC signature. Not hand-edited.

---

## 4. Remaining tasks for Phase 3

- **Run the E2E category specs against the live stack** (`supabase start` + admin-provisioned
  user + `E2E_EMAIL` / `E2E_PASSWORD` + `.env` populated): `npm run test:e2e`. The 2 specs are
  `test.skip`-gated when credentials are absent, so they compile but do not run headlessly in
  this environment. This closes the interactive half of the CP-3 gate; the atomic-reassignment
  and protected-delete guarantees are already proven by pgTAP.
- **Commit** — intentionally **not** done, per the "never commit or add files to git" rule.
  All changes sit unstaged in the working tree.
- **CI coverage/gate wiring** remains a **CP-7** item (the Phase 1 workflow runs DB reset +
  pgTAP + typecheck only; `lint` / `vitest` / `build` / Playwright are added at hardening).

Nothing in the Phase 3 spec (§3.3 / §4.5 / §7.4 / §6.1) is left unimplemented.

---

## 5. Issues encountered / decisions worth surfacing

1. **RPC return shape → runtime validation.** `delete_category` uses OUT parameters
   (`returns record`) so PostgREST returns a single object rather than a `SETOF` array. The
   generated TS type for such a function is `Record<string, unknown>`, so the api layer narrows
   the result with a Zod schema before use (satisfies §10.3 "all API responses validated before
   use"). No ambiguity in the spec required a stop-and-ask.
2. **`delete_category` was deferred from Phase 1.** Migration `0015` lands here (as the Phase 2
   summary anticipated), keeping the forward-only migration chain intact; no earlier migration
   was edited.
3. **Local pgTAP runner note (environment-only, not a code issue).** `supabase test db` failed
   to launch its pg_prove helper container in this sandbox (`LegacyDockerRunError`). The suite
   was instead executed directly against the running Postgres container
   (`create extension pgtap; psql -f <each test>.sql`) — **56/56 assertions pass, 0 failures**.
   On a normal developer machine `npm run db:test` runs the same files unchanged.
4. **No new architectural conflicts.** The Phase 2 auth/httpOnly reconciliation (Phase 2
   summary §2) is unchanged and still a Phase 7 item; Phase 3 introduced nothing that touches it.
