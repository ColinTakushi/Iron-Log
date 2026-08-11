const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal } = require('../support/fixtures');

test.describe('confirming before deleting a history entry', () => {
  test('the delete link opens the custom confirm sheet, never a native browser dialog', async ({ page }) => {
    let nativeDialogFired = false;
    page.on('dialog', (dialog) => {
      nativeDialogFired = true;
      dialog.dismiss();
    });

    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    await page.locator('.h-del').click();
    await expect(page.locator('#deleteHistoryConfirmBackdrop')).toBeVisible();
    expect(nativeDialogFired).toBe(false);
  });

  test('canceling leaves the workout untouched', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    await page.locator('.h-del').click();
    await page.locator('#deleteHistoryCancelBtn').click();

    await expect(page.locator('#deleteHistoryConfirmBackdrop')).toBeHidden();
    await expect(page.locator('.history-item')).toHaveCount(1);
  });

  test('tapping the backdrop also cancels without deleting', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    await page.locator('.h-del').click();
    await page.locator('#deleteHistoryConfirmBackdrop').click({ position: { x: 5, y: 5 } });

    await expect(page.locator('#deleteHistoryConfirmBackdrop')).toBeHidden();
    await expect(page.locator('.history-item')).toHaveCount(1);
  });

  test('confirming deletes the workout and shows a toast', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    await page.locator('.h-del').click();
    await page.locator('#deleteHistoryConfirmBtn').click();

    await expect(page.locator('#toast')).toHaveText('Workout deleted');
    await expect(page.locator('.history-item')).toHaveCount(0);
  });

  test('with two entries, deleting one via confirm only removes that one', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [
        makeSession({ id: 'a', date: todayLocal(), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] }),
        makeSession({ id: 'b', date: '2020-01-01', dayKey: 'lowerA', dayLabel: 'Lower A', exercises: [{ name: 'Back Squat', sets: [{ weight: 185, reps: 5 }] }] }),
      ],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();
    await expect(page.locator('.history-item')).toHaveCount(2);

    // most-recent-first: today's Upper A session is first
    await page.locator('.history-item').first().locator('.h-del').click();
    await page.locator('#deleteHistoryConfirmBtn').click();

    await expect(page.locator('.history-item')).toHaveCount(1);
    await expect(page.locator('.history-item').first().locator('.h-day')).toHaveText('Lower A');
  });
});
