// Exercises the app's pure calculation functions directly via page.evaluate,
// against a live page (index.html unconditionally runs init() at parse time,
// so a real DOM must be present — there's no way to eval the script in isolation).
const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, daysFromToday, todayLocal } = require('../support/fixtures');

test.describe('pure calculation functions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('getPR finds the heaviest set, tie-broken by reps', async ({ page }) => {
    const pr = await page.evaluate(() => {
      state.sessions = [
        {
          id: '1', date: '2024-01-01', dayKey: 'upperA', dayLabel: 'Upper A',
          exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }, { weight: 145, reps: 5 }] }],
        },
        {
          id: '2', date: '2024-01-08', dayKey: 'upperA', dayLabel: 'Upper A',
          exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 145, reps: 8 }] }],
        },
      ];
      return getPR('Barbell Bench Press');
    });
    expect(pr).toEqual({ weight: 145, reps: 8, date: '2024-01-08' });
  });

  test('getPR returns null when the exercise has never been logged', async ({ page }) => {
    const pr = await page.evaluate(() => {
      state.sessions = [];
      return getPR('Nonexistent Exercise');
    });
    expect(pr).toBeNull();
  });

  test('getPR ignores sets with no weight logged', async ({ page }) => {
    const pr = await page.evaluate(() => {
      state.sessions = [{
        id: '1', date: '2024-01-01', dayKey: 'upperA', dayLabel: 'Upper A',
        exercises: [{ name: 'Back Squat', sets: [{ weight: '', reps: 8 }, { weight: null, reps: 5 }] }],
      }];
      return getPR('Back Squat');
    });
    expect(pr).toBeNull();
  });

  test('formatPrevText formats logged sets or reports no data', async ({ page }) => {
    const withData = await page.evaluate(() =>
      formatPrevText({ date: '2024-01-01', sets: [{ weight: 100, reps: 10 }, { weight: 105, reps: 8 }] })
    );
    expect(withData).toBe('100x10, 105x8');

    const noPrev = await page.evaluate(() => formatPrevText(null));
    expect(noPrev).toBe('no data yet');
  });

  test('getPreviousSets finds the most recent prior session containing the exercise', async ({ page }) => {
    const prev = await page.evaluate(() => {
      state.sessions = [
        { id: '1', date: '2024-01-01', dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Barbell Row', sets: [{ weight: 95, reps: 10 }] }] },
        { id: '2', date: '2024-01-08', dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Barbell Row', sets: [{ weight: 100, reps: 8 }] }] },
      ];
      editingSessionId = null;
      return getPreviousSets('Barbell Row', '2024-01-15');
    });
    expect(prev).toEqual({ date: '2024-01-08', sets: [{ weight: 100, reps: 8 }] });
  });

  test('parseTargetCount and bumpTargetCount parse and adjust the leading set count', async ({ page }) => {
    expect(await page.evaluate(() => parseTargetCount('4 x 6-8'))).toBe(4);
    expect(await page.evaluate(() => bumpTargetCount('4 x 6-8', 1))).toBe('5 x 6-8');
    expect(await page.evaluate(() => bumpTargetCount('4 x 6-8', -1))).toBe('3 x 6-8');
    // never goes below 1
    expect(await page.evaluate(() => bumpTargetCount('1 x 6-8', -1))).toBe('1 x 6-8');
  });

  test('getEffectiveDay merges customProgram overrides onto the default program', async ({ page }) => {
    const name = await page.evaluate(() => {
      state.customProgram = { upperA: { 0: { name: 'Weighted Dip', target: '3 x 8', category: 'chest' } } };
      return getEffectiveDay('upperA').exercises[0].name;
    });
    expect(name).toBe('Weighted Dip');

    const untouched = await page.evaluate(() => getEffectiveDay('upperA').exercises[1].name);
    expect(untouched).toBe('Barbell Row');
  });

  test('getRecommendedDayKey defaults to the first day, then rotates through DAY_ORDER', async ({ page }) => {
    const first = await page.evaluate(() => {
      state.sessions = [];
      return getRecommendedDayKey();
    });
    expect(first).toBe('upperA');

    const next = await page.evaluate(() => {
      state.sessions = [{ id: '1', date: '2024-01-01', dayKey: 'upperA', dayLabel: 'Upper A', exercises: [] }];
      return getRecommendedDayKey();
    });
    expect(next).toBe('lowerA');

    const wraps = await page.evaluate(() => {
      state.sessions = [{ id: '1', date: '2024-01-01', dayKey: 'lowerB', dayLabel: 'Lower B', exercises: [] }];
      return getRecommendedDayKey();
    });
    expect(wraps).toBe('upperA');
  });

  test('addToCustomHistory dedupes case-insensitively, unshifts, and caps at 20', async ({ page }) => {
    const result = await page.evaluate(() => {
      state.customExerciseHistory = ['Curtsy Lunge', 'Single-Leg RDL'];
      addToCustomHistory('curtsy lunge'); // case-insensitive dupe of an existing entry
      return state.customExerciseHistory;
    });
    // the new casing replaces the old entry and moves to the front, rather than
    // keeping the original casing in place
    expect(result).toEqual(['curtsy lunge', 'Single-Leg RDL']);

    const capped = await page.evaluate(() => {
      state.customExerciseHistory = Array.from({ length: 20 }, (_, i) => `Exercise ${i}`);
      addToCustomHistory('Brand New Exercise');
      return state.customExerciseHistory;
    });
    expect(capped.length).toBe(20);
    expect(capped[0]).toBe('Brand New Exercise');
  });

  test('computeTotalVolume sums weight x reps across every set', async ({ page }) => {
    const volume = await page.evaluate(() => {
      state.sessions = [{
        id: '1', date: '2024-01-01', dayKey: 'upperA', dayLabel: 'Upper A',
        exercises: [{ name: 'A', sets: [{ weight: 100, reps: 10 }, { weight: 50, reps: 5 }] }],
      }];
      return computeTotalVolume();
    });
    expect(volume).toBe(100 * 10 + 50 * 5);
  });

  test('computeTotalSeconds sums durationSeconds across sessions', async ({ page }) => {
    const total = await page.evaluate(() => {
      state.sessions = [
        { id: '1', date: '2024-01-01', dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 600, exercises: [] },
        { id: '2', date: '2024-01-02', dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 900, exercises: [] },
        { id: '3', date: '2024-01-03', dayKey: 'upperA', dayLabel: 'Upper A', exercises: [] }, // undefined durationSeconds
      ];
      return computeTotalSeconds();
    });
    expect(total).toBe(1500);
  });

  test('formatDuration formats minutes-only and hours+minutes', async ({ page }) => {
    expect(await page.evaluate(() => formatDuration(45 * 60))).toBe('45m');
    expect(await page.evaluate(() => formatDuration(83 * 60))).toBe('1h 23m');
    expect(await page.evaluate(() => formatDuration(0))).toBe('0m');
  });

  test('weekKey returns the Sunday of the given date\'s week', async ({ page }) => {
    // 2024-01-10 is a Wednesday; the Sunday of that week is 2024-01-07.
    const key = await page.evaluate(() => weekKey('2024-01-10'));
    expect(key).toBe('2024-01-07');

    // A Sunday should map to itself.
    const sameDay = await page.evaluate(() => weekKey('2024-01-07'));
    expect(sameDay).toBe('2024-01-07');
  });

  test('computeWeekStreak counts consecutive weeks with a session, without breaking on an untrained current week', async ({ page }) => {
    const streak = await page.evaluate((today) => {
      function fmt(d) {
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      }
      const base = new Date(today + 'T00:00:00');
      const weekAgo = new Date(base); weekAgo.setDate(base.getDate() - 7);
      const twoWeeksAgo = new Date(base); twoWeeksAgo.setDate(base.getDate() - 14);
      state.sessions = [
        { id: '1', date: fmt(weekAgo), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [] },
        { id: '2', date: fmt(twoWeeksAgo), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [] },
      ];
      return computeWeekStreak();
    }, todayLocal());
    expect(streak).toBe(2);
  });

  test('computeWeekStreak breaks when a week is skipped', async ({ page }) => {
    const streak = await page.evaluate((today) => {
      function fmt(d) {
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      }
      const base = new Date(today + 'T00:00:00');
      const threeWeeksAgo = new Date(base); threeWeeksAgo.setDate(base.getDate() - 21);
      state.sessions = [
        { id: '1', date: fmt(threeWeeksAgo), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [] },
      ];
      return computeWeekStreak();
    }, todayLocal());
    expect(streak).toBe(0);
  });

  test('totalSetsFor and findSessionByDate', async ({ page }) => {
    const total = await page.evaluate(() => totalSetsFor(getEffectiveDay('upperA')));
    expect(total).toBe(4 + 4 + 3 + 2 + 2 + 2);

    const found = await page.evaluate((date) => {
      state.sessions = [{ id: '1', date, dayKey: 'upperA', dayLabel: 'Upper A', exercises: [] }];
      return !!findSessionByDate(date);
    }, todayLocal());
    expect(found).toBe(true);
  });

  test('loadFromLocalStorage restores a seeded session on init()', async ({ page }) => {
    const fixture = emptyData({
      sessions: [makeSession({ date: daysFromToday(-3), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    });
    await seedLocalStorage(page, fixture);
    await page.goto('/');
    const count = await page.evaluate(() => state.sessions.length);
    expect(count).toBe(1);
  });
});
