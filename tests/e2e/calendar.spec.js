const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal } = require('../support/fixtures');

// Every scenario here anchors on "today" specifically to stay correct
// regardless of which real calendar day/month CI happens to run on.
test.describe('calendar view', () => {
  test('highlights today and opens the workout picker with the recommended day', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');

    const todayCell = page.locator('.cal-cell.today');
    await expect(todayCell).toHaveCount(1);
    await expect(todayCell.locator('.cal-daynum')).toHaveText(String(new Date().getDate()));

    await todayCell.click();
    await expect(page.locator('#pickerBackdrop')).toBeVisible();
    // no sessions logged yet -> DAY_ORDER[0] (Upper A) is recommended
    const recommended = page.locator('.workout-option.recommended');
    await expect(recommended).toHaveCount(1);
    await expect(recommended.locator('.wo-name')).toHaveText('Upper A');
    await expect(recommended.locator('.wo-badge')).toHaveText('Next Up');
  });

  test('choosing a workout from the picker opens the log view for that day', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Lower A' }).click();

    await expect(page.locator('#pickerBackdrop')).toBeHidden();
    await expect(page.locator('#view-log')).toHaveClass(/active/);
    await expect(page.locator('#logTitle')).toHaveText('Lower A');
  });

  test('a session logged for today shows the .logged class and day code', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: today, dayKey: 'lowerB', dayLabel: 'Lower B', exercises: [{ name: 'Conventional Deadlift', sets: [{ weight: 225, reps: 5 }] }] })],
    }));
    await page.goto('/');

    const todayCell = page.locator('.cal-cell.today');
    await expect(todayCell).toHaveClass(/logged/);
    await expect(todayCell.locator('.cal-code')).toHaveText('LOW B');

    // tapping a logged date opens that session directly, skipping the picker
    await todayCell.click();
    await expect(page.locator('#pickerBackdrop')).toBeHidden();
    await expect(page.locator('#logTitle')).toHaveText('Lower B');
  });

  test('a draft for today shows .in-progress and resumes directly on tap (no picker)', async ({ page }) => {
    const today = todayLocal();
    await seedLocalStorage(page, emptyData({
      drafts: { [today]: { dayKey: 'upperB', sessionData: {}, timerStart: Date.now() } },
    }));
    await page.goto('/');

    const todayCell = page.locator('.cal-cell.today');
    await expect(todayCell).toHaveClass(/in-progress/);
    await expect(todayCell.locator('.cal-code')).toHaveText('UP B…');

    await todayCell.click();
    await expect(page.locator('#pickerBackdrop')).toBeHidden();
    await expect(page.locator('#view-log')).toHaveClass(/active/);
    await expect(page.locator('#logTitle')).toHaveText('Upper B');
  });

  test('month navigation updates the header label and is reversible', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');

    const label = page.locator('#calMonthLabel');
    const original = await label.textContent();

    await page.locator('#nextMonth').click();
    await expect(label).not.toHaveText(original || '');

    await page.locator('#prevMonth').click();
    await expect(label).toHaveText(original || '');
  });
});
