import { test, expect } from '@playwright/test';

const waitForSpaReady = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#main-nav.navbar', { timeout: 15000 });
  await page.waitForSelector('main', { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-ib-route'), null, {
    timeout: 15000
  });
};

const dismissCookieBanner = async (page) => {
  const accept = page.locator('[data-cookie-accept]');
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
};

const openMobileMenuIfNeeded = async (page) => {
  const navToggle = page.locator('.nav-toggle');
  if (await navToggle.isVisible().catch(() => false)) {
    await navToggle.click();
    await expect(page.locator('.nav-menu')).toHaveClass(/show/);
  }
};

test.describe('isteBul kritik kullanıcı akışları', () => {
  test('ana sayfa ve seçenekler hub yüklenir', async ({ page }) => {
    await page.goto('/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#main-nav')).toBeVisible();
    await expect(page).toHaveTitle(/isteBul/);
    await expect(page.locator('#hero-v4-title')).toContainText(/yalnız değilsiniz|not alone/i);
    await expect(page.locator('#home')).toBeVisible();

    await page.goto('/secenekler/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Seçenek|isteBul/i);
    await expect(page.locator('main.seo-main, .seo-main')).toBeVisible();

    await page.goto('/karar-asistani/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Karar|isteBul/i);
    await expect(page.locator('main, .seo-main')).toBeVisible();
  });

  test('planlar hub sayfası yüklenir', async ({ page }) => {
    await page.goto('/planlar/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Planlar/i);
    await expect(page.locator('main.seo-main')).toBeVisible();
    await expect(page.locator('.seo-page')).toBeVisible();
  });

  test('login modalı hata durumlarını kullanıcıya gösterir', async ({ page }) => {
    await page.goto('/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    const navToggle = page.locator('.nav-toggle');
    if (await navToggle.isVisible().catch(() => false)) {
      await openMobileMenuIfNeeded(page);
      await page.locator('[data-mobile-login]').click();
    } else {
      await page.locator('#login-btn').click();
    }

    await page.waitForSelector('#auth-modal.show', { timeout: 10000 });
    await expect(page.locator('#auth-modal')).toBeVisible();
    await page.locator('#auth-modal input[type="email"]').fill('hatali@example.com');
    await page.locator('#auth-modal input[type="password"]').fill('wrong-password');
    await page.locator('#auth-modal button[type="submit"]').click();

    await expect(page.locator('#auth-modal')).toBeVisible();
  });

  test('seçenek gönderme akışı kimlik doğrulama gerektirir', async ({ page }) => {
    await page.goto('/ilan-ekle/');
    await waitForSpaReady(page);

    await expect(page).toHaveURL(/secenekler|ilanlar/);
    await page.waitForSelector('#auth-modal.show', { timeout: 10000 });
    await expect(page.locator('#auth-modal')).toBeVisible();
  });

  test('profil sayfası (giriş yapılmamış) yüklenir', async ({ page }) => {
    await page.goto('/profil/');
    await waitForSpaReady(page);

    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'profil');
    await expect(page.locator('#profil')).toBeVisible();
    await expect(page.locator('#account-root')).toContainText(/Karar Merkezi/i);
    await expect(page.locator('#account-root').getByRole('button', { name: /Hesabına gir/i }).first()).toBeVisible();
  });

  test('favoriler sayfası yüklenir', async ({ page }) => {
    await page.goto('/favoriler/');
    await waitForSpaReady(page);

    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'favoriler');
    await expect(page.getByRole('heading', { name: /Favoriler/i })).toBeVisible();
    await expect(page.locator('#favoriler')).toBeVisible();
  });

  test('karar geçmişi sayfası yüklenir', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);

    await expect(page.getByRole('heading', { name: /Karar geçmişi/i })).toBeVisible();
    await expect(page.locator('#history')).toBeVisible();
  });

  test('karşılaştırma hub sayfası yüklenir', async ({ page }) => {
    await page.goto('/karsilastir/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Karşılaştır|isteBul/i);
    await expect(page.locator('main, .seo-main')).toBeVisible();
  });

  test('auto kategori sayfası yüklenir', async ({ page }) => {
    await page.goto('/auto/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[data-auto-hero-cta]')).toBeVisible();
  });

  test('responsive tasarım - mobil görünüm', async ({ browser }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'tr-TR'
    });
    const page = await mobileContext.newPage();

    await page.goto('/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await expect(page.locator('#hero-v4-title')).toContainText(/yalnız değilsiniz/i);

    const navToggle = page.locator('.nav-toggle');
    if (await navToggle.isVisible().catch(() => false)) {
      await navToggle.click();
      await expect(page.locator('.nav-menu')).toHaveClass(/show/);
    }

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(overflow).toBe(false);

    await mobileContext.close();
  });

  test('secenekler hub ve ana sayfa geri navigasyon', async ({ page }) => {
    await page.goto('/');
    await waitForSpaReady(page);
    await page.goto('/secenekler/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/Seçenek|isteBul/i);

    await page.goto('/');
    await waitForSpaReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'home');
  });

  test('karar asistanı hub sayfası erişilebilir', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await expect(page).toHaveTitle(/Karar|isteBul/i);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'page-karar-analizi');
    await expect(page.getByRole('heading', { name: /Hangi kategoride karar vermek istiyorsunuz/i })).toBeVisible();
    await expect(page.locator('#page-karar-analizi')).toBeVisible();
    await expect(page.locator('#assistant-category-rail .assistant-category').first()).toBeVisible();
  });
});
