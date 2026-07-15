import { expect, type Page } from '@playwright/test';

/**
 * E2E credentials come from env (never hardcoded). The user must be provisioned
 * via the Supabase admin dashboard (D8) before running these tests.
 */
export const E2E_EMAIL = process.env.E2E_EMAIL ?? '';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? '';

/** Log in through the UI and land on the dashboard. */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(E2E_EMAIL);
  await page.getByLabel('Contraseña').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
}

/** Parse the liquid-cash card value (e.g. "$1,234.56") into integer centavos. */
export async function readLiquidCashCents(page: Page): Promise<number> {
  const text = (await page.getByTestId('liquid-cash').innerText()).trim();
  const numeric = text.replace(/[^0-9.-]/g, '');
  return Math.round(Number(numeric) * 100);
}
