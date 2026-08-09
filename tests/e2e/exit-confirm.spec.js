const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal } = require('../support/fixtures');

test.describe('exit confirmation', () => {
  test('the exit button opens the custom confirm sheet, never a native browser dialog', async ({ page }) => {
    let nativeDialogFired = false;
    page.on('dialog', (dialog) => {
      nativeDialogFired = true;
      dialog.dismiss();
    });

    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    await page.locator('#clearBtn').click();
    await expect(page.locator('#confirmBackdrop')).toBeVisible();
    expect(nativeDialogFired).toBe(false);

    await page.locator('#confirmCancelBtn').click();
    await expect(page.locator('#confirmBackdrop')).toBeHidden();
    await expect(page.locator('#view-log')).toHaveClass(/active/);
    expect(nativeDialogFired).toBe(false);
  });

  test('confirming discards a brand-new unsaved session and returns to the calendar', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('135');

    await page.locator('#clearBtn').click();
    await page.locator('#confirmExitBtn').click();

    await expect(page.locator('#toast')).toHaveText('Workout discarded');
    await expect(page.locator('#view-calendar')).toHaveClass(/active/);
    const todayCell = page.locator('.cal-cell.today');
    await expect(todayCell).not.toHaveClass(/logged/);
    await expect(todayCell).not.toHaveClass(/in-progress/);
  });

  test('confirming exit while editing an existing session deletes it entirely', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: today, dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');
    await page.locator('.cal-cell.today').click(); // existing session -> opens directly

    await page.locator('#clearBtn').click();
    await page.locator('#confirmExitBtn').click();

    await expect(page.locator('.cal-cell.today')).not.toHaveClass(/logged/);
    await page.locator('.tab-btn[data-tab="history"]').click();
    await expect(page.locator('.history-item')).toHaveCount(0);
  });
});
