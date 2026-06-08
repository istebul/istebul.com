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
    await page.waitForFunction(() => window.app?.buildDecisionResult, null, { timeout: 15000 });

    await page.evaluate(() => {
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
      const result = app.buildDecisionResult(app.getResolvedDecisionAssistantConfig().arac, app.assistantAnswers);
      app.ui.renderDecisionResults(result);
    });

    const summary = page.locator('[data-decision-result-summary]');
    await expect(summary).toBeVisible({ timeout: 15000 });
    await expect(summary.locator('[data-result-summary-field="fit-summary"] span').first()).toHaveText('Uygunluk özeti');
    await expect(summary.locator('[data-result-summary-field="risk-summary"] span').first()).toHaveText('Risk özeti');
    await expect(summary.locator('[data-result-summary-field="tco-summary"] span').first()).toHaveText('TCO özeti');
    await expect(summary.locator('[data-result-summary-field="profile-summary"] span').first()).toHaveText('Karar profili özeti');
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
