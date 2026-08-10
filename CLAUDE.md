# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Read this before making changes.

## What this is

A single-file, zero-dependency workout tracker built for a specific 4-day upper/lower hypertrophy program. It's a personal tool, hosted as a static site via GitHub Pages, used daily on an iPhone (added to the Home Screen as a pseudo-app).

There is exactly one file that matters: `index.html`. Everything — HTML, CSS, and JS — lives in that single file. There is no build step, no bundler, no framework, and the shipped app has zero runtime dependencies. This is intentional; keep it that way unless the user explicitly asks to restructure.

The repo does have a `package.json`, but it exists solely to run the Playwright test suite in CI (see "Testing" below) — it is dev-only tooling, never loaded by `index.html`, and doesn't compromise the zero-dependency nature of the shipped app.

## Running the app

No build step, no dependencies. Open `index.html` directly in a browser:

```bash
open index.html          # macOS
xdg-open index.html      # Linux
# or just double-click it in a file manager
```

For mobile PWA testing, host it via GitHub Pages (Settings → Pages, source: `main`, root) and use "Add to Home Screen" on the device.

## Testing

A Playwright test suite runs against a real (headless) browser on every pull request via GitHub Actions (`.github/workflows/tests.yml`, both Chromium and WebKit — WebKit specifically because this app targets iOS Safari). There's no way to unit-test `index.html`'s script in isolation: it's a single non-module `<script>` tag that calls `init()` unconditionally at parse time, immediately touching real DOM and `localStorage`, so tests drive the actual rendered page rather than importing functions.

Run locally:
```bash
npm install
npx playwright install    # first time only, downloads browser binaries
npm test                  # or: npx playwright test
npx playwright show-report  # view the HTML report after a run
```

Structure:
- `tests/support/` — a zero-dependency static file server (`static-server.js`, needed because `localStorage` requires a real `http://` origin, not `file://`) and `fixtures.js` (helpers to seed `localStorage['ironlog:data']` before navigation and build local-timezone date strings matching the app's own `fmtDate()`)
- `tests/unit/` — calls the app's pure calculation functions (`getPR`, `computeWeekStreak`, `computeTotalVolume`, etc.) directly via `page.evaluate`, with controlled state fixtures, without going through the UI
- `tests/e2e/` — one file per user-facing flow (calendar, logging, swap, history, PRs, stats, drafts, edit-details, exit-confirm, data import/export, tab navigation, mobile layout), driving the real UI end-to-end

**Rules for future changes:**
- When adding a new feature to `index.html`, add or extend a test covering it in the same change. Don't ship untested behavior.
- Never delete or skip a test just because it's failing. A failing test means something regressed — fix the regression, don't remove the evidence of it.
- Only remove or rewrite a test when the behavior it checks was intentionally changed (update the test to match the new correct behavior) or the feature it covers was intentionally removed from the app entirely (delete the test, and say why in the commit message).

## Tech constraints (important)

- Plain HTML/CSS/vanilla JS only. No React, no npm, no build tooling.
- Fonts load from Google Fonts CDN (`Oswald`, `Inter`, `Roboto Mono`). No other external dependencies.
- Data persists via `localStorage` (key: `ironlog:data`). This only works because the app is hosted at a real `https://` URL via GitHub Pages — it was previously built for Claude.ai's artifact preview and hit iOS Safari restrictions around opening local files, which is why it ended up hosted here. Don't reintroduce anything that assumes a local `file://` context.
- Manual JSON export/import ("Data" tab) exists as a backup mechanism alongside auto-save, for moving data between browsers/devices.
- Deployed via GitHub Pages from this repo's root (`index.html` is the required filename/location for that to work).

## Design language

Dark theme, "iron & chalk" palette (see CSS `:root` variables: `--bg`, `--chalk`, `--iron`, `--brass`, etc.). Typography: `Oswald` for headers/labels (uppercase, condensed), `Roboto Mono` for numbers (weights, reps, timers), `Inter` for body text. Keep this consistent — don't introduce a different visual language for new features.

## Architecture

The entire app is a single file: `index.html`. It contains three sections in order:

1. **`<style>`** — all CSS, using CSS custom properties defined on `:root` for the color palette (`--bg`, `--brass`, `--iron`, `--chalk`, etc.)
2. **`<body>`** — static HTML shell: header, tab bar, five view divs (`#view-calendar`, `#view-log`, `#view-history`, `#view-prs`, `#view-stats`, `#view-data`), and several sheet/modal overlays
3. **`<script>`** — all application logic (~870 lines of vanilla JS, no imports)

### Data layer

Everything persists to `localStorage` under the key `ironlog:data`. The shape stored is:
```js
{ customProgram, sessions, drafts, customExerciseHistory }
```

**`state`** is the in-memory mirror:
- `state.sessions` — array of completed workout sessions: `{ id, date:'YYYY-MM-DD', dayKey, dayLabel, exercises:[{name, sets:[{weight,reps}]}], durationSeconds }`
- `state.customProgram` — sparse override map: `{ [dayKey]: { [slotIndex]: {name, target, category, intensity} } }`
- `state.customExerciseHistory` — MRU list of user-typed custom exercise names (max 20)

**`drafts`** is a separate top-level variable (not in `state`) that holds in-progress (unsaved) workouts: `{ [dateStr]: { dayKey, sessionData, timerStart } }`.

### Program definition

`PROGRAM_DEFAULT` defines the four workout days (`upperA`, `lowerA`, `upperB`, `lowerB`), each with an ordered array of exercises, and never changes at runtime — it's the reference used by the "View Original Plan" sheet. `DAY_ORDER` controls rotation sequence.

`PRESETS` maps exercise category strings (e.g. `'chest'`, `'quads'`) to lists of swap alternatives.

`getEffectiveDay(dayKey)` merges `PROGRAM_DEFAULT` with `state.customProgram` overrides and is the single source of truth for "what exercises does a day have right now."

### View/navigation system

`switchView(name)` activates one of the named views by toggling `.active` on `#view-{name}` divs. The tab bar and top header hide when `name === 'log'`. Tabs call `switchTab(tab)` which also triggers lazy renders for history/PRs/stats.

Sheets (bottom drawers) are toggled via `openSheet(id)` / `closeSheet(id)` which add/remove `.show` on `.sheet-backdrop` elements.

### Key flows

- **Tapping a calendar date** → `onDateTapped` → opens existing session, resumes draft, or shows the workout picker sheet
- **Workout picker** → `openLogView(dateStr, dayKey, existingSession)` → populates `sessionData` from draft/existing/blank, starts timer, renders exercises
- **Set check/uncheck** → updates `sessionData` in place, calls `updateSetCounter()` for progress bar, applies `.is-pr` class immediately if weight ≥ current PR
- **Add/remove set** → also persists the new set count into `state.customProgram` so it survives refresh
- **Swap exercise** → writes into `state.customProgram[dayKey][slotIdx]`, resets that slot's `sessionData`, re-renders
- **Finish** → `finishSession()` assembles the session object, upserts into `state.sessions`, clears draft, saves, re-renders calendar/history/PRs
- **Back arrow** → saves draft before leaving log view

### PR detection

`getPR(exerciseName)` scans all sessions for the heaviest weight logged for that exercise (tie-broken by reps). It runs on every `renderExercises()` call and is also used in the PR tab via `renderPRs()`.

## Key behaviors already implemented (don't regress these)

- Drafts persist across navigation: leaving the log view via the back arrow saves an in-memory + localStorage draft (sets, weights, timer start) so nothing is lost. The timer keeps counting real elapsed time even while away — it's wall-clock based (`timerStart` timestamp), not a pausable stopwatch.
- Exit button: destructive — discards the current session's data (deletes it from `state.sessions` if editing a saved one, or clears the draft if new) and requires confirmation via the in-app sheet (`#confirmBackdrop`). Do not use `window.confirm()`/`alert()`/`prompt()` anywhere in this app — they were found to be unreliable in sandboxed/embedded contexts; all confirmations use the custom bottom-sheet pattern instead.
- Stats tab: total time trained (sum of `durationSeconds`), week streak (consecutive Sun–Sat weeks with ≥1 session, current week doesn't break the streak if not yet trained), total volume (Σ weight × reps across every set ever logged).
- Editable date/duration: tapping the date or timer in the log view header opens a sheet to change either. Changing date blocks if the target date already has a session (one session per date). Editing duration re-bases `timerStart` rather than storing a separate override value.
- iOS safe-area handling: sticky headers bake `env(safe-area-inset-top)` directly into their own padding rather than relying on `<body>` padding, because sticky positioning can bypass ancestor padding once "stuck" — this was a real bug on iPhone 13 that took a couple iterations to fix. Keep this pattern for any new sticky/fixed elements.

## Known limitations (by design, not bugs)

- `localStorage` is per-browser/per-device — data doesn't sync between Safari and Firefox on the same phone, or between phone and desktop. The JSON export/import in the Data tab is the intended workaround; don't try to add real sync/backend unless asked.
- Older sessions logged before duration tracking was added have `durationSeconds` undefined/0 — Stats tab total time only reflects sessions logged after that feature existed.
- Single session per calendar date — the data model doesn't support multiple workouts logged on the same day.

## When making changes

- Keep everything in `index.html`. If a change is substantial, mirror the existing code organization (state → helpers → render functions → event wiring in `init()`), which is laid out roughly in that order with `// ============ Section ============` comments.
- There's still no build step for the app itself — just verify the HTML is well-formed and open it in a browser to sanity-check. But there is a test step now: add/update Playwright tests for whatever you changed (see "Testing" above) and run `npm test` before considering the change done.
- The user deploys by pushing `index.html` to this repo's root; GitHub Pages picks it up automatically.
