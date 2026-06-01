import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/', heading: /yalnız değilsiniz/i },
  { path: '/auto/', selector: '#vacation-flow, #auto-flow, .vacation-main, main' },
  { path: '/sigorta/', heading: /sigorta|veriye dayalı/i },
  { path: '/konut/', selector: 'main' },
  { path: '/kasko/', heading: /kasko|veriye dayalı/i }
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

  test('homepage uses consolidated CSS bundles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const styleLinks = await page.locator('link[rel="stylesheet"]').count();
    expect(styleLinks).toBeLessThanOrEqual(3);
    const bundle = await page.locator('link[href*="homepage.bundle"]').count();
    expect(bundle).toBeGreaterThan(0);
  });

  test('/kasko/ wizard shell is interactive', async ({ page }) => {
    await page.goto('/kasko/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#kasko-hero-cta').click();
    await expect(page.locator('#kasko-wizard')).toBeVisible();
  });

  test('/sigorta/ wizard shell is interactive', async ({ page }) => {
    await page.goto('/sigorta/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#sigorta-hero-cta').click();
    await expect(page.locator('#sigorta-wizard')).toBeVisible();
    await expect(page.locator('#sigorta-wizard button, #sigorta-wizard [role="button"]').first()).toBeVisible();
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
