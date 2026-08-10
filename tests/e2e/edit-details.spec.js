const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, daysFromToday, todayLocal } = require('../support/fixtures');

test.describe('editing session date and duration', () => {
  test('editing duration re-bases the timer start rather than storing a separate value', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    await page.locator('#logTimer').click();
    await expect(page.locator('#editDetailsBackdrop')).toBeVisible();
    await page.locator('#editDurationInput').fill('45');
    await page.locator('#editDetailsApplyBtn').click();

    await expect(page.locator('#toast')).toHaveText('Details updated');
    await expect(page.locator('#editDetailsBackdrop')).toBeHidden();

    const elapsedMinutes = await page.evaluate(() => Math.round((Date.now() - timerStart) / 60000));
    expect(elapsedMinutes).toBeGreaterThanOrEqual(44);
    expect(elapsedMinutes).toBeLessThanOrEqual(46);
  });

  test('changing the date to one that already has a session is blocked, leaving the original date intact', async ({ page }) => {
    const conflictDate = daysFromToday(-2);
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: conflictDate, dayKey: 'lowerA', dayLabel: 'Lower A', exercises: [{ name: 'Back Squat', sets: [{ weight: 185, reps: 5 }] }] })],
    }));
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    await page.locator('#logDate').click();
    await page.locator('#editDateInput').fill(conflictDate);
    await page.locator('#editDetailsApplyBtn').click();

    await expect(page.locator('#toast')).toHaveText('That date already has a workout logged');
    // activeDate is a top-level `let` in the app's script, not a `window` property —
    // reference it directly so page.evaluate resolves it through the page's own
    // global lexical scope instead of silently returning undefined.
    const activeDateAfter = await page.evaluate(() => activeDate);
    expect(activeDateAfter).toBe(todayLocal());
  });

  test('changing to a free date updates the active date and header', async ({ page }) => {
    const freeDate = daysFromToday(-3);
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    await page.locator('#logDate').click();
    await page.locator('#editDateInput').fill(freeDate);
    await page.locator('#editDetailsApplyBtn').click();

    await expect(page.locator('#toast')).toHaveText('Details updated');
    const newActiveDate = await page.evaluate(() => activeDate);
    expect(newActiveDate).toBe(freeDate);
  });
});
