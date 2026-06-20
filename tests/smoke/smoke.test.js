/* ============================================================================
   SMOKE TESTS — "is the app even alive?"
   ----------------------------------------------------------------------------
   A tiny, fast set of checks you run FIRST (and right after a deploy) to confirm
   the most critical paths work before spending time on the full suite. If smoke
   fails, nothing else is worth running.

       npm run test:smoke      (or: node --test tests/smoke)
   ============================================================================ */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers/server');

let app;
before(async () => { app = await startTestServer(); });
after(async () => { await app.close(); });

test('smoke: health endpoint is up', async () => {
  const res = await fetch(`${app.baseURL}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('smoke: the catalog loads', async () => {
  const res = await fetch(`${app.baseURL}/api/content`);
  assert.equal(res.status, 200);
  assert.ok((await res.json()).count > 0);
});

test('smoke: a user can log in', async () => {
  const res = await fetch(`${app.baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qa@streamz.test', password: 'Test@123' }),
  });
  assert.equal(res.status, 200);
  assert.ok((await res.json()).token);
});

test('smoke: the login page is served', async () => {
  const res = await fetch(`${app.baseURL}/login.html`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Sign in/);
});
