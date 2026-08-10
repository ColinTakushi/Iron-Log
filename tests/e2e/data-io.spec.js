const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal } = require('../support/fixtures');

test.describe('data export/import', () => {
  test('export downloads a JSON file with the documented shape', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
      customExerciseHistory: ['Smith Machine Bench Press'],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="data"]').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#saveFileBtn').click(),
    ]);
    expect(download.suggestedFilename()).toBe('iron-log-data.json');

    const filePath = await download.path();
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.version).toBe(1);
    expect(typeof content.exportedAt).toBe('string');
    expect(content.sessions).toHaveLength(1);
    expect(content.customExerciseHistory).toContain('Smith Machine Bench Press');

    await expect(page.locator('#saveStatus')).toContainText('Saved at');
  });

  test('import restores state from a previously exported file (full round trip)', async ({ page, browser }, testInfo) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), dayKey: 'lowerA', dayLabel: 'Lower A', exercises: [{ name: 'Back Squat', sets: [{ weight: 185, reps: 5 }] }] })],
    }));
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="data"]').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#saveFileBtn').click(),
    ]);
    const savedPath = testInfo.outputPath('exported-backup.json');
    await download.saveAs(savedPath);

    // Import into a brand-new, unseeded browser context so the "before" state
    // is genuinely empty rather than whatever the export page happens to hold.
    const importContext = await browser.newContext();
    try {
      const importPage = await importContext.newPage();
      await importPage.goto('/');
      await expect(importPage.locator('.cal-cell.today')).not.toHaveClass(/logged/);

      await importPage.locator('.tab-btn[data-tab="data"]').click();
      await importPage.locator('#fileInput').setInputFiles(savedPath);

      await expect(importPage.locator('#loadStatus')).toHaveText('Loaded 1 session(s)');
      await importPage.locator('.tab-btn[data-tab="calendar"]').click();
      await expect(importPage.locator('.cal-cell.today')).toHaveClass(/logged/);
      await expect(importPage.locator('.cal-cell.today').locator('.cal-code')).toHaveText('LOW A');
    } finally {
      await importContext.close();
    }
  });

  test('importing malformed JSON shows an error without crashing the app', async ({ page }, testInfo) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.tab-btn[data-tab="data"]').click();

    const badFilePath = testInfo.outputPath('bad-backup.json');
    fs.writeFileSync(badFilePath, '{ this is not valid json');
    await page.locator('#fileInput').setInputFiles(badFilePath);

    await expect(page.locator('#loadStatus')).toHaveText('Could not read that file — is it a valid Iron Log export?');
    await page.locator('.tab-btn[data-tab="calendar"]').click();
    await expect(page.locator('#calGrid')).toBeVisible();
  });
});
