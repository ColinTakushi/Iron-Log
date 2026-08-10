const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal, daysFromToday } = require('../support/fixtures');

test.describe('editing an already-saved session from history', () => {
  test('opening it for edit shows its recorded duration and does not start a live-ticking timer', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: todayLocal(), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 2725, // 45:25
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();
    await page.locator('.h-edit').click();

    await expect(page.locator('#logTitle')).toHaveText('Upper A');
    await expect(page.locator('#logTimer')).toHaveText('45:25');

    // no live interval should be running: the displayed value must not change over time
    await page.waitForTimeout(2200);
    await expect(page.locator('#logTimer')).toHaveText('45:25');

    const timerIntervalIsNull = await page.evaluate(() => timerInterval === null);
    expect(timerIntervalIsNull).toBe(true);
  });

  test('finishing without touching duration preserves the original recorded duration', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: todayLocal(), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 1800,
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();
    await page.locator('.h-edit').click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('145');
    await page.locator('#finishBtn').click();

    await expect(page.locator('#summaryDuration')).toHaveText('30m');
    await page.locator('#summaryDoneBtn').click();
  });

  test('editing the duration field while editing history saves exactly that value, not a live-elapsed one', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: todayLocal(), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 1800,
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();
    await page.locator('.h-edit').click();

    await page.locator('#logTimer').click();
    await expect(page.locator('#editDurationInput')).toHaveValue('30');
    await page.locator('#editDurationInput').fill('50');
    await page.locator('#editDetailsApplyBtn').click();
    await expect(page.locator('#logTimer')).toHaveText('50:00');

    await page.locator('#finishBtn').click();
    await expect(page.locator('#summaryDuration')).toHaveText('50m');
  });

  test('editing a session updates PRs and stats immediately, not just on next tab visit', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: daysFromToday(-1), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 1800,
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();
    await page.locator('.h-edit').click();

    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await firstRow.locator('input[data-field="weight"]').fill('185');
    await firstRow.locator('input[data-field="reps"]').fill('6');
    await page.locator('#finishBtn').click();
    await page.locator('#summaryDoneBtn').click();

    await page.locator('.tab-btn[data-tab="prs"]').click();
    await expect(page.locator('.pr-item', { hasText: 'Barbell Bench Press' }).locator('.pr-weight')).toContainText('185');

    await page.locator('.tab-btn[data-tab="stats"]').click();
    await expect(page.locator('.stat-card').nth(2).locator('.stat-value')).toHaveText('1,110lbs'); // 185 * 6
  });

  test('deleting a session from history updates PRs and stats immediately', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [
        makeSession({
          date: daysFromToday(-7), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 1800,
          exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }], // 1080 volume, PR 135x8
        }),
        makeSession({
          date: todayLocal(), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 1200,
          exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 185, reps: 5 }] }], // 925 volume, PR 185x5
        }),
      ],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    // delete the more recent (heavier) session, leaving only the 135x8 one
    await page.locator('.history-item').first().locator('.h-del').click();
    await expect(page.locator('.history-item')).toHaveCount(1);

    await page.locator('.tab-btn[data-tab="prs"]').click();
    await expect(page.locator('.pr-item', { hasText: 'Barbell Bench Press' }).locator('.pr-weight')).toContainText('135');

    await page.locator('.tab-btn[data-tab="stats"]').click();
    await expect(page.locator('.stat-card').nth(2).locator('.stat-value')).toHaveText('1,080lbs');
  });
});
