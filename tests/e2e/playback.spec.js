/* ============================================================================
   E2E TEST — the media player (Playwright)
   ----------------------------------------------------------------------------
   Drives play/pause through the real controls and asserts on the player's
   `data-state` (the single source of truth documented in the README). The
   resume test also uses the `window.__player` test hook for a raw read of the
   simulated timeline.
   ============================================================================ */

const { test, expect } = require('@playwright/test');

/* Log in through the UI so the session token exists in localStorage. */
async function login(page) {
  await page.goto('/login.html');
  await page.getByTestId('email').fill('qa@streamz.test');
  await page.getByTestId('password').fill('Test@123');
  await page.getByTestId('submit').click();
  await expect(page).toHaveURL(/\/browse\.html$/);
}

test('play then pause toggles the player state', async ({ page }) => {
  await login(page);
  await page.goto('/player.html?id=tt-100');

  // Wait until the player has loaded its title (state is no longer "loading").
  await expect(page.getByTestId('player')).not.toHaveAttribute('data-state', 'loading');

  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('player')).toHaveAttribute('data-state', 'playing');

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByTestId('player')).toHaveAttribute('data-state', 'paused');
});

test('an unavailable title (tt-900) shows the error overlay', async ({ page }) => {
  await login(page);
  await page.goto('/player.html?id=tt-900');

  await expect(page.getByTestId('player')).toHaveAttribute('data-state', 'error');
  await expect(page.getByTestId('error-overlay')).toBeVisible();
});

test('resumes roughly where you left off after a reload', async ({ page }) => {
  await login(page);
  await page.goto('/player.html?id=tt-101');
  await expect(page.getByTestId('player')).not.toHaveAttribute('data-state', 'loading');

  // Start playing and let the simulated clock advance a few seconds.
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByTestId('player')).toHaveAttribute('data-state', 'playing');
  await page.waitForFunction(() => window.__player.currentTime > 4);
  const before = await page.evaluate(() => window.__player.currentTime);

  // Reload — progress is saved on pagehide, then restored on the next load.
  await page.reload();
  await page.waitForFunction(
    () => window.__player && window.__player.getState().titleId === 'tt-101'
  );
  const after = await page.evaluate(() => window.__player.currentTime);

  expect(after).toBeGreaterThan(0);
  expect(Math.abs(after - before)).toBeLessThan(8); // resumed near where we left off
});
