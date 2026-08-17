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
    // ERM = 185 * (1 + 10/30) = 246.67, rounded to 247
    await expect(item.locator('.pr-erm')).toHaveText('Est. 1RM 247');
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
    await page.locator('#summaryDoneBtn').click();
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

  test('PR list is sorted alphabetically regardless of logging order', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [
        makeSession({ date: daysFromToday(-3), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Zercher Squat', sets: [{ weight: 100, reps: 5 }] }] }),
        makeSession({ date: daysFromToday(-2), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Arnold Press', sets: [{ weight: 40, reps: 10 }] }] }),
        makeSession({ date: daysFromToday(-1), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Mid Row', sets: [{ weight: 80, reps: 8 }] }] }),
      ],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="prs"]').click();

    await expect(page.locator('.pr-item .pr-name')).toHaveText(['Arnold Press', 'Mid Row', 'Zercher Squat']);
  });

  test('search filters the PR list with fuzzy matching', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [
        makeSession({ date: daysFromToday(-3), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Zercher Squat', sets: [{ weight: 100, reps: 5 }] }] }),
        makeSession({ date: daysFromToday(-2), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Arnold Press', sets: [{ weight: 40, reps: 10 }] }] }),
        makeSession({ date: daysFromToday(-1), dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Mid Row', sets: [{ weight: 80, reps: 8 }] }] }),
      ],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="prs"]').click();
    await expect(page.locator('.pr-item')).toHaveCount(3);

    // Substring match, case-insensitive.
    await page.locator('#prSearchInput').fill('row');
    await expect(page.locator('.pr-item .pr-name')).toHaveText(['Mid Row']);

    // Fuzzy (non-contiguous) subsequence match.
    await page.locator('#prSearchInput').fill('arnld');
    await expect(page.locator('.pr-item .pr-name')).toHaveText(['Arnold Press']);

    // No match shows the empty state with a search-specific message.
    await page.locator('#prSearchInput').fill('xyz123');
    await expect(page.locator('.pr-item')).toHaveCount(0);
    await expect(page.locator('#prList .empty-state')).toContainText('No exercises match your search.');

    // Clearing the search restores the full, sorted list.
    await page.locator('#prSearchInput').fill('');
    await expect(page.locator('.pr-item .pr-name')).toHaveText(['Arnold Press', 'Mid Row', 'Zercher Squat']);
  });
});
