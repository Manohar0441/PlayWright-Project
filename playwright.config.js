// @ts-check
/* ============================================================================
   playwright.config.js — ONE runner for every test level
   ----------------------------------------------------------------------------
   All five levels (unit, api, integration, smoke, e2e) now run on the Playwright
   Test runner, each as its own "project" so you can run them individually:

       npx playwright test --project=unit
       npx playwright test                 # all of them

   Artifacts (as requested):
     - screenshot : 'on'                -> a screenshot for EVERY test
     - video      : 'retain-on-failure' -> a video kept only when a test FAILS
     - trace      : 'on'                -> a trace (tracer logs) for EVERY test

   The custom reporter in tests/artifact-reporter.js prints, after each test,
   exactly where its screenshot / video / trace were written.
   ============================================================================ */

const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

// Start the app ourselves locally; in CI we point BASE_URL at a running container.
const startAppLocally = !process.env.BASE_URL;

module.exports = defineConfig({
  testDir: './tests',

  // Shared in-memory app state means tests must not race each other.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['./tests/artifact-reporter.js'],   // prints each test's artifacts to the console
  ],

  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    screenshot: 'on',            // every test
    video: 'retain-on-failure',  // failures only
    trace: 'on',                 // every test
    // Optional slow-motion so you can WATCH each action when running --headed.
    // e.g.  SLOWMO=800 npm run test:e2e:headed
    launchOptions: { slowMo: Number(process.env.SLOWMO) || 0 },
  },

  // One project per test level. They all inherit the artifact settings above.
  projects: [
    { name: 'unit',        testDir: './tests/unit' },
    { name: 'api',         testDir: './tests/api' },
    { name: 'integration', testDir: './tests/integration' },
    { name: 'smoke',       testDir: './tests/smoke' },
    { name: 'e2e',         testDir: './tests/e2e' },
  ],

  webServer: startAppLocally
    ? {
        command: 'node server.js',
        url: baseURL,
        timeout: 30_000,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
