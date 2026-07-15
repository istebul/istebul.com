import { test, expect } from '@playwright/test';

const waitForAppReady = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('nav.navbar', { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-ib-route'), null, {
    timeout: 15000
  });
};

test.describe('Marketing shell (Platform + AI)', () => {
  test('Platform Landing root shows platform surface (not AI long-scroll)', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('istebul_locale', 'tr');
      } catch {
        // ignore
      }
    });
    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'home');
    await expect(page.locator('#platform-landing')).toBeVisible();
    await expect(page.locator('#neden-istebul')).toBeVisible();
    await expect(page.locator('#hero-v4-title')).toHaveCount(0);
    await expect(page.locator('#pricing')).toHaveCount(0);
    await expect(page.locator('#landing-faq')).toHaveCount(0);
    await expect(page.locator('#ilanlar')).toBeHidden();
    await expect(page.getByRole('link', { name: /İSTEBUL AI|AI/i }).first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test('AI Landing /ai/ shows AI homepage sections', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('istebul_locale', 'tr');
      } catch {
        // ignore
      }
    });
    await page.goto('/ai/');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: /yalnız değilsiniz/i })).toBeVisible();
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#pricing')).toBeVisible();
    await expect(page.locator('#landing-faq')).toBeVisible();
    await expect(page.getByRole('link', { name: /Ön değerlendirme/i }).first()).toBeVisible();
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
