/* ============================================================================
   API TESTS — Authentication endpoints
   ----------------------------------------------------------------------------
   One level up from unit tests: we boot the real HTTP server and talk to it
   with `fetch`, asserting on STATUS CODES and the JSON body — exactly what an
   API-level test should own. No browser involved.

       npm run test:api        (or: node --test tests/api)
   ============================================================================ */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers/server');

let app;
before(async () => { app = await startTestServer(); });
after(async () => { await app.close(); });

const GOOD = { email: 'qa@streamz.test', password: 'Test@123' };

function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${app.baseURL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

/* ---- login ---------------------------------------------------------------- */
test('POST /api/auth/login with valid creds -> 200 + token + user', async () => {
  const res = await post('/api/auth/login', GOOD);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token, 'expected a token');
  assert.equal(body.user.email, GOOD.email);
  assert.equal(body.user.password, undefined, 'password must never be returned');
});

test('POST /api/auth/login with missing fields -> 400 MISSING_FIELDS', async () => {
  const res = await post('/api/auth/login', { email: 'qa@streamz.test' });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'MISSING_FIELDS');
});

test('POST /api/auth/login with wrong password -> 401 INVALID_CREDENTIALS', async () => {
  const res = await post('/api/auth/login', { email: GOOD.email, password: 'nope' });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, 'INVALID_CREDENTIALS');
});

/* ---- profile / auth guard ------------------------------------------------- */
test('GET /api/profile without a token -> 401', async () => {
  const res = await fetch(`${app.baseURL}/api/profile`);
  assert.equal(res.status, 401);
});

test('GET /api/profile with a made-up token -> 401', async () => {
  const res = await fetch(`${app.baseURL}/api/profile`, {
    headers: { Authorization: 'Bearer not-a-real-token' },
  });
  assert.equal(res.status, 401);
});

test('GET /api/profile with a valid token -> 200', async () => {
  const login = await (await post('/api/auth/login', GOOD)).json();
  const res = await fetch(`${app.baseURL}/api/profile`, {
    headers: { Authorization: `Bearer ${login.token}` },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.user.email, GOOD.email);
});

/* ---- logout invalidates the token ----------------------------------------- */
test('after logout the same token is rejected -> 401', async () => {
  const login = await (await post('/api/auth/login', GOOD)).json();
  const token = login.token;

  const logout = await post('/api/auth/logout', {}, token);
  assert.equal(logout.status, 200);

  const after = await fetch(`${app.baseURL}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(after.status, 401, 'a logged-out token must no longer work');
});
