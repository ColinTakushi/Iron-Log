const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData } = require('../support/fixtures');

test.describe('logging a workout', () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();
    await expect(page.locator('#logTitle')).toHaveText('Upper A');
  });

  test('checking a set updates the progress bar, and finishing saves the session', async ({ page }) => {
    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('.ex-name')).toHaveText('Barbell Bench Press');

    const firstRow = firstCard.locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await firstRow.locator('input[data-field="reps"]').fill('8');
    await expect(page.locator('#progressLabel')).toHaveText('0%');
    await firstRow.locator('.check').click();

    await expect(firstRow.locator('.check')).toHaveClass(/done/);
    await expect(page.locator('#progressLabel')).not.toHaveText('0%');

    await page.locator('#finishBtn').click();
    await expect(page.locator('#toast')).toHaveText('Workout saved');
    await expect(page.locator('#view-calendar')).toHaveClass(/active/);
    await expect(page.locator('.cal-cell.today')).toHaveClass(/logged/);

    await page.locator('.tab-btn[data-tab="history"]').click();
    const item = page.locator('.history-item').first();
    await expect(item.locator('.h-day')).toHaveText('Upper A');
    await expect(item.locator('.h-ex').first().locator('.h-sets')).toHaveText('135x8');
  });

  test('finishing with nothing logged is blocked with a toast', async ({ page }) => {
    await page.locator('#finishBtn').click();
    await expect(page.locator('#toast')).toHaveText('Log at least one set first');
    await expect(page.locator('#view-log')).toHaveClass(/active/);
  });

  test('add set appends a row and persists the new target count', async ({ page }) => {
    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('.set-row')).toHaveCount(4); // "4 x 6-8"

    await firstCard.locator('.set-ctrl-btn[data-action="add"]').click();
    await expect(firstCard.locator('.set-row')).toHaveCount(5);

    const target = await page.evaluate(() => state.customProgram.upperA[0].target);
    expect(target).toBe('5 x 6-8');
  });

  test('remove set removes a row and refuses to go below one set', async ({ page }) => {
    const firstCard = page.locator('.exercise-card').first();
    const removeBtn = firstCard.locator('.set-ctrl-btn[data-action="remove"]');

    await removeBtn.click();
    await removeBtn.click();
    await removeBtn.click();
    await expect(firstCard.locator('.set-row')).toHaveCount(1);

    await removeBtn.click();
    await expect(page.locator('#toast')).toHaveText("Can't go below 1 set");
    await expect(firstCard.locator('.set-row')).toHaveCount(1);
  });
});
