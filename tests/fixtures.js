/* ============================================================================
   tests/fixtures.js — shared test setup used by EVERY level
   ----------------------------------------------------------------------------
   Two jobs:

   1) Give every test a real browser context. Even API/unit tests (which assert
      via the `request` fixture or by calling functions directly) get a `page`
      that lands on the app. That guarantees a meaningful screenshot, a video,
      and a trace for every single test — not just the UI ones.

   2) Attach a screenshot after each test, so you "receive screenshots all the
      time" in the HTML report regardless of pass/fail.

   Import `test` and `expect` from here instead of from '@playwright/test'.
   ============================================================================ */

const base = require('@playwright/test');

const test = base.test.extend({
  // Auto-used (no test has to ask for it): navigate to the app before the test
  // body runs, so there is always a rendered screen behind the screenshot/trace.
  _landing: [
    async ({ page }, use) => {
      await page.goto('/');     // '/' redirects to /login.html — a real screen
      await use(undefined);
    },
    { auto: true },
  ],
});

// A screenshot on EVERY test (the config also does this; here we attach a named,
// full-page one too so it is obvious in the report).
test.afterEach(async ({ page }, testInfo) => {
  try {
    const png = await page.screenshot({ fullPage: true });
    await testInfo.attach('screenshot-final', { body: png, contentType: 'image/png' });
  } catch {
    /* page may already be closed; the config-level screenshot still applies */
  }
});

module.exports = { test, expect: base.expect };
