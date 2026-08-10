const { test, expect } = require('@playwright/test');
const { seedLocalStorage, emptyData, makeSession, todayLocal } = require('../support/fixtures');

// iPhone 13-ish viewport: this app is used one-handed, mid-workout, on a phone.
test.use({ viewport: { width: 390, height: 844 } });

async function hasNoHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

// Searches the page's own <style> rules (not computed style, which resolves
// env() to a px value) so this asserts the source CSS still uses the
// safe-area formula rather than a hardcoded/removed one.
async function ruleUsesSafeAreaInsetTop(page, selectorSubstring) {
  return page.evaluate((sel) => {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const rule of rules) {
        if (rule.selectorText && rule.selectorText.includes(sel) && rule.cssText.includes('env(safe-area-inset-top)')) {
          return true;
        }
      }
    }
    return false;
  }, selectorSubstring);
}

test.describe('layout at mobile viewport', () => {
  test('no horizontal overflow on any tab', async ({ page }) => {
    await seedLocalStorage(page, emptyData({
      sessions: [makeSession({ date: todayLocal(), exercises: [{ name: 'Barbell Bench Press', sets: [{ weight: 135, reps: 8 }] }] })],
    }));
    await page.goto('/');

    for (const tab of ['calendar', 'history', 'prs', 'stats', 'data']) {
      await page.locator(`.tab-btn[data-tab="${tab}"]`).click();
      expect(await hasNoHorizontalOverflow(page), `overflow on ${tab} tab`).toBe(true);
    }
  });

  test('no horizontal overflow in the log view', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');
    await page.locator('.cal-cell.today').click();
    await page.locator('.workout-option', { hasText: 'Upper A' }).click();
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
  });

  test('sticky headers bake safe-area-inset-top into their own padding, not the body', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');

    expect(await ruleUsesSafeAreaInsetTop(page, 'header.topbar')).toBe(true);
    expect(await ruleUsesSafeAreaInsetTop(page, '.sticky-log-header')).toBe(true);

    const bodyHasPaddingTop = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; }
        for (const rule of rules) {
          if (rule.selectorText === 'body' && rule.cssText.includes('padding-top')) return true;
        }
      }
      return false;
    });
    expect(bodyHasPaddingTop).toBe(false);
  });

  test('sheets are hidden by default and toggle visibility via the .show class', async ({ page }) => {
    await seedLocalStorage(page, emptyData());
    await page.goto('/');

    const backdrop = page.locator('#pickerBackdrop');
    await expect(backdrop).toBeHidden();

    await page.locator('.cal-cell.today').click();
    await expect(backdrop).toBeVisible();

    await page.locator('#pickerCancel').click();
    await expect(backdrop).toBeHidden();
  });
});
