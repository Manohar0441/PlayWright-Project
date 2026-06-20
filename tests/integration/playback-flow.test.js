/* ============================================================================
   INTEGRATION TEST — the full "login -> browse -> play -> resume" journey
   ----------------------------------------------------------------------------
   Where unit/API tests check one thing in isolation, an integration test checks
   that several endpoints work together as a real user flow would drive them.
   This is the exact journey the JD calls out: log in, fetch content, start
   playback, save a resume point, and read it back.

       npm run test:integration   (or: node --test tests/integration)
   ============================================================================ */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers/server');

let app;
before(async () => { app = await startTestServer(); });
after(async () => { await app.close(); });

test('a user can log in, open a title, start playback, and resume progress', async () => {
  const base = app.baseURL;

  // 1) Log in -> get a token.
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qa@streamz.test', password: 'Test@123' }),
  });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2) Browse the public catalog and pick the first title.
  const catalog = await (await fetch(`${base}/api/content`)).json();
  assert.ok(catalog.count > 0);
  const titleId = catalog.items[0].id;

  // 3) Open the title's detail (protected) — starts at position 0.
  const detail = await fetch(`${base}/api/content/${titleId}`, { headers: authHeaders });
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).progressSec, 0);

  // 4) Start a playback session.
  const playback = await fetch(`${base}/api/content/${titleId}/playback`, {
    method: 'POST',
    headers: authHeaders,
  });
  assert.equal(playback.status, 200);
  const session = await playback.json();
  assert.equal(session.startPositionSec, 0);
  const duration = session.durationSec;

  // 5) "Watch" partway through, then save a resume point.
  const watchedTo = Math.floor(duration / 2);
  const save = await fetch(`${base}/api/content/${titleId}/progress`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionSec: watchedTo }),
  });
  assert.equal(save.status, 200);

  // 6) Come back later: a fresh playback session resumes from where we left off.
  const resume = await (await fetch(`${base}/api/content/${titleId}/playback`, {
    method: 'POST',
    headers: authHeaders,
  })).json();
  assert.equal(resume.startPositionSec, watchedTo, 'playback should resume at the saved point');
});
