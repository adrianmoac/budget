import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Requires a running local Supabase stack (`npm run db:start`) with
 * an admin-provisioned test user, plus the Vite dev server. Credentials come from
 * env (E2E_EMAIL / E2E_PASSWORD). Never commit real credentials.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
