import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/', heading: /yalnız değilsiniz/i },
  { path: '/auto/', selector: '#vacation-flow, #auto-flow, .vacation-main, main' },
  { path: '/konut/', selector: 'main' },
  { path: '/tatil/', selector: 'main' },
  { path: '/finans/', selector: 'main' },
  { path: '/sigorta/', heading: /sigorta|veriye dayalı/i },
  { path: '/kasko/', heading: /kasko|veriye dayalı/i }
];

const RESPONSIVE_PATHS = ['/', '/auto/'];
const VIEWPORTS = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 }
];

test.describe('Site health — readability and layout', () => {
  for (const pageDef of PAGES) {
    test(`${pageDef.path} loads without horizontal overflow`, async ({ page }) => {
      await page.goto(pageDef.path);
      await page.waitForLoadState('domcontentloaded');

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 2;
      });
      expect(overflow).toBe(false);
    });
  }

  for (const viewport of VIEWPORTS) {
    for (const pagePath of RESPONSIVE_PATHS) {
      test(`${pagePath} @ ${viewport.label} has no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(pagePath);
        await page.waitForLoadState('domcontentloaded');

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > doc.clientWidth + 2;
        });
        expect(overflow).toBe(false);
      });
    }
  }

  test('/profil/ logged out loads account shell without crash', async ({ page }) => {
    await page.goto('/profil/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('html')).toHaveAttribute('data-ib-route', 'profil');
    await expect(page.locator('#profil')).toBeVisible();
    await expect(page.locator('#account-root')).toContainText(/Karar Merkezi/i);
    await expect(page.locator('#account-root').getByRole('button', { name: /Hesabına gir/i }).first()).toBeVisible();
  });

  test('homepage uses consolidated CSS bundles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const styleLinks = await page.locator('link[rel="stylesheet"]').count();
    // Home may load one additional static stylesheet besides consolidated bundles.
    expect(styleLinks).toBeLessThanOrEqual(4);
    const bundle = await page.locator('link[href*="homepage.bundle"]').count();
    expect(bundle).toBeGreaterThan(0);
  });

  async function openKaskoWizard(page) {
    await page.locator('#kasko-flow').scrollIntoViewIfNeeded();
    const cta = page.locator('#kasko-hero-cta');
    await cta.click({ force: true });
    await expect(page.locator('#kasko-wizard')).toBeVisible();
  }

  async function completeKaskoWizard(page) {
    await openKaskoWizard(page);
    await page.locator('#kasko-wizard [data-manual="age"]').fill('35');
    await page.locator('#kasko-wizard [data-field="license_years"][data-value="11plus"]').click();
    await page.locator('#kasko-wizard [data-field="usage_type"][data-value="ozel"]').click();
    await page.locator('#kasko-next').click();
    await page.locator('#kasko-wizard [data-field="vehicle_category"][data-value="suv"]').click();
    await page.locator('#kasko-wizard [data-field="vehicle_year_band"][data-value="0-3"]').click();
    await page.locator('#kasko-next').click();
    await page.locator('#kasko-wizard [data-field="coverage_level"][data-value="full"]').click();
    await page.locator('#kasko-next').click();
    await page.locator('#kasko-wizard [data-field="risk_perception"][data-value="yuksek"]').click();
    await page.locator('#kasko-next').click();
    await page.locator('#kasko-wizard [data-field="budget_level"][data-value="yuksek"]').click();
    await page.locator('#kasko-next').click();
    await expect(page.locator('#kasko-results')).toBeVisible();
  }

  test('/kasko/ wizard shell is interactive', async ({ page }) => {
    await page.goto('/kasko/');
    await page.waitForLoadState('domcontentloaded');
    await openKaskoWizard(page);
  });

  test('/kasko/ completes flow and shows AI results', async ({ page }) => {
    await page.goto('/kasko/');
    await page.waitForLoadState('domcontentloaded');
    await completeKaskoWizard(page);
    await expect(page.locator('#kasko-results .kasko-v2-root')).toBeVisible();
    await expect(page.locator('#kasko-results .ib-insight-blocks')).toContainText(/karar|skor|teminat|risk/i);
    await expect(page.locator('#kasko-wizard')).toBeHidden();
  });

  test('/kasko/ without decision_cards flag keeps legacy card renderer hidden', async ({ page }) => {
    await page.goto('/kasko/');
    await page.waitForLoadState('domcontentloaded');
    await completeKaskoWizard(page);
    await expect(page.locator('#kasko-results .ib-decision-category-card')).toHaveCount(0);
    await expect(page.locator('#kasko-results .vacation-result-card').first()).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-decision-cards', '1');
  });

  test('/kasko/?decision_cards=1 shows decision category cards with stable score', async ({ page }) => {
    await page.goto('/kasko/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeKaskoWizard(page);

    const cards = page.locator('#kasko-results .ib-decision-category-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('html')).toHaveAttribute('data-decision-cards', '1');

    const firstCard = cards.first();
    const scoreAttr = await firstCard.getAttribute('data-decision-score');
    const scoreText = await firstCard.locator('.ib-decision-card__score-value').innerText();
    expect(scoreAttr).toBe(scoreText.trim());
    await expect(firstCard.locator('.ib-decision-card__ai-summary')).not.toBeEmpty();
    await expect(firstCard.locator('.ib-decision-card__signals .ib-decision-card__signal')).toHaveCount(4);
  });

  test('/kasko/?decision_cards=1 card CTA selects scenario', async ({ page }) => {
    await page.goto('/kasko/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeKaskoWizard(page);

    const target = page.locator('#kasko-results .ib-decision-category-card[data-option="economic"]');
    await target.locator('.ib-decision-card-select').click();
    await expect(target).toHaveClass(/is-selected/);
    await expect(page.locator('#kasko-selection-bar')).toBeVisible();
    await expect(page.locator('#kasko-confirm-selection')).toBeEnabled();
    await expect(page.locator('#kasko-results .vacation-selection-picked')).toContainText(/ekonomik/i);
  });

  test('/kasko/?decision_cards=1 @390px decision cards avoid horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/kasko/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeKaskoWizard(page);
    await expect(page.locator('#kasko-results .ib-decision-category-card').first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });

  async function completeSigortaWizard(page) {
    await page.locator('#sigorta-hero-cta').click();
    await expect(page.locator('#sigorta-wizard')).toBeVisible();

    await page.locator('#sigorta-wizard [data-field="insurance_type"][data-value="arac"]').click();
    await page.locator('#sigorta-next').click();

    await page.locator('#sigorta-wizard [data-manual="age"]').fill('35');
    await page.locator('#sigorta-wizard [data-field="license_years"][data-value="3-10"]').click();
    await page.locator('#sigorta-wizard [data-field="usage_type"][data-value="ozel"]').click();
    await page.locator('#sigorta-next').click();

    await page.locator('#sigorta-wizard [data-field="vehicle_category"][data-value="otomobil"]').click();
    await page.locator('#sigorta-wizard [data-field="vehicle_year_band"][data-value="4-10"]').click();
    await page.locator('#sigorta-next').click();

    await page.locator('#sigorta-wizard [data-field="risk_perception"][data-value="orta"]').click();
    await page.locator('#sigorta-next').click();

    await page.locator('#sigorta-wizard [data-field="budget_level"][data-value="orta"]').click();
    await page.locator('#sigorta-next').click();

    await expect(page.locator('#sigorta-results')).toBeVisible();
  }

  test('/sigorta/ wizard shell is interactive', async ({ page }) => {
    await page.goto('/sigorta/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#sigorta-hero-cta').click();
    await expect(page.locator('#sigorta-wizard')).toBeVisible();
    await expect(page.locator('#sigorta-wizard button, #sigorta-wizard [role="button"]').first()).toBeVisible();
  });

  test('/sigorta/?decision_cards=1 shows decision category cards with engine score', async ({ page }) => {
    await page.goto('/sigorta/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeSigortaWizard(page);

    const cards = page.locator('#sigorta-results .ib-decision-category-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('html')).toHaveAttribute('data-decision-cards', '1');

    const firstCard = cards.first();
    const scoreAttr = await firstCard.getAttribute('data-decision-score');
    const scoreText = await firstCard.locator('.ib-decision-card__score-value').innerText();
    expect(scoreAttr).toBe(scoreText.trim());

    const engineScoreText = await page
      .locator('#sigorta-results .sigorta-v2-kpi--decision strong')
      .innerText();
    const engineScore = engineScoreText.replace(/\/100/i, '').trim();
    expect(scoreAttr).toBe(engineScore);

    await expect(firstCard.locator('.ib-decision-card__ai-summary')).not.toBeEmpty();
    await expect(firstCard.locator('.ib-decision-card__signals .ib-decision-card__signal')).toHaveCount(4);
  });

  test('/sigorta/?decision_cards=1 card CTA selects scenario', async ({ page }) => {
    await page.goto('/sigorta/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeSigortaWizard(page);

    const target = page.locator('#sigorta-results .ib-decision-category-card[data-option="economic"]');
    await target.locator('.ib-decision-card-select').click();
    await expect(target).toHaveClass(/is-selected/);
    await expect(page.locator('#sigorta-selection-bar')).toBeVisible();
    await expect(page.locator('#sigorta-confirm-selection')).toBeEnabled();
    await expect(page.locator('#sigorta-results .vacation-selection-picked')).toContainText(/ekonomik/i);
  });

  test('/sigorta/?decision_cards=1 secondary compare CTA does not change selection', async ({ page }) => {
    await page.goto('/sigorta/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeSigortaWizard(page);

    const defaultSelected = page.locator('#sigorta-results .ib-decision-category-card.is-selected').first();
    const defaultOption = await defaultSelected.getAttribute('data-option');

    const target = page.locator('#sigorta-results .ib-decision-category-card[data-option="economic"]');
    await target.locator('.ib-decision-card-secondary').click();

    await expect(target).not.toHaveClass(/is-selected/);
    if (defaultOption) {
      await expect(
        page.locator(`#sigorta-results .ib-decision-category-card[data-option="${defaultOption}"]`)
      ).toHaveClass(/is-selected/);
    }
    await expect(page.locator('#sigorta-results .sigorta-v2-coverage')).toBeVisible();
  });

  test('/sigorta/?decision_cards=1 @390px decision cards avoid horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/sigorta/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeSigortaWizard(page);
    await expect(page.locator('#sigorta-results .ib-decision-category-card').first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });

  async function openFinansWizard(page) {
    await page.locator('#finans-flow').scrollIntoViewIfNeeded();
    await page.locator('#finans-hero-cta').click({ force: true });
    await expect(page.locator('#finans-wizard')).toBeVisible();
  }

  async function completeFinansWizard(page) {
    await openFinansWizard(page);

    await page.locator('#finans-wizard [data-field="purpose"][data-value="konut"]').click();
    await page.locator('#finans-next').click();

    await page.locator('#finans-wizard [data-field="amount_range"][data-value="1m"]').click();
    await page.locator('#finans-next').click();

    await page.locator('#finans-wizard [data-field="term_months"][data-value="36"]').click();
    await page.locator('#finans-next').click();

    await page.locator('#finans-wizard [data-field="capacity_range"][data-value="25k"]').click();
    await page.locator('#finans-next').click();

    await page.locator('#finans-wizard [data-manual="monthly_income"]').fill('55000');
    await page.locator('#finans-wizard [data-manual="monthly_expense"]').fill('18000');
    await page.locator('#finans-wizard [data-manual="existing_debt"]').fill('6000');
    await page.locator('#finans-wizard [data-field="income_type"][data-value="stabil"]').click();
    await page.locator('#finans-wizard [data-field="early_payment"][data-value="belki"]').click();
    await page.locator('#finans-next').click();

    await page.locator('#finans-wizard [data-field="rate_sensitivity"][data-value="orta"]').click();
    await page.locator('#finans-wizard [data-field="risk_tolerance"][data-value="dengeli"]').click();
    await page.locator('#finans-next').click();

    await expect(page.locator('#finans-results')).toBeVisible();
    await expect(page.locator('#finans-results .finansman-v2-root')).toBeVisible({ timeout: 15000 });
  }

  async function completeTatilWizard(page) {
    await page.locator('#vacation-hero-cta').click();
    await expect(page.locator('#vacation-wizard')).toBeVisible();

    await page.locator('#vacation-wizard [data-field="vacation_goal"][data-value="deniz"]').click();
    await page.locator('#vacation-next').click();

    await page.locator('#vacation-wizard [data-field="vacation_type"][data-value="deniz-resort"]').click();
    await page.locator('#vacation-next').click();

    await page.locator('#vacation-wizard [data-field="people_type"][data-value="aile"]').click();
    await page.locator('#vacation-travelers-count').fill('4');
    await page.locator('#vacation-next').click();

    await page.locator('#vacation-wizard [data-field="budget_range"][data-value="dengeli"]').click();
    await page.locator('#vacation-next').click();

    await page.locator('#vacation-wizard input[name="date_flexibility"][value="undecided"]').check();
    await page.locator('#vacation-next').click();

    await page.locator('#vacation-wizard [data-field="transport_preference"][data-value="ucak"]').click();
    await page.locator('#vacation-wizard [data-field="comfort_expectation"][data-value="dengeli"]').click();
    await page.locator('#vacation-next').click();

    await page.locator('#vacation-wizard .vacation-chip').first().click();
    await page.locator('#vacation-next').click();
    await page.locator('#vacation-next').click();

    await expect(page.locator('#vacation-results')).toBeVisible();
    await expect(page.locator('#vacation-results .tatil-v2-root')).toBeVisible({ timeout: 15000 });
  }

  test('/finans/ wizard completes flow and shows V2 results', async ({ page }) => {
    await page.goto('/finans/');
    await page.waitForLoadState('domcontentloaded');
    await completeFinansWizard(page);

    await expect(page.locator('#finans-wizard')).toBeHidden();
    await expect(page.locator('#finans-next')).not.toHaveClass(/is-loading/);
    await expect(page.locator('[data-finansman-v2-pdf]')).toContainText(/PDF olarak kaydet/i);
  });

  test('/finans/ without decision_cards flag keeps legacy card renderer hidden', async ({ page }) => {
    await page.goto('/finans/');
    await page.waitForLoadState('domcontentloaded');
    await completeFinansWizard(page);
    await expect(page.locator('#finans-results .ib-decision-category-card')).toHaveCount(0);
    await expect(page.locator('#finans-results .vacation-result-card').first()).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-decision-cards', '1');
  });

  test('/finans/?decision_cards=1 shows decision category cards with engine score', async ({ page }) => {
    await page.goto('/finans/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeFinansWizard(page);

    const cards = page.locator('#finans-results .ib-decision-category-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('html')).toHaveAttribute('data-decision-cards', '1');

    const firstCard = cards.first();
    const scoreAttr = await firstCard.getAttribute('data-decision-score');
    const scoreText = await firstCard.locator('.ib-decision-card__score-value').innerText();
    expect(scoreAttr).toBe(scoreText.trim());

    const engineScoreText = await page
      .locator('#finans-results .ib-results-score-ring__gauge strong')
      .innerText();
    const engineScore = engineScoreText.replace(/\/100/i, '').trim();
    expect(scoreAttr).toBe(engineScore);

    await expect(firstCard.locator('.ib-decision-card__ai-summary')).not.toBeEmpty();
    await expect(firstCard.locator('.ib-decision-card__signals .ib-decision-card__signal')).toHaveCount(4);
  });

  test('/finans/?decision_cards=1 card CTA selects scenario', async ({ page }) => {
    await page.goto('/finans/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeFinansWizard(page);

    const target = page.locator('#finans-results .ib-decision-category-card[data-option="economic"]');
    await target.locator('.ib-decision-card-select').click();
    await expect(target).toHaveClass(/is-selected/);
    await expect(page.locator('#finans-selection-bar')).toBeVisible();
    await expect(page.locator('#finans-confirm-selection')).toBeEnabled();
    await expect(page.locator('#finans-results .vacation-selection-picked')).toContainText(/uzun vade|düşük taksit/i);
  });

  test('/finans/?decision_cards=1 secondary compare CTA does not change selection', async ({ page }) => {
    await page.goto('/finans/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeFinansWizard(page);

    const defaultSelected = page.locator('#finans-results .ib-decision-category-card.is-selected').first();
    const defaultOption = await defaultSelected.getAttribute('data-option');

    const target = page.locator('#finans-results .ib-decision-category-card[data-option="economic"]');
    await target.locator('.ib-decision-card-secondary').click();

    await expect(target).not.toHaveClass(/is-selected/);
    if (defaultOption) {
      await expect(
        page.locator(`#finans-results .ib-decision-category-card[data-option="${defaultOption}"]`)
      ).toHaveClass(/is-selected/);
    }
    await expect(page.locator('#finans-results .finansman-v2-rate-table')).toBeVisible();
  });

  test('/finans/?decision_cards=1 @390px decision cards avoid horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/finans/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeFinansWizard(page);
    await expect(page.locator('#finans-results .ib-decision-category-card').first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });

  test('/tatil/ without decision_cards flag keeps legacy card renderer hidden', async ({ page }) => {
    await page.goto('/tatil/');
    await page.waitForLoadState('domcontentloaded');
    await completeTatilWizard(page);
    await expect(page.locator('#vacation-results .ib-decision-category-card')).toHaveCount(0);
    await expect(page.locator('#vacation-results .vacation-result-card').first()).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-decision-cards', '1');
  });

  test('/tatil/?decision_cards=1 shows decision category cards with stable score', async ({ page }) => {
    await page.goto('/tatil/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeTatilWizard(page);

    const cards = page.locator('#vacation-results .ib-decision-category-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('html')).toHaveAttribute('data-decision-cards', '1');

    const firstCard = cards.first();
    const scoreAttr = await firstCard.getAttribute('data-decision-score');
    const scoreText = await firstCard.locator('.ib-decision-card__score-value').innerText();
    expect(scoreAttr).toBe(scoreText.trim());

    await expect(firstCard.locator('.ib-decision-card__ai-summary')).not.toBeEmpty();
    const signalCount = await firstCard.locator('.ib-decision-card__signals .ib-decision-card__signal').count();
    expect(signalCount).toBeGreaterThanOrEqual(2);
    expect(signalCount).toBeLessThanOrEqual(4);
  });

  test('/tatil/?decision_cards=1 card CTA selects scenario', async ({ page }) => {
    await page.goto('/tatil/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeTatilWizard(page);

    const target = page.locator('#vacation-results .ib-decision-category-card[data-option="kusadasi-didim"]');
    await target.locator('.ib-decision-card-select').click();
    await expect(target).toHaveClass(/is-selected/);
    await expect(page.locator('#vacation-selection-bar')).toBeVisible();
    await expect(page.locator('#vacation-confirm-selection')).toBeEnabled();
    await expect(page.locator('#vacation-results .vacation-selection-picked')).toContainText(/kuşadası|didim/i);
  });

  test('/tatil/?decision_cards=1 secondary compare CTA does not change selection', async ({ page }) => {
    await page.goto('/tatil/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeTatilWizard(page);

    const target = page.locator('#vacation-results .ib-decision-category-card[data-option="kusadasi-didim"]');
    await target.locator('.ib-decision-card-secondary').click();

    await expect(target).not.toHaveClass(/is-selected/);
    await expect(page.locator('#vacation-results .tatil-v2-alts')).toBeVisible();
  });

  test('/tatil/?decision_cards=1 @390px decision cards avoid horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tatil/?decision_cards=1');
    await page.waitForLoadState('domcontentloaded');
    await completeTatilWizard(page);
    await expect(page.locator('#vacation-results .ib-decision-category-card').first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });

  async function prepareAutoPage(page, path = '/auto/') {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('istebul_auto_soft_gate_dismissed', '1');
      } catch {
        /* ignore */
      }
    });
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.wizard-progress')).toBeVisible({ timeout: 20000 });
  }

  async function completeAutoWizard(page) {
    await page.locator('[data-wizard-key="budget"].wizard-option', { hasText: '1 – 2 milyon TL' }).click();
    await page.locator('[data-wizard-key="usage"].wizard-option', { hasText: 'Aile' }).click();
    await page.locator('[data-wizard-key="household_size"].wizard-option', { hasText: '3-4 kişi' }).click();
    await page.getByRole('button', { name: /Devam et/i }).click();

    await page.locator('.wizard-option', { hasText: 'SUV' }).first().click();
    await page.locator('.wizard-option', { hasText: 'Hibrit' }).click();
    await page.getByRole('button', { name: /Devam et/i }).click();

    await page.locator('[data-wizard-key="km"].wizard-option', { hasText: '10.000 – 20.000 km' }).click();
    await page.locator('[data-wizard-key="city_ratio"].wizard-option', { hasText: 'Dengeli kullanım' }).click();
    await page.locator('[data-wizard-key="ownership_months"].wizard-option', { hasText: '36 ay' }).click();
    await page.locator('[data-wizard-key="location"].wizard-option', { hasText: 'İzmir' }).click();
    await page.getByRole('button', { name: /Devam et/i }).click();

    await page.locator('[data-wizard-key="loan"].wizard-option', { hasText: 'Evet' }).click();
    await page.getByRole('button', { name: /Analizi başlat/i }).click();

    await expect(page.locator('#auto-results .auto-v2-root')).toBeVisible({ timeout: 20000 });

    const gate = page.locator('#auto-soft-auth-gate');
    if (await gate.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /Önizlemeyle devam et/i }).click();
    }
  }

  test('/auto/ without decision_cards flag keeps legacy compact cards visible', async ({ page }) => {
    test.setTimeout(60000);
    await prepareAutoPage(page);
    await completeAutoWizard(page);

    await expect(page.locator('#auto-results .ib-decision-category-card')).toHaveCount(0);
    await expect(page.locator('#auto-results-cards.auto-rec-cards')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-decision-cards', '1');
  });

  test('/auto/?decision_cards=1 shows decision category cards with vehicle score', async ({ page }) => {
    test.setTimeout(60000);
    await prepareAutoPage(page, '/auto/?decision_cards=1');
    await completeAutoWizard(page);

    const cards = page.locator('#auto-results .ib-decision-category-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('html')).toHaveAttribute('data-decision-cards', '1');
    await expect(page.locator('#auto-results-cards.auto-rec-cards')).toHaveCount(0);

    const firstCard = cards.first();
    const scoreAttr = await firstCard.getAttribute('data-decision-score');
    const scoreText = await firstCard.locator('.ib-decision-card__score-value').innerText();
    expect(scoreAttr).toBe(scoreText.trim());

    const suitabilitySignal = firstCard.locator('.ib-decision-card__signal', { hasText: /Uygunluk/i });
    await expect(suitabilitySignal).toContainText(/3-4 kişilik hane/i);
    await expect(firstCard.locator('.ib-decision-card__ai-summary')).not.toBeEmpty();
    const signalCount = await firstCard.locator('.ib-decision-card__signals .ib-decision-card__signal').count();
    expect(signalCount).toBeGreaterThanOrEqual(2);
    expect(signalCount).toBeLessThanOrEqual(4);
  });

  test('/auto/?decision_cards=1 card CTA selects vehicle', async ({ page }) => {
    test.setTimeout(60000);
    await prepareAutoPage(page, '/auto/?decision_cards=1');
    await completeAutoWizard(page);

    const target = page.locator('#auto-results .ib-decision-category-card').nth(1);
    const vehicleName = await target.locator('.ib-decision-card__title').innerText();
    await target.locator('.ib-decision-card-select').click();
    await expect(target).toHaveClass(/is-selected/);
    await expect(page.locator('#auto-vehicle-selection')).toBeVisible();
    await expect(page.locator('.auto-vehicle-selection-confirmed')).toContainText(vehicleName.trim());
  });

  test('/auto/?decision_cards=1 secondary compare CTA does not change selection', async ({ page }) => {
    test.setTimeout(60000);
    await prepareAutoPage(page, '/auto/?decision_cards=1');
    await completeAutoWizard(page);

    const target = page.locator('#auto-results .ib-decision-category-card').nth(1);
    await target.locator('.ib-decision-card-secondary').click();

    await expect(target).not.toHaveClass(/is-selected/);
    await expect(page.locator('#auto-results .ib-auto-compare-matrix')).toBeVisible();
  });

  test('/auto/?decision_cards=1 @390px decision cards avoid horizontal overflow', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareAutoPage(page, '/auto/?decision_cards=1');
    await completeAutoWizard(page);
    await expect(page.locator('#auto-results .ib-decision-category-card').first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    expect(overflow).toBe(false);
  });

  test('/finans/ @ mobile completes wizard without stuck loading', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/finans/');
    await page.waitForLoadState('domcontentloaded');
    await openFinansWizard(page);

    await page.locator('#finans-wizard [data-field="purpose"][data-value="konut"]').click();
    await page.locator('#finans-next').click();
    await page.locator('#finans-wizard [data-field="amount_range"][data-value="1m"]').click();
    await page.locator('#finans-next').click();
    await page.locator('#finans-wizard [data-field="term_months"][data-value="36"]').click();
    await page.locator('#finans-next').click();
    await page.locator('#finans-wizard [data-field="capacity_range"][data-value="25k"]').click();
    await page.locator('#finans-next').click();
    await page.locator('#finans-wizard [data-manual="monthly_income"]').fill('55000');
    await page.locator('#finans-wizard [data-field="income_type"][data-value="stabil"]').click();
    await page.locator('#finans-wizard [data-field="early_payment"][data-value="belki"]').click();
    await page.locator('#finans-next').click();
    await page.locator('#finans-wizard [data-field="rate_sensitivity"][data-value="orta"]').click();
    await page.locator('#finans-wizard [data-field="risk_tolerance"][data-value="dengeli"]').click();
    await page.locator('#finans-next').click();

    await expect(page.locator('#finans-results .finansman-v2-root')).toBeVisible({ timeout: 15000 });
    const overflow = await page.evaluate(() => {
      const el = document.getElementById('finans-results');
      if (!el) return false;
      return el.scrollWidth === el.clientWidth;
    });
    expect(overflow).toBe(true);
  });

  test('/sigorta/ arac flow skips marital status and reaches results', async ({ page }) => {
    await page.goto('/sigorta/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#sigorta-wizard [data-field="insurance_type"][data-value="arac"]').click();
    await page.locator('#sigorta-next').click();

    await expect(page.locator('#sigorta-wizard')).not.toContainText('Medeni durum');

    await page.locator('#sigorta-wizard [data-manual="age"]').fill('35');
    await page.locator('#sigorta-wizard [data-field="license_years"][data-value="3-10"]').click();
    await page.locator('#sigorta-wizard [data-field="usage_type"][data-value="ozel"]').click();
    await page.locator('#sigorta-next').click();

    await page.locator('#sigorta-wizard [data-field="vehicle_category"][data-value="otomobil"]').click();
    await page.locator('#sigorta-wizard [data-field="vehicle_year_band"][data-value="4-10"]').click();
    await page.locator('#sigorta-next').click();

    await page.locator('#sigorta-wizard [data-field="risk_perception"][data-value="orta"]').click();
    await page.locator('#sigorta-next').click();

    await page.locator('#sigorta-wizard [data-field="budget_level"][data-value="orta"]').click();
    await page.locator('#sigorta-next').click();

    await expect(page.locator('#sigorta-results')).toBeVisible();
    await expect(page.locator('#sigorta-results')).toContainText(/koruma|prim|₺/i);
  });

  test('cookie consent blocks third-party scripts until accept', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.removeItem('istebul_cookie_consent'));
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const thirdPartyScripts = await page.locator('script[data-analytics-provider]').count();
    expect(thirdPartyScripts).toBe(0);
  });
});
