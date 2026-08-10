const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal, daysFromToday } = require('../support/fixtures');

test.describe('history: edit and delete', () => {
  test('editing a session from history updates it and the change is reflected everywhere', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: today, dayKey: 'upperA', dayLabel: 'Upper A',
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    const item = page.locator('.history-item').first();
    await expect(item.locator('.h-sets')).toHaveText('135x8');
    await item.locator('.h-edit').click();

    await expect(page.locator('#logTitle')).toHaveText('Upper A');
    const firstRow = page.locator('.exercise-card').first().locator('.set-row').first();
    await expect(firstRow.locator('input[data-field="weight"]')).toHaveValue('135');
    await expect(firstRow.locator('.check')).toHaveClass(/done/);

    await firstRow.locator('input[data-field="weight"]').fill('145');
    await page.locator('#finishBtn').click();
    await expect(page.locator('#summaryBackdrop')).toBeVisible();
    await page.locator('#summaryDoneBtn').click();

    await page.locator('.tab-btn[data-tab="history"]').click();
    await expect(page.locator('.history-item')).toHaveCount(1);
    await expect(page.locator('.history-item').first().locator('.h-sets')).toHaveText('145x8');
  });

  test('deleting a session removes it from history, calendar, and PRs', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: today, dayKey: 'upperA', dayLabel: 'Upper A',
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();
    await expect(page.locator('.history-item')).toHaveCount(1);

    await page.locator('.h-del').click();
    await expect(page.locator('.history-item')).toHaveCount(0);
    await expect(page.locator('#historyList .empty-state')).toBeVisible();

    await page.locator('.tab-btn[data-tab="calendar"]').click();
    await expect(page.locator('.cal-cell.today')).not.toHaveClass(/logged/);

    await page.locator('.tab-btn[data-tab="prs"]').click();
    await expect(page.locator('.pr-item', { hasText: 'Barbell Bench Press' })).toHaveCount(0);
  });

  test('history lists sessions most-recent first', async ({ page }) => {
    const today = todayLocal();
    const yesterday = daysFromToday(-1);
    await seedLocalStorage(page, emptyData({
      sessions: [
        makeSession({ date: yesterday, dayKey: 'lowerA', dayLabel: 'Lower A', exercises: [{ name: 'Back Squat', sets: [{ weight: 185, reps: 6 }] }] }),
        makeSession({ date: today, dayKey: 'upperA', dayLabel: 'Upper A', exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] }),
      ],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    const items = page.locator('.history-item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0).locator('.h-day')).toHaveText('Upper A');
    await expect(items.nth(1).locator('.h-day')).toHaveText('Lower A');
  });

  test('the card shows the workout duration alongside its date', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: todayLocal(), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 3625, // 1h 0m
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    await expect(page.locator('.history-item').first().locator('.h-date')).toContainText('1h 0m');
  });

  test('older sessions with no tracked duration show no duration on the card', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({
        date: todayLocal(), dayKey: 'upperA', dayLabel: 'Upper A', durationSeconds: 0,
        exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }],
      })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="history"]').click();

    await expect(page.locator('.history-item').first().locator('.h-date .mono')).toHaveCount(0);
  });
});
