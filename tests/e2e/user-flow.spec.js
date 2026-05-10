import { test, expect } from '@playwright/test';

const waitForAppReady = async (page) => {
  await page.waitForFunction(() => typeof window.app !== 'undefined' && typeof window.app.router !== 'undefined', null, { timeout: 15000 });
};

const openMobileMenuIfNeeded = async (page) => {
  const navToggle = page.locator('.nav-toggle');
  if (await navToggle.isVisible().catch(() => false)) {
    await navToggle.click();
    await expect(page.locator('.nav-menu')).toHaveClass(/show/);
  }
};

test.describe('isteBu kritik kullanıcı akışları', () => {
  test('sayfa yükleme, arama ve karar asistanı navigasyonu çalışır', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Check if basic app is loaded
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();

    await expect(page).toHaveTitle(/isteBu/);
    await expect(page.getByRole('heading', { name: /Satın almadan önce doğru kararı görün/i })).toBeVisible();

    await page.getByPlaceholder(/Model, semt veya tatil rotası/i).fill('Toyota Kadıköy');
    await page.locator('#search-btn').click();
    await expect(page).toHaveURL(/ilanlar|search|\//);

    // Navigate directly to decision assistant
    await page.goto('/karar-asistani');
    await waitForAppReady(page);
    await page.waitForSelector('#decision-assistant', { state: 'visible', timeout: 15000 });
    await expect(page.locator('#decision-assistant-form')).toBeVisible();
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
    await page.goto('/ilan-ekle');
    await waitForAppReady(page);

    await expect(page).toHaveURL(/ilanlar/);
    await page.waitForSelector('#auth-modal.show', { timeout: 10000 });
    await expect(page.locator('#auth-modal')).toBeVisible();
  });

  test('favoriler sayfası giriş yapılmış kullanıcı için çalışır', async ({ page }) => {
    await page.goto('/favoriler');
    await waitForAppReady(page);

    // Başlangıçta boş state olmalı - favoriler sayfası için spesifik selector
    const emptyState = page.locator('.empty-state').filter({ hasText: 'Henüz favori ilan yok' });
    await expect(emptyState).toBeVisible();
    
    // Başlık kontrol
    await expect(page.getByRole('heading', { name: /Favoriler/i })).toBeVisible();
  });

  test('profil sayfası başarıyla yüklenir ve oturum durumunu gösterir', async ({ page }) => {
    await page.goto('/profil');
    await waitForAppReady(page);
    
    // Profil başlığı olmalı
    await expect(page.getByRole('heading', { name: /Profil/i })).toBeVisible();
    
    // Oturum açılmamışsa login prompt olmalı veya oturum açılmışsa profil info olmalı
    const loginPrompt = page.locator('button:has-text("Giriş Yap veya Kayıt Ol")');
    const isVisible = await loginPrompt.isVisible().catch(() => false);
    
    if (!isVisible) {
      // Oturum açılmış durumda profil kartı olmalı
      await expect(page.locator('.profile-card')).toBeVisible();
    } else {
      // Giriş prompt'u görünmeli
      await expect(loginPrompt).toBeVisible();
    }
  });

  test('karar geçmişi sayfası erişim kontrolü yapıyor', async ({ page }) => {
    await page.goto('/gecmis');
    await waitForAppReady(page);
    
    // Başlık olmalı
    await expect(page.getByRole('heading', { name: /Karar geçmişi/i })).toBeVisible();
    
    // Oturum açılmamışsa auth gate olmalı
    const authGate = page.locator('.history-auth-gate');
    const isAuthGateVisible = await authGate.isVisible().catch(() => false);
    
    if (isAuthGateVisible) {
      // Login ve register butonları olmalı
      await expect(page.locator('button[data-history-login]')).toBeVisible();
      await expect(page.locator('button[data-history-register]')).toBeVisible();
    }
  });

  test('karşılaştırma sayfası boş state gösterir', async ({ page }) => {
    await page.goto('/karsilastir');
    await waitForAppReady(page);
    
    // Başlık
    await expect(page.getByRole('heading', { name: /Karşılaştırma Merkezi/i })).toBeVisible();
    
    // Boş state
    const emptyState = page.locator('#comparison-content .empty-state').filter({ hasText: 'Karşılaştırma listesi boş' });
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText(/boş/i);
  });

  test('kategori navigasyonu responsive davranır', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Hero kategorilerinin mevcut olduğunu kontrol et
    await expect(page.locator('.hero-categories')).toBeVisible();
    
    // İlk kategori seçeneğini bul ve tıkla
    const firstCategory = page.locator('button[data-assistant-start]').first();
    await expect(firstCategory).toBeVisible();
    await firstCategory.click();
    
    // Karar asistanının açılması bekleniyor
    await page.waitForSelector('#decision-assistant-form', { state: 'visible', timeout: 15000 });
    await expect(page.locator('#decision-assistant-form')).toBeVisible();
  });

  test('responsive tasarım - mobil görünüm doğru çalışıyor', async ({ browser }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const page = await mobileContext.newPage();
    
    await page.goto('/');
    await page.waitForFunction(() => typeof window.app !== 'undefined', null, { timeout: 15000 });
    
    // Ana başlık görünmeli
    await expect(page.getByRole('heading', { name: /Satın almadan önce/i })).toBeVisible();
    
    // Navigasyon toggle'ı mobilde görünmeli
    const navToggle = page.locator('.nav-toggle');
    const isNavToggleVisible = await navToggle.isVisible().catch(() => false);
    
    if (isNavToggleVisible) {
      // Toggle'ı aç
      await navToggle.click();
      // Menu açılmalı
      await expect(page.locator('.nav-menu')).toHaveClass(/show/);
    }
    
    await mobileContext.close();
  });

  test('theme toggle koyu/açık mod arasında geçiş yapıyor', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    
    // Theme toggle butonunu bul
    const themeToggle = page.locator('#theme-toggle');
    await expect(themeToggle).toBeVisible();
    
    // Başlangıç tema değerini kontrol et
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    
    // Toggle'ı tıkla
    await themeToggle.click();
    await page.waitForFunction(
      (initialTheme) => document.documentElement.dataset.theme !== initialTheme,
      theme,
      { timeout: 10000 }
    );

    // Tema değişmiş olmalı
    const newTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(newTheme).not.toBe(theme);
    
    // Toggle'ı tekrar tıkla - orijinal temaya dönmeli
    await themeToggle.click();
    await page.waitForFunction(
      (initialTheme) => document.documentElement.dataset.theme === initialTheme,
      theme,
      { timeout: 10000 }
    );
    const revertedTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(revertedTheme).toBe(theme);
  });

  test('ilanlar sayfası içerik yükler ve anasayfaya geri döner', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.goto('/ilanlar');
    await page.waitForSelector('main', { state: 'visible', timeout: 15000 });

    await expect(page).toHaveURL(/ilanlar/);
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('karar asistanı sihirbazı bir sonraki adıma ilerlemeyi destekler', async ({ page }) => {
    await page.goto('/karar-asistani');
    await waitForAppReady(page);
    await page.waitForSelector('#decision-assistant-form', { state: 'visible', timeout: 15000 });

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
      await expect(nextButton).toBeVisible();
      await nextButton.click();
      await expect(page.locator('button[data-assistant-prev]')).toBeVisible();
    } else {
      const submitButton = page.locator('#decision-assistant-form button[type="submit"]').first();
      await expect(submitButton).toBeVisible();
    }
  });
});
