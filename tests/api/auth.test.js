/* ============================================================================
   API TESTS — Authentication  (Playwright `request` fixture)
   ----------------------------------------------------------------------------
   API-level tests now use Playwright's `request` fixture instead of raw fetch.
   The fixture honours `baseURL` from the config and records its calls into the
   trace, so you can inspect every request/response in the trace viewer.

       npm run test:api        (or: npx playwright test --project=api)
   ============================================================================ */

const { test, expect } = require('../fixtures');

const GOOD = { email: 'qa@streamz.test', password: 'Test@123' };

test('POST /api/auth/login with valid creds -> 200 + token + user', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: GOOD });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.token).toBeTruthy();
  expect(body.user.email).toBe(GOOD.email);
  expect(body.user.password).toBeUndefined();
});

test('POST /api/auth/login with missing fields -> 400 MISSING_FIELDS', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { email: GOOD.email } });
  expect(res.status()).toBe(400);
  expect((await res.json()).error.code).toBe('MISSING_FIELDS');
});

test('POST /api/auth/login with wrong password -> 401 INVALID_CREDENTIALS', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { email: GOOD.email, password: 'nope' } });
  expect(res.status()).toBe(401);
  expect((await res.json()).error.code).toBe('INVALID_CREDENTIALS');
});

test('GET /api/profile without a token -> 401', async ({ request }) => {
  const res = await request.get('/api/profile');
  expect(res.status()).toBe(401);
});

test('GET /api/profile with a made-up token -> 401', async ({ request }) => {
  const res = await request.get('/api/profile', { headers: { Authorization: 'Bearer not-a-real-token' } });
  expect(res.status()).toBe(401);
});

test('GET /api/profile with a valid token -> 200', async ({ request }) => {
  const login = await (await request.post('/api/auth/login', { data: GOOD })).json();
  const res = await request.get('/api/profile', { headers: { Authorization: `Bearer ${login.token}` } });
  expect(res.status()).toBe(200);
  expect((await res.json()).user.email).toBe(GOOD.email);
});

test('after logout the same token is rejected -> 401', async ({ request }) => {
  const login = await (await request.post('/api/auth/login', { data: GOOD })).json();
  const token = login.token;

  const logout = await request.post('/api/auth/logout', { headers: { Authorization: `Bearer ${token}` } });
  expect(logout.status()).toBe(200);

  const after = await request.get('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
  expect(after.status()).toBe(401);
});
