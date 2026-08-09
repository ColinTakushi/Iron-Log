// Shared test helpers: seeding localStorage and building date strings the
// same way index.html's own fmtDate() does (local calendar date, not UTC),
// so fixtures line up with what the app renders regardless of timezone.
const STORAGE_KEY = 'ironlog:data';

function pad2(n) {
  return n.toString().padStart(2, '0');
}

function fmtDateLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function todayLocal() {
  return fmtDateLocal(new Date());
}

function daysFromToday(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return fmtDateLocal(d);
}

function emptyData(overrides = {}) {
  return {
    version: 1,
    customProgram: {},
    sessions: [],
    customExerciseHistory: [],
    drafts: {},
    ...overrides,
  };
}

function makeSession({ id, date, dayKey = 'upperA', dayLabel = 'Upper A', exercises, durationSeconds = 1800 }) {
  return {
    id: id || `${date}-${dayKey}`,
    date,
    dayKey,
    dayLabel,
    exercises,
    durationSeconds,
  };
}

// Seeds localStorage before index.html's own init() runs (which reads it on load).
async function seedLocalStorage(page, data) {
  await page.addInitScript(
    ([key, json]) => {
      window.localStorage.setItem(key, json);
    },
    [STORAGE_KEY, JSON.stringify(data)]
  );
}

module.exports = {
  STORAGE_KEY,
  fmtDateLocal,
  todayLocal,
  daysFromToday,
  emptyData,
  makeSession,
  seedLocalStorage,
};
