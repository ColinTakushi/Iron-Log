const { test, expect } = require('@playwright/test');

// Deliberately does NOT use seedLocalStorage/addInitScript here: that helper
// re-seeds localStorage on every navigation (including page.reload()), which
// would wipe out the very draft this test relies on the app having written
// to real localStorage. Each test gets its own isolated browser context, so
// starting from a plain page.goto('/') is already a clean slate.
test.describe('drafts (unsaved in-progress workouts)', () => {
  test('leaving via the back arrow saves a draft that survives a reload and resumes with the same values', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Lower B' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('225');
    await firstRow.locator('input[data-field="reps"]').fill('5');

    await page.locator('#backToCalendar').click();
    await expect(page.locator('#view-calendar')).toHaveClass(/active/);
    await expect(page.locator('.cal-cell.today')).toHaveClass(/in-progress/);

    await page.reload();
    await expect(page.locator('.cal-cell.today')).toHaveClass(/in-progress/);

    await page.locator('.cal-cell.today').click();
    // resuming a draft skips the picker and opens the log view directly
    await expect(page.locator('#pickerBackdrop')).toBeHidden();
    await expect(page.locator('#logTitle')).toHaveText('Lower B');
    const resumedRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await expect(resumedRow.locator('input[data-field="weight"]')).toHaveValue('225');
    await expect(resumedRow.locator('input[data-field="reps"]')).toHaveValue('5');
  });

  test('the draft timer keeps its original wall-clock start time across a reload, rather than resetting', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper B' }).click();

    const originalStart = await page.evaluate(() => timerStart);
    expect(originalStart).toBeTruthy();

    await page.locator('#backToCalendar').click();
    await page.reload();
    await page.locator('.cal-cell.today').click();

    const resumedStart = await page.evaluate(() => timerStart);
    expect(resumedStart).toBe(originalStart);
  });

  test('finishing a session clears its draft', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await firstRow.locator('.check').click();
    await page.locator('#backToCalendar').click();
    await expect(page.locator('.cal-cell.today')).toHaveClass(/in-progress/);

    // resume and finish it
    await page.locator('.cal-cell.today').click();
    await page.locator('#finishBtn').click();

    await expect(page.locator('.cal-cell.today')).toHaveClass(/logged/);
    await expect(page.locator('.cal-cell.today')).not.toHaveClass(/in-progress/);
  });
});
