import { test, expect } from '@playwright/test';

const waitForPlatformReady = async (page, { requireLanding = true } = {}) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('nav.navbar', { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-ib-route'), null, {
    timeout: 15000
  });
  if (requireLanding) {
    await page.waitForFunction(() => {
      const section = document.getElementById('platform-landing');
      const mount = document.getElementById('platform-landing-mount');
      return (
        section?.getAttribute('data-platform-landing-ready') === '1' ||
        mount?.getAttribute('data-platform-landing-mounted') === '1'
      );
    }, null, { timeout: 20000 });
  }
};

const waitForAiLandingReady = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#hero-v4-title', { timeout: 15000 });
  await page.waitForSelector('nav.seo-nav', { timeout: 15000 });
};

const forceTurkishLocale = async (page) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('istebul_locale', 'tr');
    } catch {
      // ignore
    }
  });
};

const clickPlatformProductCta = async (page, productId) => {
  const cta = page.locator(`[data-platform-product-id="${productId}"][data-platform-cta]`);
  await expect(cta).toBeVisible({ timeout: 15000 });
  await Promise.all([
    page.waitForURL((url) => {
      const path = url.pathname.replace(/\/$/, '') || '/';
      if (productId === 'istebul-ai') return path === '/ai';
      if (productId === 'garsonai') return path === '/garson';
      if (productId === 'business') return path === '/business';
      return false;
    }, { timeout: 20000 }),
    cta.click()
  ]);
};

test.describe('Marketing shell (Platform + AI)', () => {
  test('Platform Landing root shows platform surface (not AI long-scroll)', async ({ page }) => {
    await forceTurkishLocale(page);
    await page.goto('/');
    await waitForPlatformReady(page);

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
    await forceTurkishLocale(page);
    await page.goto('/ai/');
    await waitForAiLandingReady(page);

    await expect(page.getByRole('heading', { name: /yalnız değilsiniz/i })).toBeVisible();
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#pricing')).toBeVisible();
    await expect(page.locator('#landing-faq')).toBeVisible();
    await expect(page.getByRole('link', { name: /Ön değerlendirme/i }).first()).toBeVisible();
  });

  test('/giris?return= auth modalı ve return yakalama', async ({ page }) => {
    await page.goto('/giris?return=%2Fauto%2F');
    await waitForPlatformReady(page, { requireLanding: false });

    await expect(page.locator('#auth-modal.show')).toBeVisible();
    await expect(page.locator('#auth-modal input[type="email"]')).toBeVisible();
  });

  test('giriş modalı açılır', async ({ page }) => {
    await page.goto('/');
    await waitForPlatformReady(page);

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

test.describe('EPIC-003 Platform production history + product entries', () => {
  test('AI card → /ai → Back → / → Forward → /ai → Refresh → /ai → CTA Karar Asistanı', async ({
    page
  }) => {
    await forceTurkishLocale(page);
    await page.goto('/');
    await waitForPlatformReady(page);

    await clickPlatformProductCta(page, 'istebul-ai');
    await waitForAiLandingReady(page);
    await expect(page).toHaveURL(/\/ai\/?$/);
    await expect(page.locator('#platform-landing')).toHaveCount(0);
    await expect(page.locator('#hero-v4-title')).toBeVisible();

    await page.goBack();
    await waitForPlatformReady(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#platform-landing')).toBeVisible();
    await expect(page.locator('#hero-v4-title')).toHaveCount(0);

    await page.goForward();
    await waitForAiLandingReady(page);
    await expect(page).toHaveURL(/\/ai\/?$/);

    await page.reload();
    await waitForAiLandingReady(page);
    await expect(page).toHaveURL(/\/ai\/?$/);
    await expect(page.locator('#hero-v4-title')).toBeVisible();

    const decisionCta = page.locator('[data-hero-cta-primary], a[href="/karar-asistani/"]').first();
    await expect(decisionCta).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/karar-asistani\/?/, { timeout: 20000 }),
      decisionCta.click()
    ]);
  });

  test('Garson card → /garson → Back → Platform Landing', async ({ page }) => {
    await forceTurkishLocale(page);
    await page.goto('/');
    await waitForPlatformReady(page);

    await clickPlatformProductCta(page, 'garsonai');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/garson\/?/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goBack();
    await waitForPlatformReady(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#platform-landing')).toBeVisible();
    await expect(page.locator('#hero-v4-title')).toHaveCount(0);
  });

  test('Business card → /business → Back → Platform Landing', async ({ page }) => {
    await forceTurkishLocale(page);
    await page.goto('/');
    await waitForPlatformReady(page);

    await clickPlatformProductCta(page, 'business');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/business\/?/);

    await page.goBack();
    await waitForPlatformReady(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#platform-landing')).toBeVisible();
  });

  test('deep links /ai#pricing and /ai/#landing-faq resolve on AI Landing', async ({ page }) => {
    await forceTurkishLocale(page);

    await page.goto('/ai/#pricing');
    await waitForAiLandingReady(page);
    await expect(page.locator('#pricing')).toBeVisible();

    await page.goto('/ai/#landing-faq');
    await waitForAiLandingReady(page);
    await expect(page.locator('#landing-faq')).toBeVisible();
  });

  test('stale Platform root AI hashes redirect to /ai/', async ({ page }) => {
    await forceTurkishLocale(page);
    await page.goto('/#pricing');
    await page.waitForURL(/\/ai\/?#pricing/, { timeout: 15000 });
    await waitForAiLandingReady(page);
    await expect(page.locator('#pricing')).toBeVisible();
  });
});
