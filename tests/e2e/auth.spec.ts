import { expect, test } from '@playwright/test';

/**
 * AC-Auth (§8): login-only surface — no signup/reset UI; protected routes
 * redirect when logged out. These checks need no seeded user.
 */
test('unauthenticated access to a protected route redirects to /login', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

test('login screen exposes no signup or password-reset links (D8)', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByText(/reg[íi]strate|crear cuenta/i)).toHaveCount(0);
  await expect(page.getByText(/olvidaste|restablecer/i)).toHaveCount(0);
});
