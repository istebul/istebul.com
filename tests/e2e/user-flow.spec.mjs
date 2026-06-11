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
  await expect(locator).toBeVisible({ timeout: 15000 });
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
};

/** Let app init + requestIdleCallback deferred history loads finish before seeding /gecmis. */
const waitForGecmisRouteBootstrap = async (page) => {
  await page.waitForFunction(() => window.appReady === true, null, { timeout: 15000 });
  await page.evaluate((idleTimeoutMs) => new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: idleTimeoutMs });
    } else {
      setTimeout(resolve, 400);
    }
  }), 1200);
};

/** Deferred renderDecisionAssistant / loadDecisionHistory must finish before assistant DOM seeding. */
const waitForKararAsistaniRouteBootstrap = async (page) => {
  await page.waitForFunction(() => window.appReady === true, null, { timeout: 15000 });
  await page.waitForSelector('#premium-karar-analizi-root #assistant-results', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(
    () => typeof window.app?.buildDecisionResult === 'function' && typeof window.app?.ui?.renderDecisionResults === 'function',
    null,
    { timeout: 15000 }
  );
  await page.evaluate((idleTimeoutMs) => new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: idleTimeoutMs });
    } else {
      setTimeout(resolve, 400);
    }
  }), 1200);
};

const assistantDecisionToolbarLocator = (page) =>
  page.locator('.assistant-decision-toolbar a[data-analytics-placement="decision_result_toolbar"]');

const renderAssistantDecisionResult = async (page, { category, answers }) => {
  const renderStatus = await page.evaluate(({ category, answers }) => {
    const app = window.app;
    if (!app?.buildDecisionResult || !app?.ui?.renderDecisionResults) {
      return { ok: false, reason: 'assistant api not ready' };
    }

    app.assistantCategory = category;
    app.assistantAnswers = answers;
    const categoryConfig = app.getResolvedDecisionAssistantConfig()?.[category];
    if (!categoryConfig) return { ok: false, reason: `${category} config missing` };

    const result = app.buildDecisionResult(categoryConfig, app.assistantAnswers);
    if (!result?.recommendations?.[0]) return { ok: false, reason: 'no primary recommendation' };

    app.ui.renderDecisionResults(result);
    return { ok: true };
  }, { category, answers });

  expect(renderStatus).toEqual({ ok: true });
  await expect(page.locator('.assistant-decision-hero .assistant-kicker')).toContainText(/Ön değerlendirme tamamlandı/i, { timeout: 15000 });
  await expect(assistantDecisionToolbarLocator(page)).toBeVisible({ timeout: 15000 });
};

/**
 * Pre-existing /gecmis flake (Faz 2D mobile + deferred loadDecisionHistory race, not 2E-2):
 * wait until history cards survive trailing idle reload / loadComparisonHistory guard.
 */
const waitForGecmisHistoryStable = async (page, { categoryId, entryId, minCards = 1 } = {}) => {
  const isStable = ({ categoryId, entryId, minCards }) => {
    const list = document.getElementById('history-list');
    if (!list) return false;
    if (list.querySelector('.history-auth-gate')) return false;
    const cards = list.querySelectorAll('.decision-history-card');
    if (cards.length < minCards) return false;
    if (categoryId) {
      const kicker = list.querySelector(
        `.decision-history-card [data-history-category="${categoryId}"]`
      );
      if (!kicker?.textContent?.trim()) return false;
    }
    if (entryId) {
      const actionBtn = list.querySelector(
        `[data-decision-delete="${entryId}"], [data-decision-repeat="${entryId}"], [data-decision-compare-add="${entryId}"]`
      );
      if (!actionBtn) return false;
    }
    return true;
  };

  await page.waitForFunction(isStable, { categoryId, entryId, minCards }, { timeout: 15000 });
  await page.evaluate((idleTimeoutMs) => new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: idleTimeoutMs });
    } else {
      setTimeout(resolve, 400);
    }
  }), 1200);
  await page.evaluate(() => window.app.loadDecisionHistory());
  await page.waitForFunction(isStable, { categoryId, entryId, minCards }, { timeout: 15000 });
};

/** @deprecated use waitForGecmisHistoryStable */
const waitForGecmisHistoryCategoryKicker = async (page, categoryId) => {
  await waitForGecmisHistoryStable(page, { categoryId });
};

const gecmisHistoryCard = (page, categoryId) => {
  const cards = page.locator('#history-list .decision-history-card');
  if (categoryId) {
    return cards.filter({ has: page.locator(`[data-history-category="${categoryId}"]`) }).first();
  }
  return cards.first();
};

const clickGecmisCompareAdd = async (page, entryId) => {
  await waitForGecmisHistoryStable(page, { entryId });
  const compareBtn = entryId
    ? page.locator(`[data-decision-compare-add="${entryId}"]`)
    : page.locator('[data-decision-compare-add]').first();
  await expect(compareBtn).toBeVisible({ timeout: 15000 });
  await compareBtn.click({ timeout: 15000 });
};

const clickGecmisHistoryAction = async (page, { action, entryId, categoryId } = {}) => {
  const selectors = {
    delete: `[data-decision-delete="${entryId}"]`,
    repeat: `[data-decision-repeat="${entryId}"]`,
    compare: entryId ? `[data-decision-compare-add="${entryId}"]` : '[data-decision-compare-add]'
  };
  const selector = selectors[action];
  if (!selector) {
    throw new Error(`Unknown /gecmis history action: ${action}`);
  }

  await waitForGecmisHistoryStable(page, { categoryId, entryId });
  const actionBtn = action === 'compare' && !entryId
    ? page.locator(selector).first()
    : page.locator(selector);
  await expect(actionBtn).toBeVisible({ timeout: 15000 });
  await actionBtn.click({ timeout: 15000 });
};

/** Wait for decision memory insights panel to survive deferred /gecmis re-renders. */
const waitForGecmisInsightsReady = async (page, { minCards = 2 } = {}) => {
  await waitForGecmisHistoryStable(page, { minCards });
  await page.waitForFunction(({ minCards }) => {
    const insights = document.querySelector('[data-decision-memory-insights]');
    if (!insights) return false;
    if (minCards >= 2) {
      return Boolean(insights.querySelector('[data-memory-insight="top-category"]'));
    }
    return Boolean(insights.querySelector('[data-memory-insights-soft]'));
  }, { minCards }, { timeout: 15000 });
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

    const primaryCta = emptyState.getByRole('link', { name: /Ön değerlendirme başlat/i });
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveAttribute('href', /\/karar-asistani\/?$/);
    await expect(primaryCta).toHaveClass(/btn-primary/);

    const tcoCta = emptyState.getByRole('link', { name: /TCO analizini başlat/i });
    await expect(tcoCta).toBeVisible();
    await expect(tcoCta).toHaveClass(/btn-outline/);
    await expect(tcoCta).toHaveAttribute('href', /\/auto\/?$/);
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
    await expect(summary).toContainText(/Ön değerlendirme sonucu/i);
    await expect(summary).toContainText(/Ön değerlendirme sinyalleri tek bakışta/i);
    await expect(summary).not.toContainText(/Nihai karar sinyalleri/i);
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
    await expect(rationale).toContainText(/ön değerlendirmedeki skor, risk, TCO ve uygunluk sinyallerini açıklar/i);

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

  test('karar asistanı ev sonucundan konut sihirbazına güvenli ön doldurma', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await page.waitForSelector('#premium-karar-analizi-root #assistant-results', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(
      () => typeof window.app?.buildDecisionResult === 'function' && typeof window.app?.ui?.renderDecisionResults === 'function',
      null,
      { timeout: 15000 }
    );

    const renderStatus = await page.evaluate(() => {
      const app = window.app;
      app.assistantCategory = 'ev';
      app.assistantAnswers = {
        province: 'İstanbul',
        district: 'Kadıköy',
        propertyType: 'daire',
        purpose: 'live',
        budget: '7250000',
        location: 'central',
        priority: 'lowMonthly'
      };
      const categoryConfig = app.getResolvedDecisionAssistantConfig()?.ev;
      if (!categoryConfig) return { ok: false, reason: 'ev config missing' };
      const result = app.buildDecisionResult(categoryConfig, app.assistantAnswers);
      if (!result?.recommendations?.[0]) return { ok: false, reason: 'no primary recommendation' };
      app.ui.renderDecisionResults(result);
      return { ok: true };
    });
    expect(renderStatus).toEqual({ ok: true });

    await expect(page.locator('.assistant-decision-hero .assistant-kicker')).toContainText(/Ön değerlendirme tamamlandı/i);

    const toolbarContinue = page.locator('.assistant-decision-toolbar a[data-analytics-placement="decision_result_toolbar"]');
    await expect(toolbarContinue).toBeVisible({ timeout: 15000 });
    await expect(toolbarContinue).toHaveText(/Tam analize devam et/i);
    await expect(toolbarContinue).toHaveClass(/btn-primary/);
    await expect(toolbarContinue).toHaveAttribute('href', /\/konut\/\?/);

    const handoff = page.locator('[data-assistant-vertical-handoff] a[data-native-route]');
    await expect(handoff).toBeVisible({ timeout: 15000 });
    await expect(handoff).toHaveText(/Tam analize devam et/i);
    await expect(handoff).toHaveClass(/btn-primary/);
    await expect(handoff).toHaveAttribute('href', /\/konut\/\?/);

    await Promise.all([
      page.waitForURL(/\/konut\/\?/, { timeout: 15000 }),
      handoff.click()
    ]);

    await page.waitForSelector('#housing-wizard', { timeout: 15000 });
    const prefillHint = page.locator('[data-housing-assistant-prefill]');
    await expect(prefillHint).toBeVisible({ timeout: 15000 });
    await expect(prefillHint).toContainText('Karar Asistanı profilinizden bazı bilgiler önceden dolduruldu');

    await expect(page.locator('[data-field="purchasePurpose"].is-selected')).toHaveAttribute(
      'data-value',
      'Satın almak istiyorum'
    );

    await page.locator('#housing-next').click();
    await expect(page.locator('[data-input="totalBudget"]')).toHaveValue('7250000');

    await page.locator('[data-input="monthlyIncome"]').fill('45000');
    await page.locator('[data-input="monthlyCapacity"]').fill('25000');
    await page.locator('select[data-input="useFinancing"]').selectOption('evet');
    await page.locator('[data-input="loanAmount"]').fill('5000000');

    await page.locator('#housing-next').click();
    await expect(page.locator('select[data-input="city"]')).toHaveValue('İstanbul');
    await expect(page.locator('[data-input="district"]')).toHaveValue('Kadıköy');

    await page.locator('#housing-next').click();
    await expect(page.locator('[data-field="homeType"].is-selected')).toHaveAttribute('data-value', 'Daire');
  });

  test('karar asistanı arac sonucunda browse CTA secondary kalır', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForKararAsistaniRouteBootstrap(page);

    await renderAssistantDecisionResult(page, {
      category: 'arac',
      answers: { budget: '900000', usage: 'city', fuel: 'hybrid', body: 'sedan' }
    });

    const toolbarContinue = assistantDecisionToolbarLocator(page);
    await expect(toolbarContinue).toHaveClass(/btn-primary/);
    await expect(toolbarContinue).toHaveText(/Tam analize devam et/i);

    const browseCta = page.locator('[data-browse-decision-listings]');
    await expect(browseCta).toBeVisible({ timeout: 15000 });
    await expect(browseCta).toHaveClass(/btn-outline/);
    await expect(browseCta).toHaveText(/AI destekli seçenekleri incele/i);
  });

  test('karar asistanı finansman sonucunda browse CTA gösterilmez', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForKararAsistaniRouteBootstrap(page);

    await renderAssistantDecisionResult(page, {
      category: 'finansman',
      answers: { purpose: 'konut', amount: '500000', term: '120' }
    });

    const toolbarContinue = assistantDecisionToolbarLocator(page);
    await expect(toolbarContinue).toHaveAttribute('href', /\/finans\/\?/);
    await expect(page.locator('[data-browse-decision-listings]')).toHaveCount(0);
  });

  test('karar asistanı canonical vertical handoff hedefleri', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForKararAsistaniRouteBootstrap(page);

    const cases = [
      { category: 'arac', answers: { budget: '900000' }, href: /\/auto\/\?budget=900000/ },
      { category: 'tatil', answers: { vacationType: 'familyResort', budget: '25000' }, href: /\/tatil\/\?/ },
      { category: 'finansman', answers: { purpose: 'konut', budget: '500000', term: '60' }, href: /\/finans\/\?/ },
      { category: 'sigorta', answers: { insuranceType: 'saglik', risk_perception: 'dusuk' }, href: /\/sigorta\/\?/ },
      { category: 'kasko', answers: { vehicle_category: 'otomobil', vehicle_year_band: '0-3' }, href: /\/kasko\/\?/ }
    ];

    for (const item of cases) {
      await renderAssistantDecisionResult(page, item);

      const toolbarContinue = assistantDecisionToolbarLocator(page);
      await expect(toolbarContinue).toHaveAttribute('href', item.href);
      await expect(toolbarContinue).toHaveText(/Tam analize devam et/i);
    }
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
    await waitForGecmisRouteBootstrap(page);
    await page.evaluate(() => {
      window.app.currentUser = { id: 'e2e-canonical-history-user', name: 'E2E User' };
      window.app.loadDecisionHistory();
    });
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'history');
    await waitForGecmisHistoryStable(page, { categoryId: 'auto' });
    const card = gecmisHistoryCard(page, 'auto');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText(/Toyota Corolla/i);

    const signalStrip = card.locator('[data-decision-history-signal-strip]');
    await expect(signalStrip).toBeVisible();
    await expect(signalStrip.locator('[data-history-signal="history-fit"]')).toContainText(/Uygunluk/i);
    await expect(signalStrip.locator('[data-history-signal="history-risk"]')).toContainText(/Risk/i);
    await expect(signalStrip.locator('[data-history-signal="history-tco"]')).toContainText(/TCO/i);
    await expect(signalStrip.locator('[data-history-signal="history-profile"]')).toContainText(/Profil/i);
    await expect(signalStrip.locator('[data-history-signal="history-fit"]')).toContainText(/\/100/);
    await expect(signalStrip.locator('[data-history-signal="history-risk"]')).not.toContainText(/^—$/);
    await expect(signalStrip.locator('[data-history-signal="history-tco"]')).not.toContainText(/^—$/);
    await expect(signalStrip.locator('[data-history-signal="history-profile"]')).not.toContainText(/^—$/);

    const resultSummary = card.locator('[data-decision-history-result-summary]');
    await expect(resultSummary).toBeVisible({ timeout: 15000 });
    await expect(resultSummary).toContainText(/Kayıtlı karar sinyalleri/i);
    await expect(resultSummary).toContainText(/\/100/);
    await expect(resultSummary).toContainText(/Risk/i);
    await expect(resultSummary).toContainText(/TCO/i);
    await expect(resultSummary).toContainText(/Profil/i);

    const detailPanel = card.locator('[data-decision-history-detail]');
    const metrics = card.locator('.decision-history-metrics');
    await expect(detailPanel).toBeVisible();
    await expect(metrics).not.toBeVisible();
    await detailPanel.locator('.decision-history-detail-summary').click();
    await expect(metrics).toBeVisible();
    await expect(metrics).toContainText(/Tahmini fiyat|Fiyat/i);
  });

  test('karar geçmişi legacy entry ile yüklenir ve sinyal şeridi fallback gösterir', async ({ page }) => {
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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
    await waitForGecmisHistoryStable(page, { categoryId: 'auto' });
    const card = gecmisHistoryCard(page, 'auto');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText(/Toyota Corolla/i);

    const signalStrip = card.locator('[data-decision-history-signal-strip]');
    await expect(signalStrip).toBeVisible({ timeout: 15000 });
    await expect(signalStrip.locator('[data-history-signal="history-fit"]')).toContainText('82/100');
    await expect(signalStrip.locator('[data-history-signal="history-risk"]')).toContainText(/Orta risk/i);
    await expect(signalStrip.locator('[data-history-signal="history-profile"]')).toContainText(/Dengeli araç profili/i);

    // 2D-1c intentionally surfaces persisted snapshots only; no legacy fallback generation.
    await expect(card.locator('[data-decision-history-result-summary]')).toHaveCount(0);

    const detailPanel = card.locator('[data-decision-history-detail]');
    await expect(detailPanel).toBeVisible();
    await expect(signalStrip).toBeVisible();
    await detailPanel.locator('.decision-history-detail-summary').click();
    await expect(card.locator('.decision-history-metrics')).toBeVisible();
    await expect(card.locator('.decision-history-answers')).toContainText(/İl:\s*İstanbul/i);
    await expect(signalStrip).toBeVisible();
  });

  test('karar geçmişi sinyal şeridi @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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
        resultSummary: {
          fit: {
            label: 'Uyum',
            value: '88/100',
            detail: 'Profil ile güçlü eşleşme'
          },
          risk: {
            label: 'Risk',
            value: 'Düşük risk',
            detail: 'Yan maliyetler dengeli'
          },
          tco: {
            label: 'TCO özeti',
            value: '240.000 TL/yıl',
            detail: 'Toplam dönemsel maliyet kontrol altında'
          },
          profile: {
            label: 'Profil',
            value: 'Toyota Corolla Hybrid',
            detail: 'Profil detayı mobil görünümde uzun metinle taşmadan kalmalı'
          }
        },
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

    await waitForGecmisHistoryStable(page);
    const card = gecmisHistoryCard(page);
    await expect(card).toBeVisible({ timeout: 15000 });
    const signalStrip = card.locator('[data-decision-history-signal-strip]');
    await expect(signalStrip).toBeVisible({ timeout: 15000 });
    await assertElementNoHorizontalOverflow(page, '.decision-history-card [data-decision-history-signal-strip]');

    const resultSummary = card.locator('[data-decision-history-result-summary]');
    await expect(resultSummary).toBeVisible({ timeout: 15000 });
    await assertElementNoHorizontalOverflow(page, '.decision-history-card [data-decision-history-result-summary]');
    await assertLocatorWithinViewport(resultSummary, MOBILE_2C_VIEWPORT.width);

    const detailPanel = card.locator('[data-decision-history-detail]');
    await expect(detailPanel).toBeVisible({ timeout: 15000 });
    await assertElementNoHorizontalOverflow(page, '.decision-history-card [data-decision-history-detail] .decision-history-detail-summary');
    await detailPanel.locator('.decision-history-detail-summary').click();
    await assertElementNoHorizontalOverflow(page, '.decision-history-card .decision-history-detail-panel');
    await assertElementNoHorizontalOverflow(page, '.decision-history-card .decision-history-metrics');
    await assertElementNoHorizontalOverflow(page, '.decision-history-card .decision-history-answers');

    await assertLocatorWithinViewport(card, MOBILE_2C_VIEWPORT.width);
  });

  test('gecmis canonical entry Karşılaştırmaya ekle CTA ile karşılaştırmaya ekler', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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
    await waitForGecmisHistoryStable(page);
    await expect(compareBtn).toBeVisible({ timeout: 15000 });
    await expect(compareBtn).toContainText(/Karşılaştırmaya ekle/i);
    await compareBtn.click({ timeout: 15000 });

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
    await waitForKararAsistaniRouteBootstrap(page);

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

  test('karar merkezi karar hafızası bağlamı ≥2 kayıtta görünür', async ({ page }) => {
    const memoryUserId = 'e2e-memory-context-user';

    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForKararAsistaniRouteBootstrap(page);

    const seedStatus = await page.evaluate((userId) => {
      const app = window.app;
      app.currentUser = { id: userId, name: 'E2E Memory Context User' };
      const storageKey = `${'istebul_decision_history'}:${userId}`;
      const entries = [
        {
          id: 'context-1',
          schemaVersion: 1,
          categoryId: 'auto',
          categoryName: 'Araba',
          createdAt: '2026-06-08T12:00:00.000Z',
          score: 88,
          riskLevel: 'Düşük risk',
          decisionProfile: 'Dengeli araç profili',
          topPick: { name: 'Toyota Corolla Hybrid', score: 88, riskLevel: 'Düşük risk' }
        },
        {
          id: 'context-2',
          schemaVersion: 1,
          categoryId: 'auto',
          categoryName: 'Araba',
          createdAt: '2026-06-07T12:00:00.000Z',
          score: 82,
          riskLevel: 'Düşük risk',
          decisionProfile: 'Dengeli araç profili',
          topPick: { name: 'Honda Civic', score: 82, riskLevel: 'Düşük risk' }
        }
      ];
      localStorage.setItem(storageKey, JSON.stringify(entries));
      app.decisionHistory = entries;
      app.ui.renderDecisionMemoryContext(entries);
      const stored = localStorage.getItem(storageKey);
      const parsed = JSON.parse(stored || '[]');
      return { count: parsed.length, firstId: parsed[0]?.id || null };
    }, memoryUserId);
    expect(seedStatus).toEqual({ count: 2, firstId: 'context-1' });

    const context = page.locator('[data-decision-memory-context]');
    await expect(context).toBeVisible({ timeout: 15000 });
    await expect(context).toContainText(/Karar hafızasından bağlam/i);
    await expect(context.locator('[data-memory-context-summary]')).toContainText(/düşük risk profili daha sık görülüyor/i);
    await expect(context.locator('[data-memory-context="top-category"]')).toContainText(/Araba \(2 karar\)/);
    await expect(context.locator('[data-memory-context="risk-tendency"]')).toContainText(/Düşük risk \(2\/2\)/);
    await expect(context.locator('[data-memory-context="top-profile"]')).toContainText(/Dengeli araç profili/);

    const storageSnapshot = await page.evaluate((userId) => {
      const storageKey = `${'istebul_decision_history'}:${userId}`;
      const stored = localStorage.getItem(storageKey);
      const parsed = JSON.parse(stored || '[]');
      return { count: parsed.length, firstId: parsed[0]?.id || null };
    }, memoryUserId);
    expect(storageSnapshot.count).toBe(2);
    expect(storageSnapshot.firstId).toBe('context-1');
  });

  test('karar merkezi karar hafızası bağlamı 2 kayıttan az iken görünmez', async ({ page }) => {
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);

    await page.evaluate(() => {
      const userId = 'e2e-memory-context-empty-user';
      window.app.currentUser = { id: userId, name: 'E2E Memory Context Empty User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([{
        id: 'context-single',
        schemaVersion: 1,
        categoryId: 'auto',
        categoryName: 'Araba',
        createdAt: '2026-06-08T12:00:00.000Z',
        score: 88,
        riskLevel: 'Düşük risk',
        topPick: { name: 'Toyota Corolla Hybrid', score: 88, riskLevel: 'Düşük risk' }
      }]));
      window.app.decisionHistory = JSON.parse(localStorage.getItem(storageKey) || '[]');
      window.app.ui.renderDecisionMemoryContext(window.app.decisionHistory);
    });

    await expect(page.locator('[data-decision-memory-context]')).toHaveCount(0);
    await expect(page.locator('#decision-memory-context-host')).toBeEmpty();
  });

  test('gecmis Karşılaştırmaya ekle CTA @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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

    await waitForGecmisHistoryStable(page);
    const card = gecmisHistoryCard(page);
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
    await waitForKararAsistaniRouteBootstrap(page);

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
    await waitForKararAsistaniRouteBootstrap(page);

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
    await waitForGecmisRouteBootstrap(page);

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

    const card = gecmisHistoryCard(page);
    await expect(card).toBeVisible({ timeout: 15000 });
    await clickGecmisCompareAdd(page, 'history-compare-auto');
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
    test.setTimeout(60000);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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

    await clickGecmisCompareAdd(page, 'history-compare-konut');
    await expect(page.locator('.notification.success').filter({ hasText: /Karar geçmişi karşılaştırmaya eklendi/i })).toBeVisible({ timeout: 15000 });

    const comparisonState = await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem('istebul_comparison_items') || '[]');
      return { categoryId: items[0]?.categoryId || null, categoryName: items[0]?.categoryName || null };
    });
    expect(comparisonState.categoryId).toBe('konut');
    expect(comparisonState.categoryName).toBe('Konut');
  });

  test('gecmis normalized kategori label @390px yatay taşma yapmaz', async ({ page }) => {
    // Pre-existing mobile layout gate: deferred loadDecisionHistory race (Faz 2D, not 2E-2).
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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

    await waitForGecmisHistoryStable(page, { categoryId: 'auto' });
    const card = gecmisHistoryCard(page, 'auto');
    const kicker = card.locator('[data-history-category="auto"]');
    await expect(kicker).toBeVisible({ timeout: 15000 });
    await expect(kicker).toHaveText('Araba', { timeout: 15000 });
    await assertElementNoHorizontalOverflow(page, '.decision-history-card');
    await assertLocatorWithinViewport(card, MOBILE_2C_VIEWPORT.width);
  });

  test('karar merkezi son kararlar snippet normalized kategori @390px yatay taşma yapmaz', async ({ page }) => {
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/karar-asistani/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForKararAsistaniRouteBootstrap(page);

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
    test.setTimeout(60000);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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

    await clickGecmisCompareAdd(page);
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
    await waitForKararAsistaniRouteBootstrap(page);

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
    // Pre-existing mobile layout gate: deferred loadDecisionHistory race (Faz 2D-5, not 2E-2).
    await page.setViewportSize(MOBILE_2C_VIEWPORT);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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

    await waitForGecmisHistoryStable(page, { categoryId: 'konut' });
    const card = gecmisHistoryCard(page, 'konut');
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText(/Bostancı daire/i);
    await expect(card.locator('[data-history-category="konut"]')).toHaveText('Konut', { timeout: 15000 });
    await assertElementNoHorizontalOverflow(page, '.decision-history-card');
    await assertLocatorWithinViewport(card, MOBILE_2C_VIEWPORT.width);
  });

  test('gecmis delete action kaydı siler ve localStorage günceller', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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

    await waitForGecmisHistoryStable(page, { entryId: 'delete-target', minCards: 2 });
    await expect(page.locator('.decision-history-card')).toHaveCount(2, { timeout: 15000 });
    await clickGecmisHistoryAction(page, { action: 'delete', entryId: 'delete-target' });
    await expect(page.locator('.notification.success').filter({ hasText: /Karar geçmişten silindi/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.decision-history-card')).toHaveCount(1);
    await expect(page.locator('.decision-history-card').first()).toContainText(/Kadıköy daire/i);

    const remaining = await page.evaluate(() => {
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      return JSON.parse(localStorage.getItem(storageKey) || '[]').map((entry) => entry.id);
    });
    expect(remaining).toEqual(['delete-keep']);
  });

  test('gecmis canonical ev kaydı Tam analize devam et ile konut verticalına gider', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

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

    await clickGecmisHistoryAction(page, { action: 'repeat', entryId: 'repeat-ev-canonical', categoryId: 'konut' });
    await expect(page).toHaveURL(/\/konut\/\?/, { timeout: 15000 });
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
    await expect(page.locator('[data-decision-memory-insights]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-memory-insights-soft]')).toContainText(/yeterli karar geçmişi yok/i);
    await expect(page.locator('[data-decision-memory-ai-commentary]')).toHaveCount(0);
  });

  test('gecmis karar hafızası içgörüleri canonical kayıtlarla görünür', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/gecmis/');
    await waitForSpaReady(page);
    await dismissCookieBanner(page);
    await waitForGecmisRouteBootstrap(page);

    await page.evaluate(() => {
      const userId = 'e2e-memory-insights-user';
      window.app.currentUser = { id: userId, name: 'E2E Insights User' };
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      localStorage.setItem(storageKey, JSON.stringify([
        {
          id: 'insights-1',
          schemaVersion: 1,
          categoryId: 'auto',
          categoryName: 'Araba',
          originalCategoryId: 'arac',
          createdAt: '2026-06-08T12:00:00.000Z',
          score: 88,
          riskLevel: 'Düşük risk',
          decisionProfile: 'Dengeli araç profili',
          topPick: { name: 'Toyota Corolla Hybrid', score: 88, riskLevel: 'Düşük risk' }
        },
        {
          id: 'insights-2',
          schemaVersion: 1,
          categoryId: 'auto',
          categoryName: 'Araba',
          originalCategoryId: 'arac',
          createdAt: '2026-06-07T12:00:00.000Z',
          score: 82,
          riskLevel: 'Orta risk',
          decisionProfile: 'Dengeli araç profili',
          topPick: { name: 'Honda Civic', score: 82, riskLevel: 'Orta risk' }
        }
      ]));
      window.app.loadDecisionHistory();
    });

    await waitForGecmisInsightsReady(page, { minCards: 2 });
    const insights = page.locator('[data-decision-memory-insights]');
    await expect(insights).toBeVisible({ timeout: 15000 });
    await expect(insights).toContainText(/Karar hafızası içgörüleri/i);
    await expect(insights.locator('[data-memory-insight="top-category"]')).toContainText(/Araba \(2 karar\)/);
    await expect(insights.locator('[data-memory-insight="average-fit"]')).toContainText(/85\/100/);
    await expect(insights.locator('[data-memory-insight="top-profile"]')).toContainText(/Dengeli araç profili/);

    const commentary = insights.locator('[data-decision-memory-ai-commentary]');
    await expect(commentary).toBeVisible();
    await expect(commentary.getByRole('heading', { name: /AI destekli geçmiş yorumu/i })).toBeVisible();
    await expect(commentary.locator('[data-memory-ai-synthesis]')).toContainText(/karar kayd/i);

    const commentaryText = await commentary.innerText();
    expect(commentaryText).toMatch(/kategori|risk|uygunluk|profil/i);
    expect(commentaryText).not.toMatch(/bunu seçmelisiniz|en doğru karar|bundan sonra böyle yapın|tek doğru seçenek/i);

    const storageSnapshot = await page.evaluate(() => {
      const storageKey = window.app.getUserHistoryStorageKey('istebul_decision_history');
      const stored = localStorage.getItem(storageKey);
      const parsed = JSON.parse(stored || '[]');
      return {
        count: parsed.length,
        firstId: parsed[0]?.id || null,
        schemaVersion: parsed[0]?.schemaVersion ?? null
      };
    });
    expect(storageSnapshot.count).toBe(2);
    expect(storageSnapshot.firstId).toBe('insights-1');
    expect(storageSnapshot.schemaVersion).toBe(1);
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

    const primaryCta = emptyState.getByRole('link', { name: /Kararını analiz et/i });
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
