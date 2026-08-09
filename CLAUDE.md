# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step, no dependencies. Open `index.html` directly in a browser:

```bash
open index.html          # macOS
xdg-open index.html      # Linux
# or just double-click it in a file manager
```

For mobile PWA testing, host it via GitHub Pages (Settings → Pages, source: `main`, root) and use "Add to Home Screen" on the device.

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

`PROGRAM_DEFAULT` defines the four workout days (`upperA`, `lowerA`, `upperB`, `lowerB`), each with an ordered array of exercises. `DAY_ORDER` controls rotation sequence.

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
