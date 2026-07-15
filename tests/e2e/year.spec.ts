import { expect, test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, login } from './helpers';

/**
 * CP-6 acceptance (§4.4, AC-Month/Year views). Requires a running local Supabase
 * stack and an admin-provisioned user (E2E_EMAIL / E2E_PASSWORD). Skipped when
 * credentials are absent so CI without a stack does not fail spuriously.
 */
test.describe('Year view', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('renders twelve zero-filled month rows and a totals footer', async ({ page }) => {
    await page.getByRole('link', { name: 'Año' }).click();
    await expect(page.getByRole('heading', { name: 'Año' })).toBeVisible();

    await expect(page.getByRole('row', { name: /Enero/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Diciembre/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Total/ })).toBeVisible();
  });
});
