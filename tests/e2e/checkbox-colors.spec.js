const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData } = require('../support/fixtures');

test.describe('set checkbox colors', () => {
  test('checking a set with no prior PR turns the box yellow, not green', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await firstRow.locator('input[data-field="reps"]').fill('8');
    await firstRow.locator('.check').click();

    await expect(firstRow).not.toHaveClass(/is-pr/);
    await expect(firstRow.locator('.check')).toHaveClass(/done/);
    await expect(firstRow.locator('.check')).toHaveCSS('background-color', 'rgb(217, 182, 74)'); // --yellow
  });
});
