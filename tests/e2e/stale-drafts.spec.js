const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, daysFromToday, todayLocal } = require('../support/fixtures');

test.describe('auto-discard of stale, abandoned drafts', () => {
  test('a draft dated more than 3 days ago is discarded on load, while today\'s and yesterday\'s survive', async ({ page }) => {
    const staleDate = daysFromToday(-4);
    const yesterday = daysFromToday(-1);
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      drafts: {
        [staleDate]: { dayKey: 'upperA', sessionData: { 0: [{ weight: 100, reps: 5, done: true }] }, timerStart: Date.now() },
        [yesterday]: { dayKey: 'lowerA', sessionData: { 0: [{ weight: 200, reps: 5, done: true }] }, timerStart: Date.now() },
        [today]: { dayKey: 'upperB', sessionData: { 0: [{ weight: 150, reps: 5, done: true }] }, timerStart: Date.now() },
      },
    }));
    await page.goto('/');

    const remainingDrafts = await page.evaluate(() => Object.keys(drafts).sort());
    expect(remainingDrafts).toEqual([yesterday, today].sort());

    // the stale date now has neither a draft nor a session, so tapping it opens the picker directly
    await page.evaluate((d) => onDateTapped(d), staleDate);
    await expect(page.locator('#pickerBackdrop')).toHaveClass(/show/);
    await expect(page.locator('#resumeBackdrop')).not.toHaveClass(/show/);
  });

  test('stale draft cleanup never touches saved (finished) sessions', async ({ page }) => {
    const staleDate = daysFromToday(-10);
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: staleDate, exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
      drafts: {
        [staleDate]: { dayKey: 'upperA', sessionData: { 0: [{ weight: 100, reps: 5, done: true }] }, timerStart: Date.now() },
      },
    }));
    await page.goto('/');

    const sessionCount = await page.evaluate(() => state.sessions.length);
    expect(sessionCount).toBe(1);
    // the draft for that same (stale) date is still cleaned up
    const remainingDrafts = await page.evaluate(() => Object.keys(drafts));
    expect(remainingDrafts).toEqual([]);
  });
});
