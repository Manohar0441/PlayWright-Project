/* ============================================================================
   INTEGRATION TEST — the full "login -> browse -> play -> resume" journey
   ----------------------------------------------------------------------------
   Several endpoints working together as a real user flow would drive them, via
   the Playwright `request` fixture. Written to be independent of any progress
   another test may have left behind: it saves a fresh position, then proves a
   new playback session resumes from exactly that point.

       npm run test:integration   (or: npx playwright test --project=integration)
   ============================================================================ */

const { test, expect } = require('../fixtures');

test('a user can log in, open a title, start playback, and resume progress', async ({ request }) => {
  // 1) Log in -> get a token.
  const login = await request.post('/api/auth/login', {
    data: { email: 'qa@streamz.test', password: 'Test@123' },
  });
  expect(login.status()).toBe(200);
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };

  // 2) Browse the public catalog and pick the first title.
  const catalog = await (await request.get('/api/content')).json();
  expect(catalog.count).toBeGreaterThan(0);
  const titleId = catalog.items[0].id;

  // 3) Open the title's detail (protected route).
  const detail = await request.get(`/api/content/${titleId}`, { headers });
  expect(detail.status()).toBe(200);

  // 4) Start a playback session and learn the runtime.
  const session = await (await request.post(`/api/content/${titleId}/playback`, { headers })).json();
  const duration = session.durationSec;
  expect(duration).toBeGreaterThan(0);

  // 5) "Watch" partway through, then save that resume point.
  const watchedTo = Math.floor(duration / 2);
  const save = await request.post(`/api/content/${titleId}/progress`, {
    headers,
    data: { positionSec: watchedTo },
  });
  expect(save.status()).toBe(200);

  // 6) Come back later: a fresh playback session resumes from where we left off.
  const resume = await (await request.post(`/api/content/${titleId}/playback`, { headers })).json();
  expect(resume.startPositionSec).toBe(watchedTo);
});
