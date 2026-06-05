import { test, expect } from '@playwright/test';

const waitForTatilReady = async (page) => {
  await page.goto('/tatil/');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#vacation-wizard')).toBeVisible({ timeout: 20000 });
};

/** Minimal wizard path to reach results. */
const completeTatilWizard = async (page) => {
  await page.locator('[data-field="vacation_goal"][data-value="deniz"]').click();
  await page.locator('#vacation-next').click();

  await page.locator('[data-field="budget_range"][data-value="dengeli"]').click();
  await page.locator('#vacation-next').click();

  await page.locator('[data-field="people_type"][data-value="cift"]').click();
  await page.locator('#vacation-next').click();

  await page.locator('[data-field="vacation_type"][data-value="deniz-resort"]').click();
  await page.locator('#vacation-next').click();

  await page.locator('[data-field="date_flexibility"][data-value="net"]').click();
  await page.locator('#vacation-next').click();

  await page.locator('[data-field="transport_preference"][data-value="ucak"]').click();
  await page.locator('#vacation-next').click();

  await page.locator('[data-field="comfort_expectation"][data-value="dengeli"]').click();
  await page.locator('#vacation-next').click();

  await page.locator('#vacation-next').click();
};

test.describe('Tatil wizard → V2 results', () => {
  test('wizard completes and mounts Tatil V2 panel', async ({ page }) => {
    await waitForTatilReady(page);
    await completeTatilWizard(page);

    await expect(page.locator('.tatil-v2-root')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.tatil-v2-panel')).toBeVisible();
    await expect(page.locator('.tatil-v2-actions [data-tatil-v2-pdf]')).toBeVisible();
    await expect(page.locator('.tatil-v2-actions [data-tatil-v2-restart]')).toBeVisible();
    await expect(page.locator('.tatil-v2-actions [data-tatil-v2-partner]')).toBeVisible();
  });

  test('legacy duplicate panels are suppressed when V2 is mounted', async ({ page }) => {
    await waitForTatilReady(page);
    await completeTatilWizard(page);
    await expect(page.locator('.tatil-v2-root')).toBeVisible({ timeout: 20000 });

    const legacyDashboard = page.locator('#vacation-results .ib-premium-dashboard');
    const legacyCards = page.locator('#vacation-results .vacation-result-cards');
    await expect(legacyDashboard).toHaveCount(1);
    await expect(legacyCards).toHaveCount(1);
    await expect(legacyDashboard).toBeHidden();
    await expect(legacyCards).toBeHidden();
  });

  test('last wizard step shows loading label then results', async ({ page }) => {
    await waitForTatilReady(page);

    for (let i = 0; i < 7; i += 1) {
      const field = page.locator('[data-field]').first();
      if (await field.isVisible().catch(() => false)) {
        await field.click();
      }
      const next = page.locator('#vacation-next');
      if (i === 6) {
        await next.click();
        await expect(next).toContainText(/Hazırlanıyor/i, { timeout: 3000 }).catch(() => {});
      } else {
        await next.click();
      }
    }

    await expect(page.locator('.tatil-v2-root')).toBeVisible({ timeout: 20000 });
  });
});
