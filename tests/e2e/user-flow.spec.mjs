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

const MOBILE_2C_VIEWPORT = { width: 390, height: 844 };

const renderKararAsistaniSampleResult = async (page) => {
  await page.waitForSelector('#premium-karar-analizi-root #assistant-results', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('#assistant-category-rail .assistant-category', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(
    () => typeof window.app?.buildDecisionResult === 'function' && typeof window.app?.ui?.renderDecisionResults === 'function',
    null,
    { timeout: 15000 }
  );

  return page.evaluate(() => {
    const app = window.app;
    if (!app?.buildDecisionResult || !app?.ui?.renderDecisionResults) {
      return { ok: false, reason: 'assistant api not ready' };
    }

    app.assistantCategory = 'arac';
    app.assistantAnswers = {
      province: 'İstanbul',
      district: 'Kadıköy',
      carModel: 'Toyota|Corolla',
      usage: 'city',
      budget: '1850000',
      fuel: 'hybrid',
      body: 'sedan',
      priority: 'lowCost'
    };

    const categoryConfig = app.getResolvedDecisionAssistantConfig()?.arac;
    if (!categoryConfig) return { ok: false, reason: 'arac config missing' };

    const result = app.buildDecisionResult(categoryConfig, app.assistantAnswers);
    if (!result?.recommendations?.[0]) return { ok: false, reason: 'no primary recommendation' };

    app.ui.renderDecisionResults(result);
    return { ok: true };
  });
};

const assertElementNoHorizontalOverflow = async (page, selector) => {
  const layout = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false, overflow: true };
    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    return {
      found: true,
      overflow: rect.right > viewportWidth + 1 || rect.left < -1,
      right: rect.right,
      viewportWidth
    };
  }, selector);

  expect(layout.found).toBe(true);
  expect(layout.overflow).toBe(false);
};

const assertLocatorWithinViewport = async (locator, viewportWidth) => {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
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
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await expect(page).toHaveTitle(/Seçenek|isteBul/i);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'ilanlar');
    await expect(page.locator('#ilanlar')).toBeVisible();
    await expect(page.locator('#listings-grid')).toBeVisible();
    await expect(
      page.locator('#listings-grid .marketplace-empty-state, #listings-grid .listing-card').first()
    ).toBeVisible({ timeout: 15000 });

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

  test('karar yolculuğu şeridi üç hubda görünür', async ({ page }) => {
    const assertJourneyStrip = async (path, activeLabel) => {
      await page.goto(path);
      await waitForSpaReady(page);
      await dismissCookieBanner(page);

      const strip = page.locator('[data-decision-journey-strip]');
      await expect(strip).toBeVisible({ timeout: 15000 });
      await expect(strip).toContainText('Karar yolculuğu');
      await expect(strip.getByRole('link', { name: 'Karar Merkezi' })).toBeVisible();
      await expect(strip.getByRole('link', { name: 'Seçenekler' })).toBeVisible();
      await expect(strip.getByRole('link', { name: 'Karşılaştır' })).toBeVisible();
      await expect(strip.locator('.ib-decision-journey-step.is-active')).toHaveText(activeLabel);
    };

    await assertJourneyStrip('/karar-asistani/', 'Karar Merkezi');
    await assertJourneyStrip('/secenekler/', 'Seçenekler');
    await assertJourneyStrip('/karsilastir/', 'Karşılaştır');
  });

  test('secenekler boş durumda birincil CTA karar merkezine gider', async ({ page }) => {
    await page.goto('/secenekler/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    const emptyState = page.locator('#listings-grid .marketplace-empty-state');
    await expect(emptyState).toBeVisible({ timeout: 15000 });

    const primaryCta = emptyState.getByRole('link', { name: /Karar analizini başlat/i });
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveAttribute('href', /\/karar-asistani\/?$/);

    const tcoCta = emptyState.getByRole('link', { name: /TCO analizini başlat/i });
    await expect(tcoCta).toBeVisible();
    await expect(tcoCta).toHaveClass(/btn-outline/);
  });

  test('karar asistanı sonuç ekranında decision result summary görünür', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await page.waitForSelector('#premium-karar-analizi-root #assistant-results', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#assistant-category-rail .assistant-category', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(
      () => typeof window.app?.buildDecisionResult === 'function' && typeof window.app?.ui?.renderDecisionResults === 'function',
      null,
      { timeout: 15000 }
    );

    const renderStatus = await page.evaluate(() => {
      const app = window.app;
      if (!app?.buildDecisionResult || !app?.ui?.renderDecisionResults) {
        return { ok: false, reason: 'assistant api not ready' };
      }

      app.assistantCategory = 'arac';
      app.assistantAnswers = {
        province: 'İstanbul',
        district: 'Kadıköy',
        carModel: 'Toyota|Corolla',
        usage: 'city',
        budget: '1850000',
        fuel: 'hybrid',
        body: 'sedan',
        priority: 'lowCost'
      };

      const categoryConfig = app.getResolvedDecisionAssistantConfig()?.arac;
      if (!categoryConfig) {
        return { ok: false, reason: 'arac config missing' };
      }

      const result = app.buildDecisionResult(categoryConfig, app.assistantAnswers);
      if (!result?.recommendations?.[0]) {
        return { ok: false, reason: 'no primary recommendation' };
      }

      app.ui.renderDecisionResults(result);
      return { ok: true };
    });
    expect(renderStatus).toEqual({ ok: true });

    const summary = page.locator('[data-decision-result-summary]');
    await expect(summary).toBeVisible({ timeout: 15000 });
    await expect(summary.locator('[data-result-summary-field="fit-summary"] span').first()).toHaveText('Uygunluk özeti');
    await expect(summary.locator('[data-result-summary-field="risk-summary"] span').first()).toHaveText('Risk özeti');
    await expect(summary.locator('[data-result-summary-field="tco-summary"] span').first()).toHaveText('TCO özeti');
    await expect(summary.locator('[data-result-summary-field="profile-summary"] span').first()).toHaveText('Karar profili özeti');
  });

  test('karar asistanı sonuç ekranında AI destekli karar gerekçesi görünür', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await page.waitForSelector('#premium-karar-analizi-root #assistant-results', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#assistant-category-rail .assistant-category', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(
      () => typeof window.app?.buildDecisionResult === 'function' && typeof window.app?.ui?.renderDecisionResults === 'function',
      null,
      { timeout: 15000 }
    );

    const renderStatus = await page.evaluate(() => {
      const app = window.app;
      app.assistantCategory = 'arac';
      app.assistantAnswers = {
        province: 'İstanbul',
        district: 'Kadıköy',
        carModel: 'Toyota|Corolla',
        usage: 'city',
        budget: '1850000',
        fuel: 'hybrid',
        body: 'sedan',
        priority: 'lowCost'
      };

      const categoryConfig = app.getResolvedDecisionAssistantConfig()?.arac;
      if (!categoryConfig) return { ok: false, reason: 'arac config missing' };

      const result = app.buildDecisionResult(categoryConfig, app.assistantAnswers);
      if (!result?.recommendations?.[0]) return { ok: false, reason: 'no primary recommendation' };

      app.ui.renderDecisionResults(result);
      return { ok: true };
    });
    expect(renderStatus).toEqual({ ok: true });

    const rationale = page.locator('[data-decision-result-ai-rationale]');
    await expect(rationale).toBeVisible({ timeout: 15000 });
    await expect(rationale.getByRole('heading', { name: /AI destekli karar gerekçesi/i })).toBeVisible();
    await expect(rationale).toContainText(/mevcut skor, risk, TCO ve uygunluk sinyallerini açıklar/i);

    const rationaleText = await rationale.innerText();
    expect(rationaleText).toMatch(/skor|TCO|risk|uygunluk/i);
    expect(rationaleText).not.toMatch(/bunu seçmelisiniz|en doğru karar|kesinlikle bunu alın|tek doğru seçenek|sizin için en iyi karar/i);
  });

  test('karar asistanı hata durumunda AI karar gerekçesi görünmez', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await page.waitForSelector('#premium-karar-analizi-root #assistant-results', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(
      () => typeof window.app?.ui?.renderDecisionResults === 'function',
      null,
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      window.app.ui.renderDecisionResults({ recommendations: [] });
    });

    await expect(page.locator('[data-decision-result-summary]')).toHaveCount(0);
    await expect(page.locator('[data-decision-result-ai-rationale]')).toHaveCount(0);
    await expect(page.locator('[data-decision-result-share]')).toHaveCount(0);
  });

  test('karar asistanı sonuç ekranında decision share card görünür ve kopyalama başarılı', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await page.waitForSelector('#premium-karar-analizi-root #assistant-results', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#assistant-category-rail .assistant-category', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(
      () => typeof window.app?.buildDecisionResult === 'function' && typeof window.app?.ui?.renderDecisionResults === 'function',
      null,
      { timeout: 15000 }
    );

    const renderStatus = await page.evaluate(() => {
      const app = window.app;
      app.assistantCategory = 'arac';
      app.assistantAnswers = {
        province: 'İstanbul',
        district: 'Kadıköy',
        carModel: 'Toyota|Corolla',
        usage: 'city',
        budget: '1850000',
        fuel: 'hybrid',
        body: 'sedan',
        priority: 'lowCost'
      };

      const categoryConfig = app.getResolvedDecisionAssistantConfig()?.arac;
      if (!categoryConfig) return { ok: false, reason: 'arac config missing' };

      const result = app.buildDecisionResult(categoryConfig, app.assistantAnswers);
      if (!result?.recommendations?.[0]) return { ok: false, reason: 'no primary recommendation' };

      app.ui.renderDecisionResults(result);
      return { ok: true };
    });
    expect(renderStatus).toEqual({ ok: true });

    const shareCard = page.locator('[data-decision-result-share]');
    await expect(shareCard).toBeVisible({ timeout: 15000 });
    await expect(shareCard.getByRole('heading', { name: /Karar özetini paylaş/i })).toBeVisible();
    await expect(shareCard.getByRole('button', { name: /Karar özetini kopyala/i })).toBeVisible();

    await shareCard.getByRole('button', { name: /Karar özetini kopyala/i }).click();
    const feedback = shareCard.locator('[data-decision-result-share-feedback]');
    await expect(feedback).toBeVisible({ timeout: 15000 });
    await expect(feedback).toContainText(/panoya kopyalandı/i);
  });

  test('karar asistanı sonuç ekranı @390px 2C bileşenleri yatay taşma yapmaz', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    const renderStatus = await renderKararAsistaniSampleResult(page);
    expect(renderStatus).toEqual({ ok: true });

    await assertElementNoHorizontalOverflow(page, '[data-decision-result-summary]');
    await assertElementNoHorizontalOverflow(page, '[data-decision-result-ai-rationale]');
    await assertElementNoHorizontalOverflow(page, '[data-decision-result-share]');

    const copyBtn = page.locator('[data-decision-result-share-copy]');
    await expect(copyBtn).toBeVisible();
    await assertLocatorWithinViewport(copyBtn, MOBILE_2C_VIEWPORT.width);

    await copyBtn.click();
    const feedback = page.locator('[data-decision-result-share-feedback]');
    await expect(feedback).toBeVisible({ timeout: 15000 });
    await assertLocatorWithinViewport(feedback, MOBILE_2C_VIEWPORT.width);
  });

  test('karar geçmişi canonical entry schemaVersion=1 kaydeder ve geçmiş sayfası yüklenir', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await page.waitForSelector('#premium-karar-analizi-root #assistant-results', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(
      () => typeof window.app?.buildDecisionResult === 'function' && typeof window.app?.saveDecisionHistory === 'function',
      null,
      { timeout: 15000 }
    );

    const historyState = await page.evaluate(() => {
      const app = window.app;
      const userId = 'e2e-canonical-history-user';
      app.currentUser = { id: userId, name: 'E2E User' };

      app.assistantCategory = 'arac';
      app.assistantAnswers = {
        province: 'İstanbul',
        district: 'Kadıköy',
        carModel: 'Toyota|Corolla',
        usage: 'city',
        budget: '1850000',
        fuel: 'hybrid',
        body: 'sedan',
        priority: 'lowCost'
      };

      const categoryConfig = app.getResolvedDecisionAssistantConfig()?.arac;
      if (!categoryConfig) return { ok: false, reason: 'arac config missing' };

      const result = app.buildDecisionResult(categoryConfig, app.assistantAnswers);
      const saved = app.saveDecisionHistory(result);
      const storageKey = app.getUserHistoryStorageKey('istebul_decision_history');
      const stored = storageKey ? JSON.parse(localStorage.getItem(storageKey) || '[]') : [];

      return {
        ok: true,
        saved,
        entry: stored[0] || null
      };
    });

    expect(historyState.ok).toBe(true);
    expect(historyState.saved).toBe(true);
    expect(historyState.entry?.schemaVersion).toBe(1);
    expect(historyState.entry?.score).toBeTruthy();
    expect(historyState.entry?.riskLevel).toBeTruthy();
    expect(historyState.entry?.yearlyCost).toBeTruthy();
    expect(historyState.entry?.decisionProfile).toBeTruthy();

    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await page.evaluate(() => {
      window.app.currentUser = { id: 'e2e-canonical-history-user', name: 'E2E User' };
      window.app.loadDecisionHistory();
    });
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'history');
    await expect(page.locator('.decision-history-card').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.decision-history-card').first()).toContainText(/Toyota Corolla/i);

    const signalStrip = page.locator('[data-decision-history-signal-strip]').first();
    await expect(signalStrip).toBeVisible();
    await expect(signalStrip.locator('[data-history-signal="history-fit"]')).toContainText(/Uygunluk/i);
    await expect(signalStrip.locator('[data-history-signal="history-risk"]')).toContainText(/Risk/i);
    await expect(signalStrip.locator('[data-history-signal="history-tco"]')).toContainText(/TCO/i);
    await expect(signalStrip.locator('[data-history-signal="history-profile"]')).toContainText(/Profil/i);
    await expect(signalStrip.locator('[data-history-signal="history-fit"]')).toContainText(/\/100/);
    await expect(signalStrip.locator('[data-history-signal="history-risk"]')).not.toContainText(/^—$/);
    await expect(signalStrip.locator('[data-history-signal="history-tco"]')).not.toContainText(/^—$/);
    await expect(signalStrip.locator('[data-history-signal="history-profile"]')).not.toContainText(/^—$/);
  });

  test('karar geçmişi legacy entry ile yüklenir ve sinyal şeridi fallback gösterir', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-legacy-history-user';
      window.app.currentUser = { id: userId, name: 'E2E Legacy User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const legacyEntry = {
        id: 'legacy-history-1',
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-01-15T10:00:00.000Z',
        summary: 'Toyota Corolla en güçlü eşleşme.',
        insight: { headline: 'Dengeli araç profili öne çıkıyor.' },
        topPick: {
          name: 'Toyota Corolla',
          score: 82,
          price: 1750000,
          yearlyCost: 210000,
          monthlyPayment: 16500,
          riskLevel: 'Orta risk'
        },
        answers: [{ label: 'İl', value: 'İstanbul' }]
      };
      localStorage.setItem(storageKey, JSON.stringify([legacyEntry]));
      window.app.loadDecisionHistory();
    });

    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'history');
    await expect(page.locator('.decision-history-card').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.decision-history-card').first()).toContainText(/Toyota Corolla/i);

    const signalStrip = page.locator('.decision-history-card').first().locator('[data-decision-history-signal-strip]');
    await expect(signalStrip).toBeVisible({ timeout: 15000 });
    await expect(signalStrip.locator('[data-history-signal="history-fit"]')).toContainText('82/100');
    await expect(signalStrip.locator('[data-history-signal="history-risk"]')).toContainText(/Orta risk/i);
    await expect(signalStrip.locator('[data-history-signal="history-profile"]')).toContainText(/Dengeli araç profili/i);
  });

  test('karar geçmişi sinyal şeridi @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-mobile-user';
      window.app.currentUser = { id: userId, name: 'E2E Mobile User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const entry = {
        id: 'mobile-history-1',
        schemaVersion: 1,
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        score: 88,
        riskLevel: 'Düşük risk',
        yearlyCost: 240000,
        decisionProfile: 'Toyota Corolla, araç kararınızda en dengeli seçenek olarak öne çıkıyor.',
        summary: 'Toyota Corolla en güçlü eşleşme.',
        topPick: {
          name: 'Toyota Corolla Hybrid',
          score: 88,
          price: 1850000,
          yearlyCost: 240000,
          monthlyPayment: 18500,
          riskLevel: 'Düşük risk'
        },
        answers: [{ label: 'İl', value: 'İstanbul' }]
      };
      localStorage.setItem(storageKey, JSON.stringify([entry]));
      window.app.loadDecisionHistory();
    });

    const card = page.locator('.decision-history-card').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const signalStrip = card.locator('[data-decision-history-signal-strip]');
    await expect(signalStrip).toBeVisible({ timeout: 15000 });
    await assertElementNoHorizontalOverflow(page, '.decision-history-card [data-decision-history-signal-strip]');
    await assertLocatorWithinViewport(card, MOBILE_2C_VIEWPORT.width);
  });

  test('gecmis canonical entry Karşılaştırmaya ekle CTA ile karşılaştırmaya ekler', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      localStorage.removeItem('istebul_comparison_items');
      localStorage.removeItem('istebu_comparison_items');

      const userId = 'e2e-history-compare-user';
      window.app.currentUser = { id: userId, name: 'E2E Compare User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const entry = {
        id: 'history-compare-1',
        schemaVersion: 1,
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        score: 88,
        riskLevel: 'Düşük risk',
        yearlyCost: 240000,
        decisionProfile: 'Toyota Corolla dengeli profil',
        summary: 'Toyota Corolla en güçlü eşleşme.',
        topPick: {
          name: 'Toyota Corolla Hybrid',
          score: 88,
          price: 1850000,
          yearlyCost: 240000,
          monthlyPayment: 18500,
          riskLevel: 'Düşük risk'
        },
        answers: [{ label: 'İl', value: 'İstanbul' }]
      };
      localStorage.setItem(storageKey, JSON.stringify([entry]));
      window.app.loadDecisionHistory();
    });

    const compareBtn = page.locator('[data-decision-compare-add="history-compare-1"]');
    await expect(compareBtn).toBeVisible({ timeout: 15000 });
    await expect(compareBtn).toContainText(/Karşılaştırmaya ekle/i);
    await compareBtn.click();

    await expect(page.locator('.notification.success').filter({ hasText: /Karar geçmişi karşılaştırmaya eklendi/i })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/gecmis\/?$/);

    const comparisonState = await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('istebul_comparison_items') || '[]');
      return {
        count: items.length,
        title: items[0]?.title || null
      };
    });
    expect(comparisonState.count).toBe(1);
    expect(comparisonState.title).toMatch(/Toyota Corolla Hybrid/i);

    await page.goto('/karsilastir/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await page.evaluate(() => window.app.loadComparisonItems());
    await expect(page.locator('.comparison-card').first()).toContainText(/Toyota Corolla Hybrid/i, { timeout: 15000 });
  });

  test('gecmis eksik topPick entry Karşılaştırmaya ekle CTA göstermez', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-no-pick-user';
      window.app.currentUser = { id: userId, name: 'E2E No Pick User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const entry = {
        id: 'history-no-pick',
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        summary: 'Eksik seçenek kaydı'
      };
      localStorage.setItem(storageKey, JSON.stringify([entry]));
      window.app.loadDecisionHistory();
    });

    await expect(page.locator('.decision-history-card').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-decision-compare-add]')).toHaveCount(0);
  });

  test('karar merkezi son kararlar snippet görünür ve geçmişe bağlanır', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-recent-snippet-user';
      window.app.currentUser = { id: userId, name: 'E2E Snippet User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const entries = [
        {
          id: 'recent-1',
          schemaVersion: 1,
          categoryId: 'arac',
          categoryName: 'Araç',
          createdAt: '2026-06-08T12:00:00.000Z',
          score: 88,
          riskLevel: 'Düşük risk',
          yearlyCost: 240000,
          topPick: { name: 'Toyota Corolla Hybrid', score: 88, yearlyCost: 240000, riskLevel: 'Düşük risk' }
        },
        {
          id: 'recent-2',
          schemaVersion: 1,
          categoryId: 'ev',
          categoryName: 'Konut',
          createdAt: '2026-06-07T12:00:00.000Z',
          score: 76,
          riskLevel: 'Orta risk',
          yearlyCost: 180000,
          topPick: { name: 'Kadıköy daire', score: 76, yearlyCost: 180000, riskLevel: 'Orta risk' }
        }
      ];
      localStorage.setItem(storageKey, JSON.stringify(entries));
      window.app.decisionHistory = entries;
      window.app.ui.renderRecentDecisionHistorySnippet(entries);
    });

    const snippet = page.locator('[data-decision-history-recent-snippet]');
    await expect(snippet).toBeVisible({ timeout: 15000 });
    await expect(snippet).toContainText(/Son kararlarınız/i);
    await expect(snippet.locator('[data-recent-history-id="recent-1"]')).toContainText(/Toyota Corolla Hybrid/i);
    await expect(snippet.locator('[data-recent-signal="fit"]').first()).toContainText(/Uygunluk/i);
    await expect(snippet.locator('[data-recent-signal="risk"]').first()).toContainText(/Risk/i);
    await expect(snippet.locator('[data-recent-signal="tco"]').first()).toContainText(/TCO/i);

    const historyCta = snippet.locator('[data-recent-history-cta]');
    await expect(historyCta).toHaveAttribute('href', '/gecmis/');
    await expect(historyCta).toContainText(/Tüm karar geçmişini gör/i);
  });

  test('gecmis Karşılaştırmaya ekle CTA @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-cta-mobile-user';
      window.app.currentUser = { id: userId, name: 'E2E Mobile CTA User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const entry = {
        id: 'history-mobile-cta',
        schemaVersion: 1,
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        score: 88,
        riskLevel: 'Düşük risk',
        yearlyCost: 240000,
        topPick: {
          name: 'Toyota Corolla Hybrid',
          score: 88,
          price: 1850000,
          yearlyCost: 240000,
          riskLevel: 'Düşük risk'
        }
      };
      localStorage.setItem(storageKey, JSON.stringify([entry]));
      window.app.loadDecisionHistory();
    });

    const card = page.locator('.decision-history-card').first();
    const actions = card.locator('.decision-history-actions');
    await expect(actions).toBeVisible({ timeout: 15000 });
    await assertElementNoHorizontalOverflow(page, '.decision-history-card .decision-history-actions');
    await assertLocatorWithinViewport(card, MOBILE_2C_VIEWPORT.width);
  });

  test('karar merkezi son kararlar snippet @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-snippet-mobile-user';
      window.app.currentUser = { id: userId, name: 'E2E Snippet Mobile User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const entry = {
        id: 'snippet-mobile-1',
        schemaVersion: 1,
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        score: 88,
        riskLevel: 'Düşük risk',
        yearlyCost: 240000,
        topPick: {
          name: 'Toyota Corolla Hybrid',
          score: 88,
          yearlyCost: 240000,
          riskLevel: 'Düşük risk'
        }
      };
      localStorage.setItem(storageKey, JSON.stringify([entry]));
      window.app.decisionHistory = [entry];
      window.app.ui.renderRecentDecisionHistorySnippet([entry]);
    });

    const snippet = page.locator('[data-decision-history-recent-snippet]');
    await expect(snippet).toBeVisible({ timeout: 15000 });
    await assertElementNoHorizontalOverflow(page, '[data-decision-history-recent-snippet]');
    await assertLocatorWithinViewport(snippet, MOBILE_2C_VIEWPORT.width);
  });

  test('gecmis legacy arac kaydı Araba normalized label gösterir', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-arac-label-user';
      window.app.currentUser = { id: userId, name: 'E2E Arac Label User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'legacy-arac-label',
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        topPick: { name: 'Toyota Corolla', score: 82, yearlyCost: 210000, riskLevel: 'Orta risk' },
        summary: 'Toyota Corolla en güçlü eşleşme.'
      }]));
      window.app.loadDecisionHistory();
    });

    const kicker = page.locator('.decision-history-card [data-history-category="auto"]').first();
    await expect(kicker).toBeVisible({ timeout: 15000 });
    await expect(kicker).toHaveText('Araba');
  });

  test('gecmis legacy ev kaydı Konut normalized label gösterir', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-ev-label-user';
      window.app.currentUser = { id: userId, name: 'E2E Ev Label User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'legacy-ev-label',
        categoryId: 'ev',
        categoryName: 'Ev',
        createdAt: '2026-06-08T12:00:00.000Z',
        topPick: { name: 'Kadıköy daire', score: 76, yearlyCost: 180000, riskLevel: 'Orta risk' },
        summary: 'Kadıköy daire en güçlü eşleşme.'
      }]));
      window.app.loadDecisionHistory();
    });

    const kicker = page.locator('.decision-history-card [data-history-category="konut"]').first();
    await expect(kicker).toBeVisible({ timeout: 15000 });
    await expect(kicker).toHaveText('Konut');
  });

  test('karar merkezi son kararlar snippet normalized kategori gösterir', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-snippet-category-user';
      window.app.currentUser = { id: userId, name: 'E2E Snippet Category User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([
        {
          id: 'snippet-arac',
          categoryId: 'arac',
          categoryName: 'Araç',
          createdAt: '2026-06-08T12:00:00.000Z',
          score: 88,
          topPick: { name: 'Toyota Corolla Hybrid', score: 88, yearlyCost: 240000, riskLevel: 'Düşük risk' }
        },
        {
          id: 'snippet-ev',
          categoryId: 'ev',
          categoryName: 'Ev',
          createdAt: '2026-06-07T12:00:00.000Z',
          score: 76,
          topPick: { name: 'Kadıköy daire', score: 76, yearlyCost: 180000, riskLevel: 'Orta risk' }
        }
      ]));
      window.app.decisionHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
      window.app.ui.renderRecentDecisionHistorySnippet(window.app.decisionHistory);
    });

    const snippet = page.locator('[data-decision-history-recent-snippet]');
    await expect(snippet).toBeVisible({ timeout: 15000 });
    await expect(snippet.locator('[data-recent-history-id="snippet-arac"] .assistant-kicker')).toHaveText('Araba');
    await expect(snippet.locator('[data-recent-history-id="snippet-ev"] .assistant-kicker')).toHaveText('Konut');
  });

  test('gecmis auto kaydı karşılaştırmaya normalized auto kategori ile eklenir', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      localStorage.removeItem('istebul_comparison_items');
      localStorage.removeItem('istebu_comparison_items');

      const userId = 'e2e-history-compare-auto-user';
      window.app.currentUser = { id: userId, name: 'E2E Compare Auto User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'history-compare-auto',
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        topPick: {
          name: 'Toyota Corolla Hybrid',
          score: 88,
          price: 1850000,
          yearlyCost: 240000,
          riskLevel: 'Düşük risk'
        }
      }]));
      window.app.loadDecisionHistory();
    });

    const card = page.locator('.decision-history-card').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const compareBtn = card.locator('[data-decision-compare-add="history-compare-auto"]');
    await expect(compareBtn).toBeVisible({ timeout: 15000 });
    await compareBtn.click();
    await expect(page.locator('.notification.success').filter({ hasText: /Karar geçmişi karşılaştırmaya eklendi/i })).toBeVisible({ timeout: 15000 });

    const comparisonState = await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('istebul_comparison_items') || '[]');
      return { categoryId: items[0]?.categoryId || null, categoryName: items[0]?.categoryName || null };
    });
    expect(comparisonState.categoryId).toBe('auto');
    expect(comparisonState.categoryName).toBe('Araba');

    await page.goto('/karsilastir/');
    await waitForSpaReady(page);
    await page.evaluate(() => window.app.loadComparisonItems());
    await expect(page.locator('.comparison-card .assistant-kicker').first()).toHaveText(/AI önerisi/i);
    await expect(page.locator('.comparison-card h4').first()).toContainText(/Toyota Corolla Hybrid/i);
  });

  test('gecmis konut kaydı karşılaştırmaya normalized konut kategori ile eklenir', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      localStorage.removeItem('istebul_comparison_items');
      localStorage.removeItem('istebu_comparison_items');

      const userId = 'e2e-history-compare-konut-user';
      window.app.currentUser = { id: userId, name: 'E2E Compare Konut User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'history-compare-konut',
        categoryId: 'ev',
        categoryName: 'Ev',
        createdAt: '2026-06-08T12:00:00.000Z',
        topPick: {
          name: 'Kadıköy daire',
          score: 76,
          price: 5000000,
          yearlyCost: 180000,
          riskLevel: 'Orta risk'
        }
      }]));
      window.app.loadDecisionHistory();
    });

    await page.locator('[data-decision-compare-add="history-compare-konut"]').click();
    await expect(page.locator('.notification.success').filter({ hasText: /Karar geçmişi karşılaştırmaya eklendi/i })).toBeVisible({ timeout: 15000 });

    const comparisonState = await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('istebul_comparison_items') || '[]');
      return { categoryId: items[0]?.categoryId || null, categoryName: items[0]?.categoryName || null };
    });
    expect(comparisonState.categoryId).toBe('konut');
    expect(comparisonState.categoryName).toBe('Konut');
  });

  test('gecmis normalized kategori label @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-category-mobile-user';
      window.app.currentUser = { id: userId, name: 'E2E Category Mobile User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'history-category-mobile',
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        topPick: { name: 'Toyota Corolla Hybrid', score: 88, yearlyCost: 240000, riskLevel: 'Düşük risk' },
        summary: 'Toyota Corolla en güçlü eşleşme.'
      }]));
      window.app.loadDecisionHistory();
    });

    const card = page.locator('.decision-history-card').first();
    const kicker = card.locator('[data-history-category="auto"]');
    await expect(kicker).toBeVisible({ timeout: 15000 });
    await expect(kicker).toHaveText('Araba');
    await assertElementNoHorizontalOverflow(page, '.decision-history-card');
    await assertLocatorWithinViewport(card, MOBILE_2C_VIEWPORT.width);
  });

  test('karar merkezi son kararlar snippet normalized kategori @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-snippet-category-mobile-user';
      window.app.currentUser = { id: userId, name: 'E2E Snippet Category Mobile User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'snippet-category-mobile',
        categoryId: 'ev',
        categoryName: 'Ev',
        createdAt: '2026-06-08T12:00:00.000Z',
        topPick: { name: 'Kadıköy daire', score: 76, yearlyCost: 180000, riskLevel: 'Orta risk' }
      }]));
      window.app.decisionHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
      window.app.ui.renderRecentDecisionHistorySnippet(window.app.decisionHistory);
    });

    const snippet = page.locator('[data-decision-history-recent-snippet]');
    await expect(snippet).toBeVisible({ timeout: 15000 });
    await expect(snippet.locator('.assistant-kicker').first()).toHaveText('Konut');
    await assertElementNoHorizontalOverflow(page, '[data-decision-history-recent-snippet]');
    await assertLocatorWithinViewport(snippet, MOBILE_2C_VIEWPORT.width);
  });

  test('gecmis legacy compat read localStorage otomatik toplu overwrite etmez', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    const storageSnapshot = await page.evaluate(() => {
      const userId = 'e2e-compat-no-overwrite-user';
      window.app.currentUser = { id: userId, name: 'E2E Compat User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const legacyEntry = {
        id: 'compat-no-overwrite',
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-01-15T10:00:00.000Z',
        summary: 'Toyota Corolla en güçlü eşleşme.',
        topPick: {
          name: 'Toyota Corolla',
          score: 82,
          yearlyCost: 210000,
          riskLevel: 'Orta risk'
        }
      };
      const raw = JSON.stringify([legacyEntry]);
      localStorage.setItem(storageKey, raw);
      return { storageKey, before: raw };
    });

    await page.evaluate(() => window.app.loadDecisionHistory());
    await expect(page.locator('.decision-history-card').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.decision-history-card').first()).toContainText(/Toyota Corolla/i);

    const after = await page.evaluate((storageKey) => localStorage.getItem(storageKey), storageSnapshot.storageKey);
    expect(after).toBe(storageSnapshot.before);

    const parsed = JSON.parse(after);
    expect(parsed[0].schemaVersion).toBeUndefined();
    expect(parsed[0].categoryId).toBe('arac');
  });

  test('gecmis legacy compat kayıttan Karşılaştırmaya ekle çalışır', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      localStorage.removeItem('istebul_comparison_items');
      localStorage.removeItem('istebu_comparison_items');

      const userId = 'e2e-compat-compare-user';
      window.app.currentUser = { id: userId, name: 'E2E Compat Compare User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        recommendations: [{
          name: 'Toyota Corolla',
          score: 82,
          price: 1750000,
          yearlyCost: 210000,
          riskLevel: 'Orta risk'
        }]
      }]));
      window.app.loadDecisionHistory();
    });

    const compareBtn = page.locator('[data-decision-compare-add]').first();
    await expect(compareBtn).toBeVisible({ timeout: 15000 });
    await compareBtn.click();
    await expect(page.locator('.notification.success').filter({ hasText: /Karar geçmişi karşılaştırmaya eklendi/i })).toBeVisible({ timeout: 15000 });

    const comparisonState = await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('istebul_comparison_items') || '[]');
      return {
        categoryId: items[0]?.categoryId || null,
        title: items[0]?.title || null
      };
    });
    expect(comparisonState.categoryId).toBe('auto');
    expect(comparisonState.title).toMatch(/Toyota Corolla/i);
  });

  test('karar merkezi son kararlar snippet legacy compat kaydı gösterir', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-compat-snippet-user';
      window.app.currentUser = { id: userId, name: 'E2E Compat Snippet User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const legacyEntry = {
        categoryId: 'ev',
        categoryName: 'Ev',
        createdAt: '2026-06-08T12:00:00.000Z',
        recommendations: [{
          name: 'Kadıköy daire',
          score: 76,
          yearlyCost: 180000,
          riskLevel: 'Orta risk'
        }]
      };
      localStorage.setItem(storageKey, JSON.stringify([legacyEntry]));
      window.app.decisionHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
      window.app.ui.renderRecentDecisionHistorySnippet(window.app.decisionHistory);
    });

    const snippet = page.locator('[data-decision-history-recent-snippet]');
    await expect(snippet).toBeVisible({ timeout: 15000 });
    await expect(snippet.locator('.assistant-kicker').first()).toHaveText('Konut');
    await expect(snippet).toContainText(/Kadıköy daire/i);
    await expect(snippet.locator('[data-recent-signal="fit"]').first()).toContainText(/76\/100/);
  });

  test('gecmis legacy compat normalize edilmiş kayıt kartı @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-compat-mobile-user';
      window.app.currentUser = { id: userId, name: 'E2E Compat Mobile User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'compat-mobile-home',
        categoryId: 'home',
        categoryName: 'Home',
        createdAt: '2026-06-08T12:00:00.000Z',
        topPick: {
          name: 'Bostancı daire',
          score: 71,
          yearlyCost: 150000,
          riskLevel: 'Orta risk'
        }
      }]));
      window.app.loadDecisionHistory();
    });

    const card = page.locator('.decision-history-card').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText(/Bostancı daire/i);
    await expect(card.locator('[data-history-category="konut"]')).toHaveText('Konut');
    await assertElementNoHorizontalOverflow(page, '.decision-history-card');
    await assertLocatorWithinViewport(card, MOBILE_2C_VIEWPORT.width);
  });

  test('gecmis delete action kaydı siler ve localStorage günceller', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-delete-user';
      window.app.currentUser = { id: userId, name: 'E2E Delete User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([
        {
          id: 'delete-target',
          schemaVersion: 1,
          categoryId: 'arac',
          categoryName: 'Araç',
          createdAt: '2026-06-08T12:00:00.000Z',
          topPick: { name: 'Toyota Corolla', score: 82, yearlyCost: 210000, riskLevel: 'Orta risk' },
          summary: 'Silinecek kayıt.'
        },
        {
          id: 'delete-keep',
          schemaVersion: 1,
          categoryId: 'ev',
          categoryName: 'Ev',
          createdAt: '2026-06-07T12:00:00.000Z',
          topPick: { name: 'Kadıköy daire', score: 76, yearlyCost: 180000, riskLevel: 'Orta risk' },
          summary: 'Kalacak kayıt.'
        }
      ]));
      window.app.loadDecisionHistory();
    });

    await expect(page.locator('.decision-history-card')).toHaveCount(2, { timeout: 15000 });
    await page.locator('[data-decision-delete="delete-target"]').click();
    await expect(page.locator('.notification.success').filter({ hasText: /Karar geçmişten silindi/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.decision-history-card')).toHaveCount(1);
    await expect(page.locator('.decision-history-card').first()).toContainText(/Kadıköy daire/i);

    const remaining = await page.evaluate(() => {
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      return JSON.parse(localStorage.getItem(storageKey) || '[]').map((entry) => entry.id);
    });
    expect(remaining).toEqual(['delete-keep']);
  });

  test('gecmis canonical ev kaydı Tekrar aç ile karar asistanını açar', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-repeat-ev-user';
      window.app.currentUser = { id: userId, name: 'E2E Repeat Ev User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'repeat-ev-canonical',
        schemaVersion: 1,
        categoryId: 'konut',
        categoryName: 'Konut',
        originalCategoryId: 'ev',
        originalCategoryName: 'Ev',
        createdAt: '2026-06-08T12:00:00.000Z',
        rawAnswers: { province: 'İstanbul', district: 'Kadıköy', budget: '5000000' },
        topPick: { name: 'Kadıköy daire', score: 76, yearlyCost: 180000, riskLevel: 'Orta risk' },
        summary: 'Kadıköy daire en güçlü eşleşme.'
      }]));
      window.app.loadDecisionHistory();
    });

    await expect(page.locator('.decision-history-card').first()).toBeVisible({ timeout: 15000 });
    await page.locator('[data-decision-repeat="repeat-ev-canonical"]').click();
    await expect(page).toHaveURL(/\/karar-asistani\/?$/, { timeout: 15000 });

    const assistantState = await page.waitForFunction(() => {
      if (window.app?.assistantCategory !== 'ev') return null;
      return {
        category: window.app.assistantCategory,
        budget: window.app.assistantAnswers?.budget || null,
        hasWizard: Boolean(document.querySelector('#assistant-category-rail .assistant-category'))
      };
    }, null, { timeout: 15000 }).then((handle) => handle.jsonValue());

    expect(assistantState.category).toBe('ev');
    expect(String(assistantState.budget)).toBe('5000000');
    expect(assistantState.hasWizard).toBe(true);
  });

  test('gecmis boş durum authenticated kullanıcıda görünür', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-history-empty-user';
      window.app.currentUser = { id: userId, name: 'E2E Empty User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, '[]');
      window.app.loadDecisionHistory();
    });

    await expect(page.locator('#history-list .empty-state h3')).toHaveText('Geçmiş bulunamadı', { timeout: 15000 });
    await expect(page.locator('#history-list .decision-history-card')).toHaveCount(0);
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

  test('karsilastir boş durumda karar odaklı başlık ve CTA hiyerarşisi görünür', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('istebul_comparison_items');
      localStorage.removeItem('istebu_comparison_items');
    });

    await page.goto('/karsilastir/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'compare');

    const emptyState = page.locator('[data-comparison-empty-state]');
    await expect(emptyState).toBeVisible({ timeout: 15000 });
    await expect(emptyState.getByRole('heading', { name: /Karar öncesi seçenekleri burada toplayın/i })).toBeVisible();

    const primaryCta = emptyState.getByRole('link', { name: /Karar analizini başlat/i });
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveAttribute('href', /\/karar-asistani\/?$/);
    await expect(primaryCta).toHaveClass(/btn-primary/);

    const secondaryCta = emptyState.getByRole('link', { name: /Seçenekleri incele/i });
    await expect(secondaryCta).toBeVisible();
    await expect(secondaryCta).toHaveAttribute('href', /\/secenekler\/?$/);
    await expect(secondaryCta).toHaveClass(/btn-outline/);
  });

  test('karsilastir boş durumda AI karar yorumu görünmez', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('istebul_comparison_items');
      localStorage.removeItem('istebu_comparison_items');
    });

    await page.goto('/karsilastir/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await expect(page.locator('[data-comparison-empty-state]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-comparison-ai-commentary]')).toHaveCount(0);
    await expect(page.locator('[data-comparison-decision-cta]')).toHaveCount(0);
  });

  test('karsilastir dolu durumda karar özeti ve dört etiket görünür', async ({ page }) => {
    const comparisonItems = [
      {
        id: 'cmp-e2e-1',
        signature: 'e2e:arac:1',
        sourceType: 'Test',
        categoryId: 'arac',
        categoryName: 'Araç',
        title: 'E2E Seçenek A',
        price: 500000,
        periodicCost: 120000,
        monthlyPayment: 15000,
        totalPayment: 600000,
        score: 78,
        riskLevel: 'Kontrollü risk',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'cmp-e2e-2',
        signature: 'e2e:arac:2',
        sourceType: 'Test',
        categoryId: 'arac',
        categoryName: 'Araç',
        title: 'E2E Seçenek B',
        price: 450000,
        periodicCost: 95000,
        monthlyPayment: 14000,
        totalPayment: 550000,
        score: 88,
        riskLevel: 'Düşük risk',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    await page.addInitScript((items) => {
      localStorage.setItem('istebul_comparison_items', JSON.stringify(items));
    }, comparisonItems);

    await page.goto('/karsilastir/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'compare');

    const summary = page.locator('[data-comparison-decision-summary]');
    await expect(summary).toBeVisible({ timeout: 15000 });
    await expect(summary.locator('[data-summary-field="lowest-tco"] span').first()).toHaveText('En düşük TCO');
    await expect(summary.locator('[data-summary-field="lowest-risk"] span').first()).toHaveText('En düşük risk profili');
    await expect(summary.locator('[data-summary-field="highest-fit"] span').first()).toHaveText('En yüksek ihtiyaç uyumu');
    await expect(summary.locator('[data-summary-field="most-balanced"] span').first()).toHaveText('En dengeli seçenek');
  });

  test('karsilastir dolu durumda karar merkezine dönüş CTA görünür', async ({ page }) => {
    const comparisonItems = [
      {
        id: 'cmp-e2e-cta-1',
        signature: 'e2e:arac:cta-1',
        sourceType: 'Test',
        categoryId: 'arac',
        categoryName: 'Araç',
        title: 'E2E Seçenek A',
        price: 500000,
        periodicCost: 120000,
        monthlyPayment: 15000,
        totalPayment: 600000,
        score: 78,
        riskLevel: 'Kontrollü risk',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'cmp-e2e-cta-2',
        signature: 'e2e:arac:cta-2',
        sourceType: 'Test',
        categoryId: 'arac',
        categoryName: 'Araç',
        title: 'E2E Seçenek B',
        price: 450000,
        periodicCost: 95000,
        monthlyPayment: 14000,
        totalPayment: 550000,
        score: 88,
        riskLevel: 'Düşük risk',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    await page.addInitScript((items) => {
      localStorage.setItem('istebul_comparison_items', JSON.stringify(items));
    }, comparisonItems);

    await page.goto('/karsilastir/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    const decisionCta = page.locator('[data-comparison-decision-cta]');
    await expect(decisionCta).toBeVisible({ timeout: 15000 });

    const primaryCta = decisionCta.locator('[data-comparison-decision-cta-primary]');
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveText(/Karar analizine devam et/i);
    await expect(primaryCta).toHaveAttribute('href', /\/karar-asistani\/?$/);
    await expect(primaryCta).toHaveClass(/btn-primary/);

    const secondaryCta = decisionCta.locator('[data-comparison-decision-cta-secondary]');
    await expect(secondaryCta).toBeVisible();
    await expect(secondaryCta).toHaveText(/Daha fazla seçenek incele/i);
    await expect(secondaryCta).toHaveAttribute('href', /\/secenekler\/?$/);
    await expect(secondaryCta).toHaveClass(/btn-outline/);
  });

  test('karsilastir dolu durumda AI karar yorumu görünür ve açıklayıcıdır', async ({ page }) => {
    const comparisonItems = [
      {
        id: 'cmp-e2e-ai-1',
        signature: 'e2e:arac:ai-1',
        sourceType: 'Test',
        categoryId: 'arac',
        categoryName: 'Araç',
        title: 'E2E Seçenek A',
        price: 500000,
        periodicCost: 120000,
        monthlyPayment: 15000,
        totalPayment: 600000,
        score: 78,
        riskLevel: 'Kontrollü risk',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'cmp-e2e-ai-2',
        signature: 'e2e:arac:ai-2',
        sourceType: 'Test',
        categoryId: 'arac',
        categoryName: 'Araç',
        title: 'E2E Seçenek B',
        price: 450000,
        periodicCost: 95000,
        monthlyPayment: 14000,
        totalPayment: 550000,
        score: 88,
        riskLevel: 'Düşük risk',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    await page.addInitScript((items) => {
      localStorage.setItem('istebul_comparison_items', JSON.stringify(items));
    }, comparisonItems);

    await page.goto('/karsilastir/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    const aiCommentary = page.locator('[data-comparison-ai-commentary]');
    await expect(aiCommentary).toBeVisible({ timeout: 15000 });
    await expect(aiCommentary.getByRole('heading', { name: /AI destekli karar yorumu/i })).toBeVisible();
    await expect(aiCommentary).toContainText(/mevcut skor, TCO ve risk sinyallerini açıklar/i);

    const commentaryText = await aiCommentary.innerText();
    expect(commentaryText).toMatch(/skor|TCO|risk|uyum/i);
    expect(commentaryText).not.toMatch(/bunu seçmelisiniz|en doğru karar/i);
  });

  test('karar asistanı karşılaştırma önizlemesinde merkez CTA görünür', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    const preview = page.locator('.ib-premium-compare-preview');
    await expect(preview).toBeVisible({ timeout: 15000 });

    const compareCta = preview.locator('.ib-premium-compare-preview-actions a');
    await expect(compareCta).toBeVisible();
    await expect(compareCta).toHaveText(/Karşılaştırma merkezine git/i);
    await expect(compareCta).toHaveAttribute('href', /\/karsilastir\/?$/);
    await expect(compareCta).toHaveClass(/btn-outline/);
  });
});
