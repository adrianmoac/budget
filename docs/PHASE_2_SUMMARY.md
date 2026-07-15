# Budget Manager — Phase 2 Completion Summary

**Scope built:** Phase 2 (Transactions CRUD + dashboard) **plus the Phase 0 frontend
foundation it depends on** (repo tooling, PWA shell, Supabase client, auth login,
protected routes) — Phase 1 was backend-only, so none of the frontend existed yet.
**Environment:** Local frontend toolchain (Vite 6 / React 19 / TS strict). Backend is the
Phase 1 local Supabase stack (unchanged).
**Git state:** Complete in the working tree, **uncommitted** (not staged, not pushed) by request.

**Scope decisions (agreed before build):**
- **Build the Phase 0 frontend foundation, then Phase 2** — Phase 2 (dashboard, EntryForm,
  MonthView) cannot stand or pass its CP-2 end-to-end gate without the CP-0.2 app shell
  (providers, Supabase client, login, protected routes, PWA). Confirmed with the product owner.
- **Auth session storage: standard supabase-js SPA session** (PKCE, autoRefresh). The
  architecture's "JWTs in httpOnly cookies, never localStorage" cannot coexist with its
  "static SPA, no server" decision; **true httpOnly deferred to Phase 7 hardening** (needs
  `@supabase/ssr` + host edge middleware). See §5.2.
- **Debt-category entries excluded from Phase 2** — they must route through
  `record_debt_payment` (Phase 4); the `debt`-kind category is not selectable in EntryForm yet.
- **Dashboard pending-debts widget (FR-19) and recommendation banner deferred** to their
  phases (P4 / P6). Phase 2 dashboard = liquid cash + investment summary + quick-add.

---

## 1. Summary of work completed

- **Phase 0 frontend foundation stood up** (CP-0.1 + CP-0.2 frontend half):
  - Toolchain: **Vite 6 + TypeScript strict** (`noUncheckedIndexedAccess`,
    `exactOptionalPropertyTypes`), **Tailwind + shadcn/ui (Radix)** primitives, **React
    Query**, **React Hook Form + Zod**, **Zustand**, **React Router v7**, **vite-plugin-pwa**,
    **Vitest + RTL**, **Playwright**, **ESLint** (type-checked, `import/order`,
    `no-floating-promises`, `@tanstack/query`, and a `no-restricted-imports` ban on
    `@supabase/supabase-js` outside `src/api/`) + **Prettier**.
  - **PWA**: `manifest.webmanifest`, 192/512/maskable icons, service worker precaching the
    app shell with **NetworkOnly for the Supabase origin** (online-only, architecture §13).
  - **App shell**: provider stack (QueryClient → Auth → Router), single fail-fast supabase-js
    client, auth context + `api/auth` wrapper, **protected-route wrapper**, `AppLayout`
    (nav, offline banner, toaster), **route-level code-splitting + Suspense + error boundary**,
    and the **Login** page (login-only; no signup/reset per D8).
- **Phase 2 delivered** (CP-2.1 → CP-2.4):
  - **Domain (CP-2.1)**: `money.ts` (branded `Centavos`; `toCentavos`/`fromCentavos`/
    `formatMXN`/`signedEffect`; rejects NaN/∞/negative/over-INTEGER-range), `schemas.ts`
    (Zod boundary), MX-timezone `date.ts`, generated-type re-exports, and the **exact
    query-key registry** (§6.1).
  - **api/ + hooks**: thin typed wrappers (`totals`, `transactions`, `investments`,
    `contributions`, `categories`) + `errors.ts` PostgREST→typed `AppError` mapper (§3.7);
    React Query hooks implementing the **invalidate-and-refetch** mutation matrix — **no
    optimistic totals**.
  - **Dashboard (CP-2.2)**: `LiquidCashCard` (reads saved totals row), `InvestedSummaryCard`
    (per-vehicle contributed + market value + `totalInterestMoney` amount/% with the
    **zero-invested divide-by-zero guard** + inline market-value edit), `QuickAddButton`.
  - **EntryForm + MonthView (CP-2.3/2.4)**: shared create/edit modal (pesos→centavos on
    submit; debt category excluded), separate income/expense tables, `PeriodTotalsBar`
    (income / expense / balance / invested-this-month), recurrence badge + filter,
    inline edit + delete-with-confirm.

**Verification state (last run):** `tsc --noEmit` → clean; `eslint .` → clean;
`vitest run` → **49/49 unit tests pass**; `vite build` → succeeds (route code-split,
SW + manifest generated); `playwright test --list` → 5 E2E tests compile. Financial-critical
domain modules (`money`, `investments`, `schemas`, `date`) at ~100% line coverage.

---

## 2. Files created

**Root config**
- `index.html`, `vite.config.ts` (+ PWA), `tailwind.config.ts`, `postcss.config.js`,
  `eslint.config.js`, `.prettierrc.json`, `playwright.config.ts`

**PWA assets**
- `public/icons/{icon-192,icon-512,icon-512-maskable}.png`

**Source — `src/` (62 `.ts`/`.tsx`)**
- `api/` — `supabaseClient.ts`, `auth.ts`, `errors.ts`, `totals.ts`, `transactions.ts`,
  `investments.ts`, `contributions.ts`, `categories.ts`
- `app/` — `AppProviders.tsx`, `auth.tsx`, `queryClient.ts`, `router.tsx`, `AppLayout.tsx`,
  `ProtectedRoute.tsx`, `RouteError.tsx`
- `components/` — `EntryForm.tsx`, `MoneyInput.tsx`, `MonthPicker.tsx`, `QuickAddButton.tsx`,
  `RecurrenceBadge.tsx`, `ConfirmDialog.tsx`, `OfflineBanner.tsx`, `states.tsx`;
  `dashboard/{LiquidCashCard,InvestedSummaryCard}.tsx`;
  `month/{PeriodTotalsBar,RecurrenceFilter,TransactionTable}.tsx`;
  `ui/{button,input,label,card,skeleton,dialog,select,toaster}.tsx`
- `domain/` — `money.ts`, `schemas.ts`, `date.ts`, `types.ts`, `investments.ts`, `queryKeys.ts`
- `hooks/` — `useTotals.ts`, `useCategories.ts`, `useInvestments.ts`,
  `useInvestedThisMonth.ts`, `useTransactions.ts`
- `pages/` — `Dashboard.tsx`, `MonthView.tsx`, `Login.tsx`
- `store/` — `ui.ts`, `toast.ts`
- `lib/utils.ts`, `index.css`, `main.tsx`, `vite-env.d.ts`, `test/setup.ts`

**Tests**
- Unit (Vitest): `domain/{money,date,investments,schemas}.test.ts`,
  `components/EntryForm.test.tsx`, `components/dashboard/InvestedSummaryCard.test.tsx`
- E2E (Playwright): `tests/e2e/{helpers.ts, transactions.spec.ts, auth.spec.ts}`

---

## 3. Files modified

- `package.json` — added frontend dependencies + scripts (`dev`, `build`, `lint`, `format`,
  `test`→Vitest, `test:watch`, `test:coverage`, `test:e2e`, `test:db`); all Phase 1
  `db:*` / `gen:types` scripts preserved.
- `package-lock.json` — dependency lock (version pin per security-standards).
- `tsconfig.json` — added `jsx: react-jsx`, path alias `@/*`, `types`, DOM libs; kept all
  existing strict flags.

*(No Phase 1 migrations, pgTAP tests, or `src/types/database.types.ts` were touched.)*

---

## 4. Remaining tasks for Phase 2

- **Populate `.env`** with the local `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` printed by
  `supabase start`. They are currently the template's empty values, so the app throws
  "Missing Supabase config" on boot until set; once set, `npm run dev` renders the login screen.
- **Run the E2E suite against the live stack** (`supabase start` + an admin-provisioned user +
  `E2E_EMAIL` / `E2E_PASSWORD`): `npm run test:e2e`. The 3 transaction specs are `test.skip`-gated
  when creds are absent; the 2 auth specs run without a user. This closes the CP-2 end-to-end gate.
- **Overall 80% coverage gate** is a **CP-7** CI item — financial-critical paths are unit-tested;
  the dashboard/CRUD line coverage is delivered by the E2E flows (per the spec test pyramid),
  not by unit tests alone.
- **Commit** — intentionally not done. All changes sit unstaged in the working tree.
- **Confirm CI green in-pipeline** — the Phase 1 workflow only resets the DB + pgTAP + typechecks;
  it does not yet run `lint` / `vitest` / `vite build` / Playwright (a CP-7 CI expansion item).

---

## 5. Issues encountered / decisions worth surfacing

1. **Phase 0 frontend was absent** (Phase 1 built backend/tooling only). Phase 2 has a hard
   dependency on it, so the CP-0.2 app shell was built first. This is the one deliberate scope
   expansion beyond "only Phase 2," approved before coding.
2. **Architecture-internal auth conflict.** "Static SPA, no server" (§4/§12) is incompatible
   with "JWTs in httpOnly cookies, never localStorage" (§10/§13 + `security-standards`) —
   httpOnly requires a server to set the cookie. Phase 0 uses standard supabase-js SPA session
   persistence; **real httpOnly cookies are a Phase 7 hardening item** (`@supabase/ssr` + host
   edge middleware). **Recommend an architecture amendment** to reconcile the two docs.
3. **Debt category intentionally not selectable in EntryForm** — debt entries route through
   `record_debt_payment` (Phase 4). The `debt`-kind category is filtered out of the dropdown;
   wiring the DebtSelect branch + duplicate-payment warning is Phase 4 work.
4. **Toolchain reconciliations:** upgraded **Vitest 2 → 3** to match Vite 6 (Vitest 2 pulled a
   conflicting nested Vite 5 that broke `exactOptionalPropertyTypes` typing); added
   `@types/node`. **React Router v7's `navigate()` now returns a Promise** (handled for
   `no-floating-promises`).
5. **Vendor bundle ~572 KB** (React + Supabase + React Query) trips Vite's 500 KB warning.
   Route-level code-splitting is in place; further vendor chunking is optional polish, not a
   Phase 2 requirement.
6. **`.gitignore` ignores `.github/`**, so the Phase 1 CI workflow is untracked. Flagged as
   possibly unintended; **not changed** (out of Phase 2 scope).

---

## Context for the next phase (Phase 3 — Categories)

Phase 3 builds on what now exists:
- **Reusable pieces ready to extend:** `api/categories.ts` (currently read-only `fetchCategories`),
  `hooks/useCategories.ts`, `ConfirmDialog`, the `AppError` code mapper, the query-key registry
  (`qk.categories()`), and the EntryForm category dropdown.
- **Phase 3 adds:** the **`delete_category` RPC** (migration `0015`, deferred from Phase 1 per the
  "architecture-wins" decision — see Phase 1 summary), category create/rename table ops
  (handle the `23505` name-collision → `name_conflict` mapping already wired), a `/categories`
  page + nav entry, and the "reassign to Otros / protect Otros+debt" flow. pgTAP for the RPC
  (atomic reassignment, protected-delete rejection, name uniqueness) is required for CP-3.
- **Deferred RPC migrations still outstanding:** `0015` delete_category (P3), `0016`
  record_debt_payment (P4), `0017` missing_recommendations (P6), `0018` create_debt / `0019`
  year_summary (optional).

---

## How to verify manually

- **Typecheck / lint / unit tests:** `npm run typecheck` · `npm run lint` · `npm run test`
  (49 unit assertions) · `npm run test:coverage`.
- **Build (PWA):** `npm run build` → emits `dist/` with `sw.js` + `manifest.webmanifest`.
- **Run the app:** `npm run db:start` → paste the printed URL + anon key into `.env` →
  `npm run dev` → open the login screen; sign in as the admin-provisioned user.
- **Backend (unchanged from Phase 1):** `npm run db:test` (45 pgTAP assertions),
  Studio at http://127.0.0.1:54323, reset via `npm run db:reset`.
- **E2E (needs live stack + seeded user):** set `E2E_EMAIL` / `E2E_PASSWORD`, then
  `npm run test:e2e`.
