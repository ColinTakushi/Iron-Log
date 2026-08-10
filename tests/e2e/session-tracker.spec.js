const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, todayLocal } = require('../support/fixtures');

test.describe('ongoing session tracker', () => {
  test('backing out of an in-progress workout shows a resumable tracker bar', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');

    await expect(page.locator('#sessionTracker')).not.toHaveClass(/show/);

    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();
    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await firstRow.locator('input[data-field="reps"]').fill('8');

    await page.locator('#backToCalendar').click();

    const tracker = page.locator('#sessionTracker');
    await expect(tracker).toHaveClass(/show/);
    await expect(tracker.locator('#sessionTrackerLabel')).toHaveText('Upper A');
    await expect(tracker.locator('#sessionTrackerTime')).not.toHaveText('0:00');

    await tracker.click();
    await expect(page.locator('#view-log')).toHaveClass(/active/);
    await expect(page.locator('#logTitle')).toHaveText('Upper A');
    await expect(firstRow.locator('input[data-field="weight"]')).toHaveValue('135');

    // navigating back into the log view hides the tracker again
    await expect(tracker).not.toHaveClass(/show/);
  });

  test('the tracker appears on load when a draft already exists, and disappears once the workout is finished', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      drafts: {
        [today]: {
          dayKey: 'lowerA',
          sessionData: { 0: [{ weight: 225, reps: 5, done: true }] },
          timerStart: Date.now() - 5 * 60 * 1000,
        },
      },
    }));
    await page.goto('/');

    const tracker = page.locator('#sessionTracker');
    await expect(tracker).toHaveClass(/show/);
    await expect(tracker.locator('#sessionTrackerLabel')).toHaveText('Lower A');

    await tracker.click();
    await expect(page.locator('#view-log')).toHaveClass(/active/);
    await page.locator('#finishBtn').click();

    await expect(page.locator('#view-calendar')).toHaveClass(/active/);
    await expect(tracker).not.toHaveClass(/show/);
  });

  test('exiting and discarding an in-progress workout removes the tracker', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();
    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await page.locator('#backToCalendar').click();

    await expect(page.locator('#sessionTracker')).toHaveClass(/show/);

    await page.locator('#sessionTracker').click();
    await page.locator('#clearBtn').click();
    await page.locator('#confirmExitBtn').click();

    await expect(page.locator('#sessionTracker')).not.toHaveClass(/show/);
  });
});
