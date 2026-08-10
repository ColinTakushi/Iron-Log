const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, daysFromToday } = require('../support/fixtures');

test.describe('post-workout summary', () => {
  test('finishing a brand-new workout shows duration, weight lifted, and PRs for every logged lift', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await firstRow.locator('input[data-field="reps"]').fill('8');

    await page.locator('#finishBtn').click();

    const sheet = page.locator('#summaryBackdrop');
    await expect(sheet).toBeVisible();
    await expect(page.locator('#summaryTitle')).toHaveText('Upper A Complete');
    await expect(page.locator('#summaryVolume')).toHaveText('1,080 lbs'); // 135 * 8
    await expect(page.locator('#summaryDuration')).not.toBeEmpty();
    // first-ever lift for this exercise counts as a new PR
    await expect(page.locator('#summaryPRs')).toContainText('New PRs This Session');
    await expect(page.locator('#summaryPRs')).toContainText('Barbell Bench Press');

    await page.locator('#summaryDoneBtn').click();
    await expect(sheet).toBeHidden();
  });

  test('logging below a prior PR reports no new PRs this session', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: daysFromToday(-7), dayKey: 'upperA', dayLabel: 'Upper A',
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 185, reps: 5 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await firstRow.locator('input[data-field="reps"]').fill('8');

    await page.locator('#finishBtn').click();
    await expect(page.locator('#summaryPRs')).toContainText('No new PRs this session');
  });
});
