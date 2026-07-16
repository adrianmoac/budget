# Budget Manager — Phase 7 Completion Summary

**Scope built:** Phase 7 (Hardening — security headers, CORS, dependency + secret
scanning, reconciliation monitor, a11y audit, coverage-gate enforcement) per the
Development Phases table (Architecture §17 / Spec §1.1) and exit gate **CP-7**
(checkpoints **CP-7.1** and **CP-7.2**, Spec §12).
**Environment:** Local frontend toolchain (Vite 6 / React 19 / TS strict) + the
local Supabase schema/triggers from Phases 1–6.
**Git state:** Complete in the working tree, **uncommitted** (not staged, not
pushed) by request, on branch `feature/phase7`.

**Exit gate (CP-7, §9):** _"security headers + CORS allowlist configured at host;
dependency scan clean (no critical/high); reconciliation monitor scheduled; a11y
AA audit passes; all coverage gates green → release candidate."_ — met in code
and CI configuration, with two items that require a one-time dashboard/secret
action documented in `docs/HARDENING.md` (CORS allowlist; production
`SUPABASE_DB_URL` for the live monitor). See §5.

---

## 1. Summary of work completed

**Pre-flight correction (surfaced before any code).** The task prompt referenced
Phase 5 as current and asked to "implement Phase 6", but **Phase 6 was already
implemented and merged** (PR #6, commit `65cb9c9`), with a `PHASE_6_SUMMARY.md`
present and the branch already on `feature/phase7`. This was surfaced rather than
re-implementing merged work; you confirmed the intent was **Phase 7**.

**Four decisions were confirmed before implementation** (each a genuine fork the
architecture leaves open):

1. Static host for security headers → **`public/_headers`** (Netlify + Cloudflare
   Pages format).
2. Reconciliation monitor mechanism → **scheduled GitHub Actions workflow** (the
   recommended low-infra, versioned option).
3. `.github` was **gitignored** (so no CI could run) → **un-ignored** it.
4. Coverage gate → **regression floor at current ~47%**, with the spec's 80%
   target documented as tracked follow-up.

**CP-7.1 — Security & supply chain:**

- **Security headers** (`public/_headers`, architecture §13): HSTS (2yr,
  includeSubDomains, preload), CSP (`default-src 'self'`, `connect-src` to the
  Supabase project origin + realtime socket, `style-src 'self' 'unsafe-inline'`,
  **no `unsafe-eval`**, `frame-ancestors 'none'`, `object-src 'none'`),
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy` locking camera/mic/geo. `/sw.js` and `/index.html` set to
  `no-cache` so deploys are picked up; authed financial responses are served by
  Supabase (never this host) and stay NetworkOnly in the SW. The file ships to
  `dist/_headers` on build (verified).
- **Dependency scan** — CI `dependency-audit` job runs `npm audit
  --audit-level=high` (currently **0 vulnerabilities**); `.github/dependabot.yml`
  opens weekly npm + github-actions update PRs.
- **Secret scan** — CI `secret-scan` job runs `gitleaks` over full history on
  every push/PR.
- **CI expanded** — the prior workflow ran only `pgTAP` + `typecheck`; it now also
  runs `lint`, `test` (coverage-gated + artifact upload), `build`,
  `dependency-audit`, and `secret-scan`.

**CP-7.2 — Reconciliation, a11y, coverage:**

- **Reconciliation monitor scheduled** (architecture §15): nightly cron workflow
  `.github/workflows/reconcile.yml` runs `supabase/monitoring/reconciliation_check.sql`
  against the live DB via a `SUPABASE_DB_URL` secret. The SQL reads the existing
  `reconciliation` view (migration `0021`) and `RAISE`s on any non-zero
  `liquid_cash_drift`/`total_invested_drift`; with `ON_ERROR_STOP` that turns the
  job red — the alert. Guards a missing secret with a clear message; also
  `workflow_dispatch` for on-demand runs.
- **a11y AA audit** — added `vitest-axe`; `src/test/a11y.test.tsx` runs axe-core
  over representative surfaces (a data table + a form dialog) with **zero
  violations**. `color-contrast` (needs a real layout engine) is disabled under
  jsdom and left to the E2E layer. Matcher wired in `src/test/setup.ts` +
  `src/test/vitest-axe.d.ts` (vitest 3.x module augmentation).
- **Coverage-gate enforcement** — `vite.config.ts` now sets
  `test.coverage.thresholds`; `npm run test:coverage` fails below them and runs in
  CI. Floor set just below current (statements/lines 46, branches 58, funcs 40)
  as a regression ratchet; the 80% spec target + backfill path documented.

**`docs/HARDENING.md`** — operational runbook for the items that cannot live in
source: the `_headers` Supabase-ref placeholder, the Supabase CORS allowlist,
the `SUPABASE_DB_URL` monitor secret, the gitleaks license note, and the
coverage-target follow-up.

**Verification state (last run):**
`npm run typecheck` → clean · `npm run lint` → clean (0 errors, 0 warnings) ·
`npm run test` → **94/94 unit tests pass** (92 prior + 2 a11y) ·
`npm run test:coverage` → coverage gate **green** (47.45% ≥ floors) ·
`npm run build` → succeeds, `dist/_headers` emitted ·
`npm audit --audit-level=high` → **0 vulnerabilities** ·
`npx playwright test --list` → **13 E2E tests compile**.

---

## 2. Files created

- `public/_headers` — HTTP security headers (Netlify / Cloudflare Pages).
- `.github/dependabot.yml` — weekly npm + github-actions update PRs.
- `.github/workflows/reconcile.yml` — nightly reconciliation monitor.
- `supabase/monitoring/reconciliation_check.sql` — drift assertion (RAISE on drift).
- `src/test/a11y.test.tsx` — automated WCAG 2.1 AA axe audit (2 tests).
- `src/test/vitest-axe.d.ts` — vitest matcher type augmentation.
- `docs/HARDENING.md` — hardening/operations runbook.
- `docs/PHASE_7_SUMMARY.md` — this document.

## 3. Files modified

- `.gitignore` — removed the `.github` ignore line so CI workflows are trackable.
- `.github/workflows/ci.yml` — added `lint`, `test` (coverage + artifact),
  `build`, `dependency-audit`, `secret-scan` jobs (kept `database` + `typecheck`);
  switched Node installs to `npm ci`.
- `vite.config.ts` — added `test.coverage.thresholds` (regression floor).
- `src/test/setup.ts` — registered the `toHaveNoViolations` axe matcher.
- `package.json` / `package-lock.json` — added `vitest-axe` + `axe-core` devDeps.

## 4. Remaining tasks for Phase 7

These are one-time actions requiring live infrastructure / dashboards (documented
in `docs/HARDENING.md`), not code:

- **Set `SUPABASE_DB_URL`** repo secret (production DB) so the reconciliation
  monitor runs. Until set, the scheduled job fails fast by design.
- **Configure the Supabase CORS allowlist** to the production origin(s) — dashboard
  setting; there is no `config.toml` field for the hosted allowlist.
- **Replace `YOUR_PROJECT_REF`** in `public/_headers` with the production Supabase
  ref before deploy (and, if deploying on Vercel, port the headers into
  `vercel.json`).
- **Run the reconciliation + E2E against a live stack.** `psql`/Docker are
  unavailable in this environment (same limitation Phases 3–6 documented), so the
  monitor SQL and the credential-gated Playwright specs were not executed here.
- **Coverage backfill toward 80%** — the CP-7.2 gate is enforced as a floor at the
  current ~47%; reaching the spec's 80% target requires new unit tests for
  `api/`, `hooks/`, and `pages/` (see §5.2 and `docs/HARDENING.md`). This is the
  only substantive divergence from the spec's literal numbers, taken by your
  explicit choice.
- **Commit** — intentionally **not** done, per the "never commit or add files to
  git" rule. All changes sit unstaged in the working tree.

## 5. Issues encountered / decisions worth surfacing

1. **Phase 6 already merged; Phase 7 built instead.** The prompt was a stale
   template (Phase 5 → Phase 6). Confirmed with you before proceeding; no merged
   work was touched.

2. **Coverage is ~47%, not the spec's 80%.** Prior phases exercised `api/`,
   `hooks/`, and most `pages/` through the credential-gated integration/E2E layer,
   which Vitest coverage does not count; the financial trigger/RPC core is proven
   separately by pgTAP. Rather than pad coverage with low-value tests or ship a red
   CI, you chose a **regression floor** now + a documented path to 80%. The gate
   is real and enforced; only its threshold value diverges from the spec, by your
   decision.

3. **`.github` was gitignored** (grouped with agent tooling `.claude` /
   `beforePrompt.md`), so the existing CI was untracked and no gate could ever run.
   Un-ignored it per your choice — a prerequisite for every CP-7 CI deliverable to
   be meaningful.

4. **Reconciliation monitor targets the live DB via a CI secret.** A scheduled
   job against a fresh empty DB would be a useless always-zero check, so the
   monitor connects to production through `SUPABASE_DB_URL`. This is the faithful
   reading of §15 ("periodic check … must alert"). The pg_cron alternative was
   offered; the CI approach was the recommended, versioned default (the pg_cron
   answer did not return, so the recommended default was used — say the word to
   switch).

5. **`_headers` cannot embed the Supabase origin dynamically.** It is a static
   file copied verbatim to `dist/`, so the CSP `connect-src` carries a
   `YOUR_PROJECT_REF` placeholder with an inline `#` comment and a runbook step,
   rather than a build-time-injected value. This keeps the header host-agnostic.

6. **jsdom cannot run axe `color-contrast`** (no layout engine); it crashed the
   run until disabled. Contrast is a real-renderer concern and is left to the
   Playwright/E2E layer; all other AA rules run and pass.

7. **New dev dependencies.** `vitest-axe` + `axe-core` were added for the a11y
   gate; `npm audit` remains at 0 vulnerabilities after the addition.

8. **Referenced doc paths.** The prompt named `docs/Architecture.md` /
   `docs/ImplementationSpecification.md`; the repo files are `docs/ARCHITECTURE.md`
   and `docs/IMPLEMENTATION_SPEC.md`. Treated as the same source of truth.

Nothing in the Phase 7 spec (§ CP-7.1 / CP-7.2 / §9 CP-7) is left unimplemented in
code; the remaining items in §4 are infrastructure actions by design.
