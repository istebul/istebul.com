import { test, expect } from '@playwright/test';

const waitForAppReady = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('nav.navbar', { timeout: 15000 });
  await page.waitForSelector('main', { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-ib-route'), null, {
    timeout: 15000
  });
};

const openMobileMenuIfNeeded = async (page) => {
  const navToggle = page.locator('.nav-toggle');
  if (await navToggle.isVisible().catch(() => false)) {
    await navToggle.click();
    await expect(page.locator('.nav-menu')).toHaveClass(/show/);
  }
};

test.describe('isteBul kritik kullanıcı akışları', () => {
  test('sayfa yükleme, ilanlar ve karar analizi navigasyonu çalışır', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    await expect(page).toHaveTitle(/isteBul/);
    await expect(page.getByRole('heading', { name: /Araç satın alma kararınızı/i })).toBeVisible();
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#ilanlar')).toBeHidden();

    await page.goto('/ilanlar/');
    await waitForAppReady(page);
    await expect(page).toHaveURL(/ilanlar/);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'ilanlar');
    await expect(page.locator('#ilanlar')).toBeVisible();
    await expect(page.locator('#home')).toBeHidden();

    await page.goto('/karar-asistani/');
    await waitForAppReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'page-karar-analizi');
    await page.waitForSelector('#page-karar-analizi', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#decision-assistant-form', { state: 'visible', timeout: 20000 });
  });

  test('planlar route canonical ve içerik', async ({ page }) => {
    await page.goto('/planlar/');
    await waitForAppReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'page-planlar');
    await expect(page).toHaveTitle(/Planlar/i);
    const canonical = await page.locator('#meta-canonical').getAttribute('href');
    expect(canonical).toMatch(/\/planlar\/?$/);
    await expect(page.locator('#page-planlar')).toBeVisible();
    await expect(page.locator('#home')).toBeHidden();
  });

  test('login modalı hata durumlarını kullanıcıya gösterir', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

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

  test('ilan ekleme akışı kimlik doğrulama gerektirir', async ({ page }) => {
    await page.goto('/ilan-ekle/');
    await waitForAppReady(page);

    await expect(page).toHaveURL(/ilanlar/);
    await page.waitForSelector('#auth-modal.show', { timeout: 10000 });
    await expect(page.locator('#auth-modal')).toBeVisible();
  });

  test('favoriler sayfası yüklenir', async ({ page }) => {
    await page.goto('/favoriler/');
    await waitForAppReady(page);

    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'favoriler');
    await expect(page.getByRole('heading', { name: /Favoriler/i })).toBeVisible();
    await expect(page.locator('#favoriler')).toBeVisible();
    await expect(page.locator('#home')).toBeHidden();
  });

  test('profil sayfası yüklenir', async ({ page }) => {
    await page.goto('/profil/');
    await waitForAppReady(page);

    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'profil');
    await expect(page.getByRole('heading', { name: /Hesabım/i })).toBeVisible();
    await expect(page.locator('#profil')).toBeVisible();
  });

  test('karar geçmişi sayfası yüklenir', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForAppReady(page);

    await expect(page.getByRole('heading', { name: /Karar geçmişi/i })).toBeVisible();
    await expect(page.locator('#history')).toBeVisible();
  });

  test('karşılaştırma sayfası yüklenir', async ({ page }) => {
    await page.goto('/karsilastir/');
    await waitForAppReady(page);

    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'compare');
    await expect(page.getByRole('heading', { name: /yan yana değerlendirin/i })).toBeVisible();
    await expect(page.locator('#compare')).toBeVisible();
  });

  test('kategori navigasyonu ve karar formu', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await expect(page.locator('.hero-actions')).toBeVisible();

    await page.goto('/karar-analizi/');
    await waitForAppReady(page);
    await page.waitForSelector('#decision-assistant-form', { state: 'visible', timeout: 20000 });
  });

  test('responsive tasarım - mobil görünüm', async ({ browser }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const page = await mobileContext.newPage();

    await page.goto('/');
    await waitForAppReady(page);
    await expect(page.getByRole('heading', { name: /Araç satın alma/i })).toBeVisible();

    const navToggle = page.locator('.nav-toggle');
    if (await navToggle.isVisible().catch(() => false)) {
      await navToggle.click();
      await expect(page.locator('.nav-menu')).toHaveClass(/show/);
    }

    await mobileContext.close();
  });

  test('theme toggle koyu/açık mod arasında geçiş yapıyor', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const themeToggle = page.locator('#theme-toggle');
    await expect(themeToggle).toBeVisible();

    const theme = await page.evaluate(() => document.documentElement.dataset.theme);

    await themeToggle.click();
    await page.waitForFunction(
      (initialTheme) => document.documentElement.dataset.theme !== initialTheme,
      theme,
      { timeout: 10000 }
    );

    const newTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(newTheme).not.toBe(theme);
  });

  test('ilanlar sayfası ve geri navigasyon', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.goto('/ilanlar/');
    await page.waitForSelector('#ilanlar', { state: 'visible', timeout: 15000 });
    await expect(page).toHaveURL(/ilanlar/);

    await page.goBack();
    await waitForAppReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'home');
  });

  test('karar asistanı sihirbazı ilerler', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForAppReady(page);
    await page.waitForSelector('#decision-assistant-form', { state: 'visible', timeout: 20000 });

    const radioOption = page.locator('#decision-assistant-form input[type="radio"]').first();
    if (await radioOption.count() > 0) {
      await radioOption.check();
    } else {
      const select = page.locator('#decision-assistant-form select').first();
      if (await select.count() > 0) {
        await select.selectOption({ index: 1 });
      }
    }

    const nextButton = page.locator('button[data-assistant-next]').first();
    if (await nextButton.count() > 0) {
      await nextButton.click();
      await expect(page.locator('button[data-assistant-prev]')).toBeVisible();
    }
  });
});
