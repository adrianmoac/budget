import { expect, test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, login, readLiquidCashCents } from './helpers';

/**
 * CP-4 acceptance (§7.5, AC-Debt-payment). Requires a running local Supabase stack
 * and an admin-provisioned user (E2E_EMAIL / E2E_PASSWORD). Skipped when credentials
 * are absent so CI without a stack does not fail spuriously.
 */
test.describe('Debt management', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Deudas' }).click();
    await expect(page.getByRole('heading', { name: 'Deudas' })).toBeVisible();
  });

  test('records a covering payment: cash drops and remaining months decrease', async ({
    page,
  }) => {
    const name = `Deuda ${Date.now()}`;

    // Create a debt with a $500 minimum over 6 months.
    await page.getByRole('button', { name: 'Nueva deuda' }).click();
    await page.getByLabel('Nombre').fill(name);
    await page.getByLabel('Meses totales').fill('6');
    await page.getByLabel('Pago mínimo').fill('500');
    await page.getByLabel('Día de vencimiento').fill('15');
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByText('Deuda creada')).toBeVisible();

    const row = page.getByRole('row', { name: new RegExp(name) });
    // Progress shows months paid: a fresh 6-month debt is 0 / 6.
    await expect(row.getByText('0 / 6 meses')).toBeVisible();

    // Read liquid cash before paying.
    await page.getByRole('link', { name: 'Resumen' }).click();
    const before = await readLiquidCashCents(page);
    await page.getByRole('link', { name: 'Deudas' }).click();

    // Record the minimum payment (prefilled) → one month decrements.
    await row.getByRole('button', { name: new RegExp(`Registrar pago de ${name}`) }).click();
    await expect(page.getByLabel('Monto')).toHaveValue('500');
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByText('Pago registrado')).toBeVisible();

    await expect(row.getByText('1 / 6 meses')).toBeVisible();

    // Liquid cash dropped by exactly $500 (50000 centavos).
    await page.getByRole('link', { name: 'Resumen' }).click();
    await expect.poll(() => readLiquidCashCents(page)).toBe(before - 50000);
  });

  test('a second covering payment this month warns but is still allowed (D6)', async ({
    page,
  }) => {
    const name = `Deuda ${Date.now()}`;

    await page.getByRole('button', { name: 'Nueva deuda' }).click();
    await page.getByLabel('Nombre').fill(name);
    await page.getByLabel('Meses totales').fill('6');
    await page.getByLabel('Pago mínimo').fill('300');
    await page.getByLabel('Día de vencimiento').fill('10');
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByText('Deuda creada')).toBeVisible();

    const row = page.getByRole('row', { name: new RegExp(name) });

    // First covering payment.
    await row.getByRole('button', { name: new RegExp(`Registrar pago de ${name}`) }).click();
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByText('Pago registrado')).toBeVisible();

    // Second payment this month surfaces the duplicate warning.
    await row.getByRole('button', { name: new RegExp(`Registrar pago de ${name}`) }).click();
    await expect(
      page.getByText(/Ya existe un pago que cubre el mínimo este mes/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Registrar' }).click();
    await expect(page.getByText('Pago registrado')).toBeVisible();
  });
});
