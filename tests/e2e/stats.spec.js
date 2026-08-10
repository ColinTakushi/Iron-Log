const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal, daysFromToday } = require('../support/fixtures');

test.describe('stats tab', () => {
  test('total time, week streak, and total volume reflect logged sessions', async ({ page }) => {
    // one session this week, one exactly 7 days ago (last week) -> streak of 2
    await seedLocalStorage(page, emptyData({
      sessions: [
        makeSession({
          date: todayLocal(), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 1800,
          exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }], // 1080 volume
        }),
        makeSession({
          date: daysFromToday(-7), dayKey: 'lowerA', dayLabel: 'Lower A', durationSeconds: 2700,
          exercises: [{ name: 'Back Squat', sets: [{ weight: 185, reps: 5 }] }], // 925 volume
        }),
      ],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="stats"]').click();

    const cards = page.locator('.stat-card');
    await expect(cards).toHaveCount(3);

    await expect(cards.nth(0).locator('.stat-label')).toHaveText('Total Time Trained');
    await expect(cards.nth(0).locator('.stat-value')).toHaveText('1h 15m');
    await expect(cards.nth(0).locator('.stat-sub')).toHaveText('2 workouts logged');

    await expect(cards.nth(1).locator('.stat-label')).toHaveText('Week Streak');
    await expect(cards.nth(1).locator('.stat-value')).toHaveText('2weeks');

    await expect(cards.nth(2).locator('.stat-label')).toHaveText('Total Volume Lifted');
    await expect(cards.nth(2).locator('.stat-value')).toHaveText('2,005lbs');
  });

  test('cross-checks displayed values against the underlying pure functions', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [
        makeSession({ date: todayLocal(), durationSeconds: 900, exercises: [{ name: 'A', sets: [{ weight: 50, reps: 10 }] }] }),
      ],
    }));
    await page.goto('/');
    const [expectedSeconds, expectedVolume, expectedStreak] = await page.evaluate(() => [
      computeTotalSeconds(), computeTotalVolume(), computeWeekStreak(),
    ]);

    await page.locator('.tab-btn[data-tab="stats"]').click();
    const cards = page.locator('.stat-card');
    await expect(cards.nth(0).locator('.stat-value')).toHaveText(await page.evaluate((s) => formatDuration(s), expectedSeconds));
    await expect(cards.nth(1).locator('.stat-value')).toHaveText(`${expectedStreak}${expectedStreak === 1 ? 'week' : 'weeks'}`);
    await expect(cards.nth(2).locator('.stat-value')).toHaveText(`${expectedVolume.toLocaleString()}lbs`);
  });

  test('shows an empty state with no sessions logged', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="stats"]').click();
    await expect(page.locator('#statsList .empty-state')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(0);
  });
});
