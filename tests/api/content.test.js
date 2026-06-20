/* ============================================================================
   API TESTS — Catalog, title detail, playback, progress
   ----------------------------------------------------------------------------
   Uses the Playwright `request` fixture. A `beforeEach` logs in once per test
   and stashes the bearer token for the protected routes.

       npm run test:api        (or: npx playwright test --project=api)
   ============================================================================ */

const { test, expect } = require('../fixtures');

let token;
test.beforeEach(async ({ request }) => {
  const res = await request.post('/api/auth/login', {
    data: { email: 'qa@streamz.test', password: 'Test@123' },
  });
  token = (await res.json()).token;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

test('GET /api/content is public and returns titles', async ({ request }) => {
  const res = await request.get('/api/content');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.count).toBeGreaterThan(0);
  expect(body.items).toHaveLength(body.count);
});

test('GET /api/content?search=pipeline filters the list', async ({ request }) => {
  const body = await (await request.get('/api/content?search=pipeline')).json();
  expect(body.count).toBe(1);
  expect(body.items[0].id).toBe('tt-101');
});

test('GET /api/content/:id without a token -> 401', async ({ request }) => {
  const res = await request.get('/api/content/tt-100');
  expect(res.status()).toBe(401);
});

test('GET /api/content/tt-100 with a token -> 200 with full detail', async ({ request }) => {
  const res = await request.get('/api/content/tt-100', { headers: auth() });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.id).toBe('tt-100');
  expect(body.synopsis).toBeTruthy();
});

test('GET an unknown title -> 404', async ({ request }) => {
  const res = await request.get('/api/content/tt-zzz', { headers: auth() });
  expect(res.status()).toBe(404);
  expect((await res.json()).error.code).toBe('NOT_FOUND');
});

test('GET an unavailable title (tt-900) -> 451', async ({ request }) => {
  const res = await request.get('/api/content/tt-900', { headers: auth() });
  expect(res.status()).toBe(451);
  expect((await res.json()).error.code).toBe('UNAVAILABLE');
});

test('POST /api/content/tt-100/playback -> 200 with a session', async ({ request }) => {
  const res = await request.post('/api/content/tt-100/playback', { headers: auth() });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.durationSec).toBeGreaterThan(0);
});

test('POST progress with an out-of-range position -> 400', async ({ request }) => {
  const res = await request.post('/api/content/tt-100/progress', {
    headers: auth(),
    data: { positionSec: 999999 },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).error.code).toBe('INVALID_POSITION');
});

test('POST then GET progress round-trips the saved position', async ({ request }) => {
  const save = await request.post('/api/content/tt-103/progress', {
    headers: auth(),
    data: { positionSec: 30 },
  });
  expect(save.status()).toBe(200);

  const body = await (await request.get('/api/content/tt-103/progress', { headers: auth() })).json();
  expect(body.positionSec).toBe(30);
});

test('GET /api/debug/error -> 500 (5xx handling)', async ({ request }) => {
  const res = await request.get('/api/debug/error');
  expect(res.status()).toBe(500);
});
