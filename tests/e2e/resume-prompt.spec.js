const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal } = require('../support/fixtures');

test.describe('resume vs start over prompt', () => {
  test('tapping a date with an unfinished draft shows the prompt instead of silently resuming', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      drafts: {
        [today]: {
          dayKey: 'upperA',
          sessionData: { 0: [{ weight: 135, reps: 8, done: true }] },
          timerStart: Date.now() - 60000,
        },
      },
    }));
    await page.goto('/');

    await page.locator('.cal-cell.today').click();
    await expect(page.locator('#resumeBackdrop')).toHaveClass(/show/);
    await expect(page.locator('#view-log')).not.toHaveClass(/active/);
    await expect(page.locator('#resumeSub')).toContainText('Upper A');
  });

  test('"Resume Where I Left Off" opens the log view with the previously logged data intact', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      drafts: {
        [today]: {
          dayKey: 'upperA',
          sessionData: { 0: [{ weight: 135, reps: 8, done: true }] },
          timerStart: Date.now() - 60000,
        },
      },
    }));
    await page.goto('/');

    await page.locator('.cal-cell.today').click();
    await page.locator('#resumeConfirmBtn').click();

    await expect(page.locator('#view-log')).toHaveClass(/active/);
    await expect(page.locator('#logTitle')).toHaveText('Upper A');
    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await expect(firstRow.locator('input[data-field="weight"]')).toHaveValue('135');
  });

  test('"Start Over" discards the draft and opens the workout picker with blank sets', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      drafts: {
        [today]: {
          dayKey: 'upperA',
          sessionData: { 0: [{ weight: 135, reps: 8, done: true }] },
          timerStart: Date.now() - 60000,
        },
      },
    }));
    await page.goto('/');

    await page.locator('.cal-cell.today').click();
    await page.locator('#resumeNewBtn').click();

    await expect(page.locator('#pickerBackdrop')).toHaveClass(/show/);
    // the old draft's in-progress marker is gone now that the draft was discarded
    await expect(page.locator('.cal-cell.today')).not.toHaveClass(/in-progress/);

    await page.locator('.workout-option', { hasText: 'Upper A' }).click();
    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await expect(firstRow.locator('input[data-field="weight"]')).toHaveValue('');
    await expect(firstRow.locator('input[data-field="reps"]')).toHaveValue('');
  });

  test('Cancel and tapping outside the sheet leave the draft untouched', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      drafts: {
        [today]: {
          dayKey: 'upperA',
          sessionData: { 0: [{ weight: 135, reps: 8, done: true }] },
          timerStart: Date.now() - 60000,
        },
      },
    }));
    await page.goto('/');

    await page.locator('.cal-cell.today').click();
    await page.locator('#resumeCancelBtn').click();
    await expect(page.locator('#resumeBackdrop')).not.toHaveClass(/show/);
    await expect(page.locator('#view-calendar')).toHaveClass(/active/);
    await expect(page.locator('.cal-cell.today')).toHaveClass(/in-progress/);

    await page.locator('.cal-cell.today').click();
    await page.locator('#resumeBackdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#resumeBackdrop')).not.toHaveClass(/show/);
    await expect(page.locator('.cal-cell.today')).toHaveClass(/in-progress/);
  });

  test('a date with a saved (finished) session still opens directly for editing, no prompt', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: today, exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');

    await page.locator('.cal-cell.today').click();
    await expect(page.locator('#resumeBackdrop')).not.toHaveClass(/show/);
    await expect(page.locator('#view-log')).toHaveClass(/active/);
    await expect(page.locator('#logTitle')).toHaveText('Upper A');
  });
});
