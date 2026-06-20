/* ============================================================================
   UNIT TESTS — lib/streamz-core.js
   ----------------------------------------------------------------------------
   The fastest level of the pyramid: call a pure function, assert its return.
   No server, no network, no browser. Run with Node's built-in test runner:

       npm run test:unit       (or: node --test tests/unit)
   ============================================================================ */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  publicUser,
  catalogCard,
  filterTitles,
  resolveTitleAccess,
  validatePosition,
  parseBearer,
} = require('../../lib/streamz-core');

/* A couple of tiny fixtures so each test reads clearly. */
const SAMPLE_USER = { id: 'u_qa', email: 'qa@streamz.test', password: 'Test@123', name: 'Quinn Tester' };
const TITLES = [
  { id: 'tt-1', title: 'The Last Render', genres: ['Sci-Fi', 'Thriller'], durationSec: 142, available: true },
  { id: 'tt-2', title: 'Pipeline of Dreams', genres: ['Drama'], durationSec: 118, available: true },
  { id: 'tt-9', title: 'Rights Expired', genres: ['Mystery'], durationSec: 110, available: false },
];

/* ---- publicUser ----------------------------------------------------------- */
test('publicUser strips the password', () => {
  const u = publicUser(SAMPLE_USER);
  assert.deepEqual(u, { id: 'u_qa', email: 'qa@streamz.test', name: 'Quinn Tester' });
  assert.equal(u.password, undefined);
});

/* ---- catalogCard ---------------------------------------------------------- */
test('catalogCard keeps card fields and drops synopsis', () => {
  const card = catalogCard({ ...TITLES[0], synopsis: 'secret', captions: true, poster: { bg: '#000' } });
  assert.equal(card.id, 'tt-1');
  assert.equal(card.synopsis, undefined);
  assert.equal(card.captions, true);
});

/* ---- filterTitles --------------------------------------------------------- */
test('filterTitles returns everything when no filters are given', () => {
  assert.equal(filterTitles(TITLES).length, 3);
});

test('filterTitles matches title text case-insensitively', () => {
  const out = filterTitles(TITLES, { search: 'pipeline' });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'tt-2');
});

test('filterTitles matches by genre', () => {
  const out = filterTitles(TITLES, { genre: 'sci-fi' });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'tt-1');
});

test('filterTitles does not mutate the input array', () => {
  const copy = TITLES.slice();
  filterTitles(TITLES, { search: 'render' });
  assert.deepEqual(TITLES, copy);
});

/* ---- resolveTitleAccess --------------------------------------------------- */
test('resolveTitleAccess allows an available title', () => {
  const gate = resolveTitleAccess(TITLES, 'tt-1');
  assert.equal(gate.status, undefined);
  assert.equal(gate.title.id, 'tt-1');
});

test('resolveTitleAccess returns 404 for an unknown id', () => {
  assert.equal(resolveTitleAccess(TITLES, 'tt-zzz').status, 404);
});

test('resolveTitleAccess returns 451 for an unavailable title', () => {
  assert.equal(resolveTitleAccess(TITLES, 'tt-9').status, 451);
});

/* ---- validatePosition ----------------------------------------------------- */
test('validatePosition accepts an in-range number and rounds it', () => {
  const r = validatePosition(42.7, 142);
  assert.equal(r.ok, true);
  assert.equal(r.value, 43);
});

test('validatePosition rejects negatives, overflow, and non-numbers', () => {
  assert.equal(validatePosition(-1, 142).ok, false);
  assert.equal(validatePosition(999, 142).ok, false);
  assert.equal(validatePosition('30', 142).ok, false);
  assert.equal(validatePosition(NaN, 142).ok, false);
});

/* ---- parseBearer ---------------------------------------------------------- */
test('parseBearer extracts the token', () => {
  assert.equal(parseBearer('Bearer abc123'), 'abc123');
  assert.equal(parseBearer('bearer  spaced '), 'spaced');
});

test('parseBearer returns null for missing or malformed headers', () => {
  assert.equal(parseBearer(undefined), null);
  assert.equal(parseBearer(''), null);
  assert.equal(parseBearer('Basic abc'), null);
});
