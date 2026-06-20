// @ts-check
/* ============================================================================
   playwright.config.js — E2E configuration
   ----------------------------------------------------------------------------
   - baseURL defaults to the local app, but can be overridden with BASE_URL
     (the Jenkins pipeline points E2E at the app running in a container).
   - When no BASE_URL is given, Playwright starts the app itself via `webServer`
     so `npx playwright test` "just works" with nothing else running.
   ============================================================================ */

const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

// Only auto-start the app locally. In CI we point at an already-running server.
const startAppLocally = !process.env.BASE_URL;

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
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
