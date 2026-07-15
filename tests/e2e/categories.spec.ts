import { expect, test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, login, readLiquidCashCents } from './helpers';

/**
 * CP-3 acceptance (§7.4, AC-Category-delete). Requires a running local Supabase
 * stack and an admin-provisioned user (E2E_EMAIL / E2E_PASSWORD). Skipped when
 * credentials are absent so CI without a stack does not fail spuriously.
 */
test.describe('Category management', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Categorías' }).click();
    await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();
  });

  test('the protected Otros category cannot be deleted', async ({ page }) => {
    const otrosRow = page.getByRole('row', { name: /Otros/ });
    await expect(otrosRow.getByRole('button', { name: /Eliminar/ })).toBeDisabled();
  });

  test('creating a category makes it selectable in the entry form', async ({ page }) => {
    const name = `Prueba ${Date.now()}`;

    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    await page.getByLabel('Nombre').fill(name);
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByText('Categoría creada')).toBeVisible();
    await expect(page.getByRole('cell', { name })).toBeVisible();

    // Delete it again and confirm the reassignment toast; liquid cash is untouched.
    const before = await readLiquidCashCents(page);
    await page
      .getByRole('row', { name: new RegExp(name) })
      .getByRole('button', { name: /Eliminar/ })
      .click();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Categoría eliminada')).toBeVisible();

    await page.getByRole('link', { name: 'Resumen' }).click();
    await expect.poll(() => readLiquidCashCents(page)).toBe(before);
  });
});
