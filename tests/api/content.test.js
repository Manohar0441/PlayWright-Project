/* ============================================================================
   API TESTS — Catalog, title detail, playback and progress
   ----------------------------------------------------------------------------
   Covers the public browse endpoint plus the protected per-title routes and
   their negative cases (401 / 404 / 451 / 400).

       npm run test:api        (or: node --test tests/api)
   ============================================================================ */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, loginAndGetToken } = require('../helpers/server');

let app;
let token;
before(async () => {
  app = await startTestServer();
  token = await loginAndGetToken(app.baseURL);
});
after(async () => { await app.close(); });

const auth = () => ({ Authorization: `Bearer ${token}` });

/* ---- public catalog ------------------------------------------------------- */
test('GET /api/content is public and returns titles', async () => {
  const res = await fetch(`${app.baseURL}/api/content`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.count > 0);
  assert.equal(body.items.length, body.count);
});

test('GET /api/content?search=pipeline filters the list', async () => {
  const res = await fetch(`${app.baseURL}/api/content?search=pipeline`);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.items[0].id, 'tt-101');
});

/* ---- title detail + access rules ------------------------------------------ */
test('GET /api/content/:id without a token -> 401', async () => {
  const res = await fetch(`${app.baseURL}/api/content/tt-100`);
  assert.equal(res.status, 401);
});

test('GET /api/content/tt-100 with a token -> 200 with full detail', async () => {
  const res = await fetch(`${app.baseURL}/api/content/tt-100`, { headers: auth() });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 'tt-100');
  assert.ok(body.synopsis, 'detail view includes synopsis');
  assert.ok(Array.isArray(body.qualities));
});

test('GET an unknown title -> 404', async () => {
  const res = await fetch(`${app.baseURL}/api/content/tt-zzz`, { headers: auth() });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});

test('GET an unavailable title (tt-900) -> 451', async () => {
  const res = await fetch(`${app.baseURL}/api/content/tt-900`, { headers: auth() });
  assert.equal(res.status, 451);
  assert.equal((await res.json()).error.code, 'UNAVAILABLE');
});

/* ---- playback ------------------------------------------------------------- */
test('POST /api/content/tt-100/playback -> 200 with a session', async () => {
  const res = await fetch(`${app.baseURL}/api/content/tt-100/playback`, {
    method: 'POST',
    headers: auth(),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.sessionId, /^sess_/);
  assert.equal(body.titleId, 'tt-100');
  assert.ok(body.durationSec > 0);
});

/* ---- progress validation -------------------------------------------------- */
test('POST progress with an out-of-range position -> 400', async () => {
  const res = await fetch(`${app.baseURL}/api/content/tt-100/progress`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionSec: 999999 }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'INVALID_POSITION');
});

test('POST then GET progress round-trips the saved position', async () => {
  const save = await fetch(`${app.baseURL}/api/content/tt-100/progress`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionSec: 30 }),
  });
  assert.equal(save.status, 200);

  const get = await fetch(`${app.baseURL}/api/content/tt-100/progress`, { headers: auth() });
  const body = await get.json();
  assert.equal(body.positionSec, 30);
});

/* ---- deliberate 5xx ------------------------------------------------------- */
test('GET /api/debug/error -> 500 (5xx handling)', async () => {
  const res = await fetch(`${app.baseURL}/api/debug/error`);
  assert.equal(res.status, 500);
});
