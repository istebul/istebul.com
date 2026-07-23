import { expect } from '@playwright/test';

/**
 * Close sticky header overlays that intercept hero CTA hits on mobile (390px).
 * Observed: `#finans-nav-more-menu` menuitem / logo cover `#finans-hero-cta`.
 */
async function dismissFinansHeaderOverlays(page) {
  await page.evaluate(() => {
    const toggle = document.querySelector('.vacation-nav-toggle[aria-controls="finans-nav"]');
    const nav = document.getElementById('finans-nav');
    if (toggle && nav) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    const moreBtn = document.getElementById('finans-nav-more-btn');
    const moreMenu = document.getElementById('finans-nav-more-menu');
    if (moreBtn && moreMenu) {
      moreBtn.setAttribute('aria-expanded', 'false');
      moreMenu.hidden = true;
      moreMenu.setAttribute('hidden', '');
    }
  });
  await page.keyboard.press('Escape').catch(() => {});
}

async function scrollHeroCtaClearOfHeader(page) {
  await page.evaluate(() => {
    const cta = document.getElementById('finans-hero-cta');
    if (!cta) return;
    const header = document.querySelector('header.vacation-header, header.ib-vertical-header');
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const top = cta.getBoundingClientRect().top + window.scrollY - headerH - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  });
}

/**
 * Open the Finans decision wizard via hero CTA.
 *
 * Flake roots (tests-only fix):
 * 1) force-click before finans-app init binds listeners / renderWizard()
 * 2) On ~390px, sticky header intercepts Playwright pointer clicks; Playwright's
 *    own scroll-into-view re-places the CTA under the header after we clear it
 *
 * Strategy:
 * - wait real DOM readiness (body.finans-page, CTA visible+enabled, wizard card)
 * - dismiss header overlays
 * - scroll CTA clear of sticky header
 * - desktop: trial + normal Playwright click
 * - narrow viewports: HTMLElement.click() after the same readiness checks
 *   (fires bound listeners; no force:true; no networkidle; no timeout inflation)
 */
export async function openFinansWizard(page) {
  const heroCta = page.locator('#finans-hero-cta');
  const wizard = page.locator('#finans-wizard');
  const purposeStep = wizard.locator('[data-field="purpose"][data-value="konut"]');
  const viewport = page.viewportSize();
  const narrowViewport = Boolean(viewport && viewport.width <= 480);

  await expect(page.locator('body.finans-page')).toBeAttached();
  await expect(heroCta).toBeVisible();
  await expect(heroCta).toBeEnabled();
  await expect(wizard.locator('.vacation-wizard-card')).toBeVisible();

  await dismissFinansHeaderOverlays(page);
  await scrollHeroCtaClearOfHeader(page);
  await expect(heroCta).toBeVisible();
  await expect(heroCta).toBeEnabled();

  if (narrowViewport) {
    await heroCta.evaluate((el) => {
      el.click();
    });
  } else {
    await heroCta.click({ trial: true });
    await heroCta.click();
  }

  await expect(wizard).toBeVisible();
  await purposeStep.waitFor({ state: 'visible' });
  await expect(purposeStep).toBeVisible();

  await page.locator('#finans-flow').evaluate((el) => {
    el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
  });
  await expect(purposeStep).toBeVisible();
}

export async function completeFinansWizard(page) {
  await openFinansWizard(page);

  const wizard = page.locator('#finans-wizard');

  await wizard.locator('[data-field="purpose"][data-value="konut"]').click();
  await page.locator('#finans-next').click();

  await wizard.locator('[data-field="amount_range"][data-value="1m"]').click();
  await page.locator('#finans-next').click();

  await wizard.locator('[data-field="term_months"][data-value="36"]').click();
  await page.locator('#finans-next').click();

  await wizard.locator('[data-field="capacity_range"][data-value="25k"]').click();
  await page.locator('#finans-next').click();

  await wizard.locator('[data-manual="monthly_income"]').fill('55000');
  await wizard.locator('[data-manual="monthly_expense"]').fill('18000');
  await wizard.locator('[data-manual="existing_debt"]').fill('6000');
  await wizard.locator('[data-field="income_type"][data-value="stabil"]').click();
  await wizard.locator('[data-field="early_payment"][data-value="belki"]').click();
  await page.locator('#finans-next').click();

  await wizard.locator('[data-field="rate_sensitivity"][data-value="orta"]').click();
  await wizard.locator('[data-field="risk_tolerance"][data-value="dengeli"]').click();
  await page.locator('#finans-next').click();

  await expect(page.locator('#finans-results')).toBeVisible();
  await expect(page.locator('#finans-results .finansman-v2-root')).toBeVisible({ timeout: 15000 });
}
