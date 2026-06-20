/* ============================================================================
   tests/helpers/server.js — boot the real app for a test
   ----------------------------------------------------------------------------
   The API, Integration and Smoke suites all need a running server. Instead of
   hard-coding port 3000 (which clashes if the app is already running), we ask
   Node for a FREE port with `listen(0)`. Each suite gets its own clean server.
   ============================================================================ */

'use strict';

const { createServer } = require('../../server');

/* Starts the app on a random free port. Returns { baseURL, close }. */
async function startTestServer() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseURL: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/* Convenience: log in the seeded QA account and return its bearer token. */
async function loginAndGetToken(baseURL, email = 'qa@streamz.test', password = 'Test@123') {
  const res = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.token;
}

module.exports = { startTestServer, loginAndGetToken };
