const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal, daysFromToday } = require('../support/fixtures');

test.describe('PR (personal record) tracking', () => {
  test('PR tab shows the heaviest set per exercise, tie-broken by reps', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [
        makeSession({ date: daysFromToday(-14), dayKey: 'lowerA', dayLabel: 'Lower A', exercises: [{ name: 'Back Squat', sets: [{ weight: 175, reps: 12 }] }] }),
        makeSession({ date: daysFromToday(-7), dayKey: 'lowerA', dayLabel: 'Lower A', exercises: [{ name: 'Back Squat', sets: [{ weight: 185, reps: 8 }] }] }),
        makeSession({ date: daysFromToday(-1), dayKey: 'lowerA', dayLabel: 'Lower A', exercises: [{ name: 'Back Squat', sets: [{ weight: 185, reps: 10 }] }] }),
      ],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="prs"]').click();

    const item = page.locator('.pr-item', { hasText: 'Back Squat' });
    await expect(item.locator('.pr-weight')).toContainText('185');
    await expect(item.locator('.pr-weight span')).toHaveText('x10 reps');
  });

  test('logging a new heavier set highlights it live and updates the PR tab after saving', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: daysFromToday(-7), dayKey: 'upperA', dayLabel: 'Upper A',
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();

    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard.locator('.pr-val')).toHaveText('135 x 8');

    const firstRow = firstCard.locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('145');
    await firstRow.locator('input[data-field="reps"]').fill('6');
    await firstRow.locator('.check').click();
    await expect(firstRow).toHaveClass(/is-pr/);
    await expect(firstRow.locator('.check')).toHaveCSS('background-color', 'rgb(111, 157, 122)'); // --good (green = PR)

    await page.locator('#finishBtn').click();
    await page.locator('.tab-btn[data-tab="prs"]').click();
    await expect(page.locator('.pr-item', { hasText: 'Barbell Bench Press' }).locator('.pr-weight')).toContainText('145');
  });

  test('PR tab shows an empty state when nothing has been logged', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="prs"]').click();
    await expect(page.locator('#prList .empty-state')).toBeVisible();
    await expect(page.locator('.pr-item')).toHaveCount(0);
  });
});
