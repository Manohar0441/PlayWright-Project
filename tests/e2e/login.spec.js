/* ============================================================================
   E2E TEST — login flow in a real browser (Playwright)
   ----------------------------------------------------------------------------
   The top of the pyramid: drive the actual UI the way a user would. We use
   role- and testid-based locators (the recommended, non-brittle style) and
   web-first assertions that auto-wait — never sleep().

       npm run test:e2e        (or: npx playwright test)
   ============================================================================ */

const { test, expect } = require('../fixtures');

const QA = { email: 'qa@streamz.test', password: 'Test@123' };

test('logs in with valid credentials and lands on browse', async ({ page }) => {
  await page.goto('/login.html');

  await page.getByTestId('email').fill(QA.email);
  await page.getByTestId('password').fill(QA.password);
  await page.getByTestId('submit').click();

  await expect(page).toHaveURL(/\/browse\.html$/);
  await expect(page.getByTestId('catalog-grid')).toBeVisible();
});

test('shows an error banner for a wrong password', async ({ page }) => {
  await page.goto('/login.html');

  await page.getByTestId('email').fill(QA.email);
  await page.getByTestId('password').fill('wrong-password');
  await page.getByTestId('submit').click();

  await expect(page.getByTestId('login-error')).toBeVisible();
  await expect(page).toHaveURL(/\/login\.html$/);
});

test('redirects to login when visiting a protected page logged out', async ({ page }) => {
  await page.goto('/browse.html');
  await expect(page).toHaveURL(/\/login\.html/);
});
