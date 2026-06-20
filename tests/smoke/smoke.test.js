/* ============================================================================
   SMOKE TESTS — "is the app even alive?"
   ----------------------------------------------------------------------------
   A tiny, fast set you run FIRST (and right after a deploy) to confirm the most
   critical paths work before spending time on the full suite. Mixes `request`
   (API) and `page` (UI) checks.

       npm run test:smoke      (or: npx playwright test --project=smoke)
   ============================================================================ */

const { test, expect } = require('../fixtures');

test('smoke: health endpoint is up', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect((await res.json()).status).toBe('ok');
});

test('smoke: the catalog loads', async ({ request }) => {
  const res = await request.get('/api/content');
  expect(res.status()).toBe(200);
  expect((await res.json()).count).toBeGreaterThan(0);
});

test('smoke: a user can log in', async ({ request }) => {
  const res = await request.post('/api/auth/login', {
    data: { email: 'qa@streamz.test', password: 'Test@123' },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).token).toBeTruthy();
});

test('smoke: the login page renders', async ({ page }) => {
  // The autouse fixture already navigated to '/', which redirects to the login page.
  await expect(page).toHaveURL(/login\.html/);
  await expect(page.getByTestId('login-form')).toBeVisible();
});
