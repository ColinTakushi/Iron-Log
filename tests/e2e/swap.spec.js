const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData } = require('../support/fixtures');

test.describe('exercise substitution', () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();
  });

  test('swapping to a preset renames the slot and resets its sets', async ({ page }) => {
    const firstCard = page.locator('.exercise-card').first(); // Barbell Bench Press, category "chest"
    const firstRow = firstCard.locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await firstRow.locator('.check').click();
    await expect(firstRow.locator('.check')).toHaveClass(/done/);

    await firstCard.locator('.swap-icon').click();
    await expect(page.locator('#swapBackdrop')).toBeVisible();
    await expect(page.locator('#swapSubLabel')).toHaveText('Currently: Barbell Bench Press');
    await expect(page.locator('.preset-btn', { hasText: 'Incline DB Press' })).toBeVisible();

    await page.locator('.preset-btn', { hasText: 'Incline DB Press' }).click();
    await expect(page.locator('#swapBackdrop')).toBeHidden();
    await expect(page.locator('#toast')).toHaveText('Swapped to Incline DB Press');

    const updatedCard = page.locator('.exercise-card').first();
    await expect(updatedCard.locator('.ex-name')).toHaveText('Incline DB Press');
    // sets reset: same count as before (4), all unchecked and blank
    await expect(updatedCard.locator('.set-row')).toHaveCount(4);
    await expect(updatedCard.locator('.check.done')).toHaveCount(0);
    await expect(updatedCard.locator('input[data-field="weight"]').first()).toHaveValue('');
  });

  test('swapping to a custom name persists it, adds it to MRU, and it reappears on the next swap sheet open', async ({ page }) => {
    const firstCard = page.locator('.exercise-card').first();
    await firstCard.locator('.swap-icon').click();
    await page.locator('#swapCustomInput').fill('Smith Machine Bench Press');
    await page.locator('#swapCustomBtn').click();

    const updatedCard = page.locator('.exercise-card').first();
    await expect(updatedCard.locator('.ex-name')).toHaveText('Smith Machine Bench Press');

    // customProgram is saved immediately, independent of the in-progress session
    const persistedName = await page.evaluate(() => state.customProgram.upperA[0].name);
    expect(persistedName).toBe('Smith Machine Bench Press');

    await updatedCard.locator('.swap-icon').click();
    await expect(page.locator('.section-label', { hasText: 'Your Custom Exercises' })).toBeVisible();
    await expect(page.locator('.preset-btn.current', { hasText: 'Smith Machine Bench Press' })).toBeVisible();
  });
});
