/* ============================================================================
   UNIT TEST (in the browser) — formatTime() from public/assets/api.js
   ----------------------------------------------------------------------------
   A unit test of a real CLIENT-side pure function, executed inside the page with
   page.evaluate(). Because it runs in a browser, its screenshot/trace are fully
   meaningful — a nice contrast with the server-side unit tests next to it.
   ============================================================================ */

const { test, expect } = require('../fixtures');

test('formatTime renders seconds as m:ss', async ({ page }) => {
  // The autouse fixture already loaded the app, so the ES module is reachable.
  const out = await page.evaluate(async () => {
    const { formatTime } = await import('/assets/api.js');
    return [formatTime(0), formatTime(5), formatTime(65), formatTime(142)];
  });
  expect(out).toEqual(['0:00', '0:05', '1:05', '2:22']);
});
