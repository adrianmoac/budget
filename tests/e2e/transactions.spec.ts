import { expect, test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, login, readLiquidCashCents } from './helpers';

/**
 * CP-2 acceptance (§7.3, AC-Transactions). Requires a running local Supabase
 * stack and an admin-provisioned user (E2E_EMAIL / E2E_PASSWORD). Skipped when
 * credentials are absent so CI without a stack does not fail spuriously.
 */
test.describe('Transactions CRUD reflects in liquid cash', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('adding an expense decreases the dashboard balance by the amount', async ({
    page,
  }) => {
    const before = await readLiquidCashCents(page);

    await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
    // type defaults to expense
    await page.getByLabel('Monto').fill('150.00');
    await page.getByLabel('Categoría').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Descripción').fill('Prueba E2E gasto');
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect(page.getByText('Movimiento agregado')).toBeVisible();
    await expect
      .poll(() => readLiquidCashCents(page))
      .toBe(before - 15_000);
  });

  test('adding an income increases the balance and appears in the income table', async ({
    page,
  }) => {
    const before = await readLiquidCashCents(page);

    await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
    await page.getByLabel('Tipo').click();
    await page.getByRole('option', { name: 'Ingreso' }).click();
    await page.getByLabel('Monto').fill('300.00');
    await page.getByLabel('Categoría').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Descripción').fill('Prueba E2E ingreso');
    await page.getByRole('button', { name: 'Agregar' }).click();

    await expect
      .poll(() => readLiquidCashCents(page))
      .toBe(before + 30_000);

    await page.getByRole('link', { name: 'Mes' }).click();
    const incomeTable = page.getByRole('table').first();
    await expect(incomeTable.getByText('Prueba E2E ingreso')).toBeVisible();
  });

  test('deleting a transaction reverses its effect on the balance', async ({ page }) => {
    // Create a known expense, then delete it and assert the balance returns.
    const start = await readLiquidCashCents(page);

    await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
    await page.getByLabel('Monto').fill('75.00');
    await page.getByLabel('Categoría').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Descripción').fill('Prueba E2E borrar');
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect.poll(() => readLiquidCashCents(page)).toBe(start - 7_500);

    await page.getByRole('link', { name: 'Mes' }).click();
    const row = page.getByRole('row', { name: /Prueba E2E borrar/ });
    await row.getByRole('button', { name: /Eliminar/ }).click();
    await page.getByRole('button', { name: 'Eliminar' }).click();

    await page.getByRole('link', { name: 'Resumen' }).click();
    await expect.poll(() => readLiquidCashCents(page)).toBe(start);
  });
});
