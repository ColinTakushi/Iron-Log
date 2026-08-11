const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData } = require('../support/fixtures');

test.describe('default plan visibility during a workout', () => {
  test('log view header has a button that opens the original plan, highlighting the active day', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    await expect(page.locator('#viewPlanBtn')).toBeVisible();
    await page.locator('#viewPlanBtn').click();

    await expect(page.locator('#defaultProgramBackdrop')).toBeVisible();
    // all four days are listed, not just the active one
    await expect(page.locator('#defaultProgramList .plan-day-block')).toHaveCount(4);

    const currentBlock = page.locator('#planBlock-upperA');
    await expect(currentBlock).toHaveClass(/plan-current/);
    await expect(currentBlock).toContainText('Today');
    await expect(page.locator('#planBlock-lowerA')).not.toHaveClass(/plan-current/);

    await page.locator('#defaultProgramCloseBtn').click();
    await expect(page.locator('#defaultProgramBackdrop')).toBeHidden();
  });

  test('the Data tab plan button still works and shows no "today" highlight', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="data"]').click();
    await page.locator('#viewDefaultBtn').click();

    await expect(page.locator('#defaultProgramBackdrop')).toBeVisible();
    await expect(page.locator('.plan-current-badge')).toHaveCount(0);
  });

  test('each exercise row shows its name and set/rep target legibly, on their own elements', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="data"]').click();
    await page.locator('#viewDefaultBtn').click();

    const firstRow = page.locator('#planBlock-upperA .plan-ex').first();
    await expect(firstRow.locator('.plan-ex-name')).toHaveText('Barbell Bench Press');
    await expect(firstRow.locator('.plan-ex-target')).toHaveText('4 x 6-8');
    // the two pieces of text must not be jammed together with no separation
    await expect(firstRow).not.toHaveText('Barbell Bench Press4 x 6-8');
  });
});
