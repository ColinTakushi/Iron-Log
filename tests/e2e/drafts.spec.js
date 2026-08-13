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
    // an existing draft prompts Resume vs Start Over rather than silently resuming
    await expect(page.locator('#resumeBackdrop')).toHaveClass(/show/);
    await page.locator('#resumeConfirmBtn').click();
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
    await page.locator('#resumeConfirmBtn').click();

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
    await page.locator('#resumeConfirmBtn').click();
    await page.locator('#finishBtn').click();

    await expect(page.locator('.cal-cell.today')).toHaveClass(/logged/);
    await expect(page.locator('.cal-cell.today')).not.toHaveClass(/in-progress/);
  });

  test('typing a weight persists to localStorage after a brief pause, without leaving the log view', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('225');

    // debounced save fires ~500ms after the last input event
    await page.waitForTimeout(700);
    await page.reload();
    await page.locator('.cal-cell.today').click();
    await page.locator('#resumeConfirmBtn').click();

    const resumedRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await expect(resumedRow.locator('input[data-field="weight"]')).toHaveValue('225');
  });

  test('checking off a set saves immediately, without waiting for the input debounce', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');
    await firstRow.locator('.check').click();

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ironlog:data')));
    const today = Object.keys(saved.drafts)[0];
    expect(saved.drafts[today].sessionData['0'][0].done).toBe(true);
  });

  test('a pagehide event saves the current draft, guarding against iOS silently killing the app', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('185');
    // simulate the process being backgrounded/killed before the debounce would otherwise fire
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ironlog:data')));
    const today = Object.keys(saved.drafts)[0];
    expect(saved.drafts[today].sessionData['0'][0].weight).toBe(185);
  });
});
