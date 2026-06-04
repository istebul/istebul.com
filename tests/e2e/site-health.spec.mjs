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

  test('/kasko/ wizard shell is interactive', async ({ page }) => {
    await page.goto('/kasko/');
    await page.waitForLoadState('domcontentloaded');
    await openKaskoWizard(page);
  });

  test('/kasko/ completes flow and shows AI results', async ({ page }) => {
    await page.goto('/kasko/');
    await page.waitForLoadState('domcontentloaded');
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
    await expect(page.locator('#kasko-results .kasko-v2-root')).toBeVisible();
    await expect(page.locator('#kasko-results .ib-insight-blocks')).toContainText(/karar|skor|teminat|risk/i);
    await expect(page.locator('#kasko-wizard')).toBeHidden();
  });

  test('/sigorta/ wizard shell is interactive', async ({ page }) => {
    await page.goto('/sigorta/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#sigorta-hero-cta').click();
    await expect(page.locator('#sigorta-wizard')).toBeVisible();
    await expect(page.locator('#sigorta-wizard button, #sigorta-wizard [role="button"]').first()).toBeVisible();
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
