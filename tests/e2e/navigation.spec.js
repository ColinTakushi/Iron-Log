const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal } = require('../support/fixtures');

test.describe('tab navigation', () => {
  test('switches between all five tabs, activating the matching view and tab button', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');

    for (const tab of ['history', 'prs', 'stats', 'data', 'calendar']) {
      await page.locator(`.tab-btn[data-tab="${tab}"]`).click();
      await expect(page.locator(`#view-${tab}`)).toHaveClass(/active/);
      await expect(page.locator(`.tab-btn[data-tab="${tab}"]`)).toHaveClass(/active/);
      // exactly one view should be active at a time
      await expect(page.locator('.view.active')).toHaveCount(1);
    }
  });

  test('the stats view lazily renders only once its tab is visited', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');

    const statsListEmpty = await page.locator('#statsList').innerHTML();
    expect(statsListEmpty.trim()).toBe('');

    await page.locator('.tab-btn[data-tab="stats"]').click();
    const statsListAfter = await page.locator('#statsList').innerHTML();
    expect(statsListAfter.trim()).not.toBe('');
  });

  test('header and tab bar hide in the log view and reappear on returning to the calendar', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');

    await expect(page.locator('#topHeader')).toBeVisible();
    await expect(page.locator('.tabbar')).toBeVisible();

    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    await expect(page.locator('#topHeader')).toBeHidden();
    await expect(page.locator('.tabbar')).toBeHidden();

    await page.locator('#backToCalendar').click();
    await expect(page.locator('#topHeader')).toBeVisible();
    await expect(page.locator('.tabbar')).toBeVisible();
  });
});
