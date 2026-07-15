import { expect, test } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, login } from './helpers';

/**
 * CP-6 acceptance (§7.7, AC-Recommendation). Requires a running local Supabase
 * stack and an admin-provisioned user (E2E_EMAIL / E2E_PASSWORD). Skipped when
 * credentials are absent so CI without a stack does not fail spuriously.
 */
test.describe('Recommendations', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('banner shows a missing recommendation and clears after a matching transaction', async ({
    page,
  }) => {
    const stamp = Date.now();
    const categoryName = `Rec cat ${stamp}`;
    const recDescription = `Rec ${stamp}`;

    // A fresh category guarantees no transaction covers it this month, so the
    // recommendation is genuinely "missing" when created.
    await page.getByRole('link', { name: 'Categorías' }).click();
    await page.getByRole('button', { name: 'Nueva categoría' }).click();
    await page.getByLabel('Nombre').fill(categoryName);
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByText('Categoría creada')).toBeVisible();

    // Recommendation for that category; the window defaults to today (open-ended),
    // so it overlaps the current month.
    await page.getByRole('link', { name: 'Recomendados' }).click();
    await page.getByRole('button', { name: 'Nueva recomendación' }).click();
    await page.getByLabel('Categoría').click();
    await page.getByRole('option', { name: categoryName }).click();
    await page.getByLabel('Descripción').fill(recDescription);
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByText('Recomendación creada')).toBeVisible();

    // The dashboard banner surfaces the missing recommendation.
    await page.getByRole('link', { name: 'Resumen' }).click();
    await expect(page.getByText(recDescription)).toBeVisible();

    // Add a transaction in that category for the current month (from the month view,
    // which has no banner so the submit button is unambiguous).
    await page.getByRole('link', { name: 'Mes' }).click();
    await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
    await page.getByLabel('Monto').fill('100.00');
    await page.getByLabel('Categoría').click();
    await page.getByRole('option', { name: categoryName }).click();
    await page.getByLabel('Descripción').fill(`Cubre ${stamp}`);
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText('Movimiento agregado')).toBeVisible();

    // The recommendation is now covered (D3) and disappears from the banner.
    await page.getByRole('link', { name: 'Resumen' }).click();
    await expect(page.getByText(recDescription)).toBeHidden();
  });
});
