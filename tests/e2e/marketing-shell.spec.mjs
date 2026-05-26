import { test, expect } from '@playwright/test';

const waitForAppReady = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('nav.navbar', { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-ib-route'), null, {
    timeout: 15000
  });
};

test.describe('Marketing shell (anon landing)', () => {
  test('ana sayfa yalnızca landing bölümlerini gösterir', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'home');
    await expect(page.getByRole('heading', { name: /Pahalı bir araç hatasından/i })).toBeVisible();
    await expect(page.locator('#ilanlar')).toBeHidden();
    await expect(page.locator('#pricing')).toBeVisible();
    await expect(page.locator('#sample-preview')).toBeVisible();
    await expect(page.locator('#home-auto-bridge')).toBeVisible();
    await expect(page.locator('#landing-faq')).toBeVisible();
    await expect(page.getByRole('link', { name: /TCO analizini başlat/i }).first()).toBeVisible();
  });

  test('/giris?return= auth modalı ve return yakalama', async ({ page }) => {
    await page.goto('/giris?return=%2Fauto%2F');
    await waitForAppReady(page);

    await expect(page.locator('#auth-modal.show')).toBeVisible();
    await expect(page.locator('#auth-modal input[type="email"]')).toBeVisible();
  });

  test('giriş modalı açılır', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const loginBtn = page.locator('#login-btn');
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
    } else {
      await page.locator('.nav-toggle').click();
      await page.locator('[data-mobile-login]').click();
    }

    await expect(page.locator('#auth-modal.show')).toBeVisible();
    await expect(page.locator('#auth-modal input[type="email"]')).toBeVisible();
  });
});
