/* ============================================================================
   UNIT TESTS — lib/streamz-core.js  (Playwright runner)
   ----------------------------------------------------------------------------
   The fastest level: call a pure function, assert its return — no server, no
   network. These run on the Playwright runner like every other level, so they
   produce the same screenshot / video / trace artifacts.

       npm run test:unit       (or: npx playwright test --project=unit)
   ============================================================================ */

const { test, expect } = require('../fixtures');

const {
  publicUser,
  catalogCard,
  filterTitles,
  resolveTitleAccess,
  validatePosition,
  parseBearer,
} = require('../../lib/streamz-core');

const SAMPLE_USER = { id: 'u_qa', email: 'qa@streamz.test', password: 'Test@123', name: 'Quinn Tester' };
const TITLES = [
  { id: 'tt-1', title: 'The Last Render', genres: ['Sci-Fi', 'Thriller'], durationSec: 142, available: true },
  { id: 'tt-2', title: 'Pipeline of Dreams', genres: ['Drama'], durationSec: 118, available: true },
  { id: 'tt-9', title: 'Rights Expired', genres: ['Mystery'], durationSec: 110, available: false },
];

test('publicUser strips the password', () => {
  const u = publicUser(SAMPLE_USER);
  expect(u).toEqual({ id: 'u_qa', email: 'qa@streamz.test', name: 'Quinn Tester' });
  expect(u.password).toBeUndefined();
});

test('catalogCard keeps card fields and drops synopsis', () => {
  const card = catalogCard({ ...TITLES[0], synopsis: 'secret', captions: true, poster: { bg: '#000' } });
  expect(card.id).toBe('tt-1');
  expect(card.synopsis).toBeUndefined();
  expect(card.captions).toBe(true);
});

test('filterTitles returns everything when no filters are given', () => {
  expect(filterTitles(TITLES)).toHaveLength(3);
});

test('filterTitles matches title text case-insensitively', () => {
  const out = filterTitles(TITLES, { search: 'pipeline' });
  expect(out).toHaveLength(1);
  expect(out[0].id).toBe('tt-2');
});

test('filterTitles matches by genre', () => {
  const out = filterTitles(TITLES, { genre: 'sci-fi' });
  expect(out).toHaveLength(1);
  expect(out[0].id).toBe('tt-1');
});

test('filterTitles does not mutate the input array', () => {
  const copy = TITLES.slice();
  filterTitles(TITLES, { search: 'render' });
  expect(TITLES).toEqual(copy);
});

test('resolveTitleAccess allows an available title', () => {
  const gate = resolveTitleAccess(TITLES, 'tt-1');
  expect(gate.status).toBeUndefined();
  expect(gate.title.id).toBe('tt-1');
});

test('resolveTitleAccess returns 404 for an unknown id', () => {
  expect(resolveTitleAccess(TITLES, 'tt-zzz').status).toBe(404);
});

test('resolveTitleAccess returns 451 for an unavailable title', () => {
  expect(resolveTitleAccess(TITLES, 'tt-9').status).toBe(451);
});

test('validatePosition accepts an in-range number and rounds it', () => {
  const r = validatePosition(42.7, 142);
  expect(r.ok).toBe(true);
  expect(r.value).toBe(43);
});

test('validatePosition rejects negatives, overflow, and non-numbers', () => {
  expect(validatePosition(-1, 142).ok).toBe(false);
  expect(validatePosition(999, 142).ok).toBe(false);
  expect(validatePosition('30', 142).ok).toBe(false);
  expect(validatePosition(NaN, 142).ok).toBe(false);
});

test('parseBearer extracts the token', () => {
  expect(parseBearer('Bearer abc123')).toBe('abc123');
  expect(parseBearer('bearer  spaced ')).toBe('spaced');
});

test('parseBearer returns null for missing or malformed headers', () => {
  expect(parseBearer(undefined)).toBeNull();
  expect(parseBearer('')).toBeNull();
  expect(parseBearer('Basic abc')).toBeNull();
});
