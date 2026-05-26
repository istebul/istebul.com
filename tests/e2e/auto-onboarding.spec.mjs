import { test, expect } from '@playwright/test';

const waitForAutoReady = async (page) => {
  await page.goto('/auto/');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#auto-wizard')).toBeVisible({ timeout: 15000 });
};

test.describe('Auto onboarding', () => {
  test('hero TCO mesajı ve birincil CTA', async ({ page }) => {
    await waitForAutoReady(page);

    await expect(page.getByRole('heading', { name: /Pahalı bir araç hatasından/i })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /TCO analizini başlat/i }).first()
    ).toBeVisible();
    await expect(page.locator('.auto-social-proof')).toContainText(/~2 dk/i);
  });

  test('wizard ilerleme ve ETA etiketi', async ({ page }) => {
    await waitForAutoReady(page);

    await expect(page.locator('.wizard-progress')).toBeVisible();
    await expect(page.locator('.wizard-progress-eta')).toContainText(/kaldı|Son adım/i);
    await expect(page.locator('.wizard-progress-milestones .wizard-milestone')).toHaveCount(4);
    await expect(page.locator('.wizard-question h3')).toBeVisible();
  });
});
