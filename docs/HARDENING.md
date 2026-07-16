# Hardening Runbook (Phase 7 / CP-7)

Operational steps to take the app to a release candidate. Code and config for
these live in the repo; the items below require a one-time action in a hosting or
Supabase dashboard, or a CI secret, that cannot live in source.

---

## 1. HTTP security headers (CP-7.1)

Headers are defined in [`public/_headers`](../public/_headers), which Vite copies
to `dist/_headers`. This format is read by **Netlify** and **Cloudflare Pages**.

**Required action:** replace `YOUR_PROJECT_REF` in `public/_headers` with the
production Supabase project ref so the CSP `connect-src` allowlists exactly the
project origin (`https://<ref>.supabase.co`) and its realtime socket
(`wss://<ref>.supabase.co`).

**Vercel** does not read `_headers`. Port the same header set into a
`vercel.json` `"headers"` block (`source: "/(.*)"`) if deploying there.

Verify after deploy:

```bash
curl -sI https://<your-domain> | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy'
```

Expect HSTS ≥ 1 year, a CSP with no `unsafe-eval`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`. Static hosts (Netlify/CF/Vercel) do not emit
`X-Powered-By`, so there is nothing to strip.

---

## 2. CORS allowlist (CP-7.1)

CORS for the Supabase API is configured **in the Supabase dashboard**, not in
this repo (there is no `config.toml` field for the hosted allowlist).

**Required action:** in the Supabase project → **Authentication → URL
Configuration** (and API settings), set the allowed origin(s) to the exact
production app origin(s). Never use `*`. Keep dev/staging/prod origins distinct.

---

## 3. Reconciliation monitor (CP-7.2)

The invariant check is [`supabase/monitoring/reconciliation_check.sql`](../supabase/monitoring/reconciliation_check.sql);
it is run nightly by [`.github/workflows/reconcile.yml`](../.github/workflows/reconcile.yml)
and asserts `stored totals == recomputed sums` via the `reconciliation` view
(migration `0021`). Any drift fails the job — that failure is the alert.

**Required action:** add a repo secret **`SUPABASE_DB_URL`** — a direct Postgres
connection string to the **production** database (a read-capable role is enough;
it only `SELECT`s the view). Without it the job fails fast with a clear message.

Run on demand from the Actions tab (**workflow_dispatch**) to smoke-test the wiring.

---

## 4. Dependency & secret scanning (CP-7.1)

Both run in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

- **`dependency-audit`** — `npm audit --audit-level=high` blocks merges that
  introduce high/critical CVEs. [`.github/dependabot.yml`](../.github/dependabot.yml)
  opens weekly update PRs for npm and GitHub Actions.
- **`secret-scan`** — `gitleaks` scans the full history on every push/PR. For
  private-org repos gitleaks-action needs a `GITLEAKS_LICENSE` secret; personal
  and public repos run free. Pre-commit scanning (local) is recommended in
  addition.

Only the `anon` key ships in the client bundle; `service_role` must live solely
in server-side / CI secret storage (see `.env.example`).

---

## 5. Coverage gate (CP-7.2)

Enforced in `vite.config.ts` (`test.coverage.thresholds`) and run in CI via
`npm run test:coverage`.

- **Spec target:** 80% overall / 90% new / 95% financial-critical (spec §7).
- **Current:** ~47% overall. Prior phases exercised `api/`, `hooks/`, and most
  `pages/` through the credential-gated integration/E2E layer, which Vitest
  coverage does not count. The trigger/RPC financial core is separately proven by
  the pgTAP suite.
- **Now enforced as a regression floor** just below current (statements/lines 46,
  branches 58, functions 40) so CI stays green while preventing backslide.

**Follow-up to reach the spec target:** backfill unit tests for `api/*` (mock
supabase-js at the network boundary with MSW), `hooks/*` (React Query), and the
`pages/*` render paths, then raise the thresholds toward 80% in step with the
gains. This is the remaining work between "green floor" and the spec's 80% gate.

---

## 6. Accessibility audit (CP-7.2)

Automated WCAG 2.1 AA checks run in the unit suite via `vitest-axe`
([`src/test/a11y.test.tsx`](../src/test/a11y.test.tsx)) over representative
surfaces (data table, form dialog). `color-contrast` cannot run under jsdom (no
layout engine) and is verified against a real renderer in the Playwright/E2E
layer. Keyboard nav, focus management, and labelling come from the Radix/shadcn
primitives (architecture §3).
