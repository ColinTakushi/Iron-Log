# Iron Log

A single-file, zero-dependency workout tracker built for a 4-day upper/lower hypertrophy split. No build step, no backend, no database — just a static page that runs entirely in the browser.

## Why

Most workout trackers are either bloated subscription apps or spreadsheets that don't scale. This is neither: it's a purpose-built tool for one specific training program, with the two features that actually matter mid-set — *what did I lift last time* and *is this a PR* — surfaced without any taps.

## Features

- **Calendar-based logging** — tap any date to log a session; the app tracks your position in the training cycle and highlights the recommended next workout
- **Set-by-set entry** with the previous session's numbers shown as placeholders, so progressive overload is a glance, not a lookup
- **Automatic PR tracking** per exercise, with a visual highlight the moment you log a set that matches or beats it
- **Exercise substitution** — swap any exercise for a curated preset alternative (same muscle group) or a fully custom one, without losing history
- **History log** with full edit/delete on past sessions
- **Local persistence** via `localStorage` — data survives closing the tab or the browser, no account required
- **Manual JSON backup/restore** for moving data between devices or browsers

## Tech

Plain HTML, CSS, and vanilla JavaScript. No frameworks, no npm install, no build tooling. Fonts are pulled from Google Fonts via CDN; everything else is self-contained in `index.html`.

This was a deliberate choice — the entire app is one file you can open, read top to bottom, and understand without tracing imports across a project tree.

## Running it

**Locally:**
```bash
git clone https://github.com/<your-username>/iron-log.git
cd iron-log
open index.html   # or just double-click it
```

**Hosted:** this repo is set up for GitHub Pages out of the box — enable it under *Settings → Pages*, source: `main` branch, root. It'll be live at `https://<your-username>.github.io/iron-log/`.

**On iPhone/Android:** once hosted, open the URL in your mobile browser and use "Add to Home Screen" for a full-screen, app-like experience.

## The program

Iron Log ships pre-loaded with a 4-day upper/lower split (17 working sets per session, hypertrophy-focused rep ranges). The program logic and exercise presets live in the `PROGRAM_DEFAULT` and `PRESETS` objects near the top of the script — swap them out if you want to adapt this to a different split entirely.

## Data & privacy

All data stays in your browser's `localStorage` — nothing is sent to a server, because there is no server. If this repo is public, the *code* is visible to anyone, but your *logged workout data* never leaves your device unless you export a backup file yourself.

## License

MIT — see [LICENSE](LICENSE).
