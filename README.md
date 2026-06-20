# Streamz — a Playwright practice target

A small **streaming media-player** web app, built to be *automated*, not just used.
It exists so you can practice exactly what the Disney **MPQE / SDET (P1)** job asks
for: **UI, API, and Integration** test automation in JS/Node.

It's deliberately small: **one login**, one media player, a handful of titles, and a
tiny JSON API. Nothing about Playwright is installed yet — **wiring that up is your
exercise** (see [§6](#6-set-up-playwright-yourself)).

---

## 1. Run it

You need **Node 18+**. There is nothing to `npm install`.

```bash
cd "PlayWright Project"
npm start          # or:  node server.js
```

Then open **http://localhost:3000**.

```
UI   →  http://localhost:3000/
API  →  http://localhost:3000/api/health
```

### Test account (there's just one)

| Email             | Password   |
|-------------------|------------|
| `qa@streamz.test` | `Test@123` |

> State (your token, where you paused each title) lives in memory and resets every
> time you restart the server. That's on purpose — it keeps tests independent.

---

## 2. Start here — your first 3 tests

If you're new to Playwright, don't try to test everything at once. Automate these
three first — one per "level" the job description names. Use §3 and §4 as your map.

**1) A UI test — log in.**
> Go to `/login.html`, fill `qa@streamz.test` / `Test@123`, click **Sign in**,
> and check you land on `/browse.html`.

**2) An API test — the API rejects you without a token.**
> `GET /api/content/tt-100` with **no** `Authorization` header → expect **401**.
> Then `POST /api/auth/login` with the account above → expect **200** and a `token`.

**3) An integration test — play, then resume.**
> Log in, open a title, press **Play**, let it run a few seconds, reload the page,
> and check the player resumes roughly where you left off.

Once those pass, work down the table in §3.

---

## 3. What you can test (feature → what to automate)

| Feature | Where | What to automate |
|---|---|---|
| **Login (happy path)** | `/login.html` | fill creds → submit → lands on `/browse.html` |
| **Login (validation)** | `/login.html` | empty fields show inline errors, no request sent |
| **Login (bad creds)** | `/login.html` | wrong password → red error banner (`data-testid="login-error"`) |
| **Auth guard** | `/browse`, `/player` | visiting while logged out → redirect to `/login.html?next=…` |
| **Browse + search** | `/browse.html` | grid renders titles; typing filters them; empty state appears |
| **Continue watching** | `/browse.html` | titles you've started show a resume progress bar |
| **Play / Pause** | `/player.html` | click play → state `playing`, button label flips to **Pause** |
| **Seek** | `/player.html` | move the slider → time read-out + `currentTime` update |
| **Skip ±10s** | `/player.html` | « 10 / 10 » buttons move the playhead |
| **Buffering** | `/player.html` | brief `buffering` state on play and quality change (an ABR nod) |
| **Captions** | `/player.html` | CC toggles a live caption box (titles with captions) |
| **Quality** | `/player.html` | quality `<select>` (Auto/480p/…); a streaming talking point |
| **Resume (E2E)** | `/player.html` | play, leave, return → resumes where you left off |
| **Unavailable title** | `/player.html?id=tt-900` | error overlay (driven by **451**) |
| **Missing title** | `/player.html?id=tt-zzz` | error overlay (driven by **404**) |

---

## 4. API reference (for your API-level tests)

Base URL: `http://localhost:3000`. All bodies are JSON. Protected routes (✅) need
`Authorization: Bearer <token>` from a login response. Every error looks the same:

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect." } }
```

| Method | Path | Auth | Success | Failure cases |
|---|---|---|---|---|
| `GET`  | `/api/health` | – | `200 {status,time}` | – |
| `POST` | `/api/auth/login` | – | `200 {token,user}` | `400` missing fields · `401` bad creds |
| `POST` | `/api/auth/logout` | ✅ | `200 {ok:true}` | `401` no token |
| `GET`  | `/api/profile` | ✅ | `200 {user}` | `401` |
| `GET`  | `/api/content` | – | `200 {count,items}` | – (supports `?search=` & `?genre=`) |
| `GET`  | `/api/content/:id` | ✅ | `200 {…title}` | `401` · `404` · `451` unavailable |
| `POST` | `/api/content/:id/playback` | ✅ | `200 {sessionId,durationSec,startPositionSec,…}` | `401` · `404` · `451` |
| `GET`  | `/api/content/:id/progress` | ✅ | `200 {positionSec}` | `401` · `404` |
| `POST` | `/api/content/:id/progress` | ✅ | `200 {saved,positionSec}` | `400` bad position · `401` · `404` |
| `GET`  | `/api/debug/error` | – | – | `500` (deliberate, for 5xx handling) |

**Token note:** a token is just a random string the server remembers. So a
**missing**, a **made-up**, and a **logged-out** token are all unknown to it and
all get a **401** — three negative auth tests you can write.

Quick sanity check from a terminal:

```bash
# login → capture token
curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa@streamz.test","password":"Test@123"}'

# negative: no token → 401
curl -i localhost:3000/api/content/tt-100
```

---

## 5. DOM / selector contract (for your UI tests)

The UI is built for **role- and testid-based** locators (the modern best practice —
prefer these over brittle CSS/XPath).

**Player state is the most useful thing to assert on.** The player root exposes its
status as a data attribute:

```
#player[data-state] = idle | buffering | playing | paused | ended | error
```

| Element | Locator | Notes |
|---|---|---|
| Player root | `[data-testid="player"]` | read `data-state` |
| Play/Pause | `getByRole('button', { name: 'Play' })` / `'Pause'` | `aria-label` flips |
| Seek slider | `[data-testid="seek"]` (role `slider`, name "Seek") | `fill('30')` to seek |
| Current / total time | `[data-testid="time-current"]` / `time-duration` | e.g. `0:30 / 2:22` |
| Rewind / Forward | `[data-testid="rewind"]` / `forward` | ±10s |
| Captions toggle | `[data-testid="captions-toggle"]` | `aria-pressed` |
| Quality | `[data-testid="quality"]` (role `combobox`) | `selectOption('720p')` |
| Mute / Volume | `[data-testid="mute"]` / `volume` | `aria-pressed` |
| Error overlay | `[data-testid="error-overlay"]` | `#errorMessage` text |
| Login form / fields | `[data-testid="login-form"]`, `email`, `password`, `submit` | |
| Login error banner | `[data-testid="login-error"]` (role `alert`) | |
| Title cards | `[data-testid="title-card"]` | `data-title-id` attr |
| Search box | `[data-testid="search"]` | |

Two ways to assert on playback:

1. **User-facing (preferred):**
   ```js
   await page.getByRole('button', { name: 'Play' }).click();
   await expect(page.getByTestId('player')).toHaveAttribute('data-state', 'playing');
   await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
   ```

2. **Via the test hook** (`window.__player`) when you need the raw timeline:
   ```js
   const state = await page.evaluate(() => window.__player.getState());
   expect(state.currentTime).toBeGreaterThan(0);
   ```

> **Why no real `<video>`?** This player is a **simulated** timeline (a `setInterval`
> clock) — deterministic, with no codec/autoplay flakiness — so you assert on the
> controls and `data-state` (above) or on `window.__player`. That's the recommended
> style anyway: `v.paused` → `__player.paused`, `v.currentTime` → `__player.currentTime`,
> "is playing" → `data-state="playing"`.

---

## 6. Set up Playwright yourself

> **Already wired up.** A full automation suite (Unit · API · Integration · Smoke ·
> E2E) plus Docker and a Jenkins pipeline now ship in this repo — see
> **[AUTOMATION.md](AUTOMATION.md)**. The walkthrough below is kept as a *learning*
> reference if you'd rather build the Playwright setup from scratch yourself.

This guide intentionally treats Playwright as something you wire up by hand — that
exercise is worth doing once. A suggested path (run the server in one terminal, do
this in another):

1. **Initialise** Playwright (it scaffolds a config + a `tests/` folder):
   ```bash
   npm init playwright@latest
   ```
   Choose **JavaScript**, keep the `tests` folder, and you can say **no** to GitHub
   Actions for now.

2. **Point tests at the app.** In `playwright.config.js`:
   ```js
   use: { baseURL: 'http://localhost:3000' },
   ```
   Optionally let Playwright start the app for you:
   ```js
   webServer: { command: 'node server.js', url: 'http://localhost:3000', reuseExistingServer: true },
   ```

3. **Write the three tests from §2**, then run them:
   ```bash
   npx playwright test
   npx playwright test --ui      # watch mode
   npx playwright show-report
   ```

Habits worth practising as you go: lean on **web-first assertions / auto-waiting**
instead of `sleep()`, keep tests **independent** (restarting the server gives a clean
slate), and structure each test as **Arrange → Act → Assert**.

---

## 7. Reset / troubleshooting

- **Restart the server** to wipe your token and resume positions (clean slate).
- **"Port 3000 in use"** → run on another port: `PORT=4000 node server.js` (then use
  that `baseURL`).
- **Stuck logged in?** Clear the `streamz.session` key from the browser's
  localStorage, or click **Sign out**.

> Want the deeper picture (how the server, auth, and player state machine fit
> together)? See [ARCHITECTURE.md](ARCHITECTURE.md) — optional, for when you're
> curious or prepping talking points.
