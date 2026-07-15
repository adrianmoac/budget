import { expect, test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, login, readLiquidCashCents } from './helpers';

/**
 * CP-5 acceptance (§7.6, AC-Investment). Requires a running local Supabase stack
 * and an admin-provisioned user (E2E_EMAIL / E2E_PASSWORD). Skipped when credentials
 * are absent so CI without a stack does not fail spuriously.
 */
test.describe('Investments', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Inversiones' }).click();
    await expect(page.getByRole('heading', { name: 'Inversiones' })).toBeVisible();
  });

  test('adding a contribution raises the vehicle total and leaves liquid cash unchanged', async ({
    page,
  }) => {
    const name = `Inv ${Date.now()}`;

    // Create a vehicle.
    await page.getByRole('button', { name: 'Nueva inversión' }).click();
    await page.getByLabel('Nombre').fill(name);
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByText('Inversión creada')).toBeVisible();

    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row.getByText('$0.00').first()).toBeVisible();

    // Read liquid cash before contributing.
    await page.getByRole('link', { name: 'Resumen' }).click();
    const before = await readLiquidCashCents(page);
    await page.getByRole('link', { name: 'Inversiones' }).click();

    // Contribute $1,000 to this vehicle (vehicle preselected from the row action).
    await row.getByRole('button', { name: `Registrar aportación a ${name}` }).click();
    await page.getByLabel('Monto').fill('1000');
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByText('Aportación registrada')).toBeVisible();

    // The vehicle's contributed total rises to $1,000.00.
    await expect(row.getByText('$1,000.00').first()).toBeVisible();

    // Liquid cash is unchanged (contributions never touch it, D2).
    await page.getByRole('link', { name: 'Resumen' }).click();
    await expect.poll(() => readLiquidCashCents(page)).toBe(before);
  });

  test('editing market value recomputes the interest percentage', async ({ page }) => {
    const name = `Inv ${Date.now()}`;

    await page.getByRole('button', { name: 'Nueva inversión' }).click();
    await page.getByLabel('Nombre').fill(name);
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByText('Inversión creada')).toBeVisible();

    const row = page.getByRole('row', { name: new RegExp(name) });

    // Contribute $1,000 so interest has a non-zero base.
    await row.getByRole('button', { name: `Registrar aportación a ${name}` }).click();
    await page.getByLabel('Monto').fill('1000');
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByText('Aportación registrada')).toBeVisible();

    // Set market value to $1,100 → +10.00% interest.
    await row.getByRole('button', { name: `Editar valor de mercado de ${name}` }).click();
    await row.getByLabel(`Valor de mercado de ${name}`).fill('1100');
    await row.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Valor de mercado actualizado')).toBeVisible();

    await expect(row.getByText(/\+10\.00%/)).toBeVisible();
  });
});
