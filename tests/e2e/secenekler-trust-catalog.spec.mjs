import { test, expect } from '@playwright/test';
import { MIN_CONTRAST_LARGE, MIN_CONTRAST_TEXT } from './helpers/visibility-guard.mjs';
import { installSeceneklerCatalogMocks } from './helpers/secenekler-catalog-mocks.mjs';
import {
  CATALOG_SVG_FRAGMENT,
  FIXTURE_IDS,
  IMAGE_BADGE_LABELS,
  PUBLISHED_VEHICLE_LISTING_ROWS
} from '../fixtures/secenekler-vehicle-listings.mjs';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function waitForAppRoute(page, route) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    (expectedRoute) => document.documentElement.getAttribute('data-ib-route') === expectedRoute,
    route,
    { timeout: 20000 }
  );
}

async function waitForPopulatedCatalog(page) {
  await waitForAppRoute(page, 'ilanlar');
  await page.waitForFunction(
    (expectedCount) =>
      document.querySelectorAll('#listings-grid .listing-card').length >= expectedCount,
    PUBLISHED_VEHICLE_LISTING_ROWS.length,
    { timeout: 20000 }
  );
}

function cardLocator(page, listingId) {
  return page.locator(`#listings-grid .listing-card[data-listing-id="${listingId}"]`);
}

async function runVisibilityAudit(page, targets) {
  return page.evaluate((auditTargets) => {
    const audit = (selector, options = {}) => {
      const label = options.label || selector;
      const minContrast = options.minContrast ?? 4.5;
      const requireText = options.requireText !== false;
      const checkClip = options.checkClip !== false;
      const tolerance = 4;
      const issues = [];

      const parseRgb = (cssColor) => {
        if (!cssColor || cssColor === 'transparent') return null;
        const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return null;
        const alpha = match[4] != null ? Number(match[4]) : 1;
        if (alpha <= 0.05) return null;
        return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha };
      };

      const relativeLuminance = ({ r, g, b }) => {
        const channel = (value) => {
          const normalized = value / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };

      const contrastRatio = (foreground, background) => {
        const fg = relativeLuminance(foreground);
        const bg = relativeLuminance(background);
        const lighter = Math.max(fg, bg);
        const darker = Math.min(fg, bg);
        return (lighter + 0.05) / (darker + 0.05);
      };

      const blendChannel = (fg, bg, alpha) => Math.round(fg * alpha + bg * (1 - alpha));

      const getEffectiveBackground = (element) => {
        let node = element;
        let foreground = null;
        while (node && node !== document.documentElement) {
          const style = getComputedStyle(node);
          if (style.backgroundImage && style.backgroundImage !== 'none') {
            return null;
          }
          const bg = parseRgb(style.backgroundColor);
          if (bg) {
            if (!foreground) {
              foreground = { r: bg.r, g: bg.g, b: bg.b };
            } else if (bg.a < 1) {
              foreground = {
                r: blendChannel(bg.r, foreground.r, bg.a),
                g: blendChannel(bg.g, foreground.g, bg.a),
                b: blendChannel(bg.b, foreground.b, bg.a)
              };
            } else {
              foreground = { r: bg.r, g: bg.g, b: bg.b };
            }
            if (bg.a >= 0.95) break;
          }
          node = node.parentElement;
        }
        return foreground || { r: 255, g: 255, b: 255 };
      };

      const hasComplexBackground = (element) => {
        let node = element;
        while (node && node !== document.documentElement) {
          const style = getComputedStyle(node);
          if (style.backgroundImage && style.backgroundImage !== 'none') return true;
          const bg = parseRgb(style.backgroundColor);
          if (bg && bg.a > 0 && bg.a < 0.95) return true;
          node = node.parentElement;
        }
        return false;
      };

      const element = document.querySelector(selector);
      if (!element) {
        return { selector, label, ok: false, issues: ['element bulunamadı'] };
      }

      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0) issues.push('boyut sıfır');
      if (style.display === 'none' || style.visibility === 'hidden') issues.push('display/visibility gizli');
      if (Number.parseFloat(style.opacity) < 0.05) issues.push('opacity çok düşük');

      const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
      if (requireText && !text) issues.push('textContent boş');

      const fgColor = parseRgb(style.color);
      const skipContrast = options.checkContrast === false || hasComplexBackground(element);
      if (!skipContrast && fgColor) {
        const effectiveBg = getEffectiveBackground(element);
        if (effectiveBg) {
          const ratio = contrastRatio(
            { r: fgColor.r, g: fgColor.g, b: fgColor.b },
            effectiveBg
          );
          if (ratio < minContrast) issues.push(`kontrast ${ratio.toFixed(2)} < ${minContrast}`);
        }
      } else if (!skipContrast && !fgColor) {
        issues.push('ön plan rengi okunamadı');
      }

      if (checkClip) {
        const nowrap = style.whiteSpace === 'nowrap' || style.whiteSpace === 'pre';
        const overflowRisk =
          style.overflow === 'hidden' ||
          style.overflowX === 'hidden' ||
          style.textOverflow === 'ellipsis';
        if (
          (nowrap || overflowRisk) &&
          element.scrollWidth > element.clientWidth + tolerance
        ) {
          issues.push('nowrap/overflow kırpma riski');
        }
      }

      return { selector, label, ok: issues.length === 0, issues, textPreview: text.slice(0, 80) };
    };

    const results = auditTargets.map((target) =>
      audit(target.selector, {
        label: target.label,
        minContrast: target.minContrast,
        requireText: target.requireText,
        checkClip: target.checkClip,
        checkContrast: target.checkContrast
      })
    );
    return {
      results,
      failures: results.filter((result) => !result.ok)
    };
  }, targets);
}

function expectAuditClean(audit, contextLabel) {
  if (audit.failures.length === 0) return;
  const detail = audit.failures
    .map((item) => `${item.label}: ${item.issues.join('; ')}`)
    .join('\n');
  expect.soft(false, `${contextLabel}\n${detail}`).toBe(true);
}

test.describe('P0-3B Faz 2C — secenekler trust catalog (fixture mock)', () => {
  test.beforeEach(async ({ page }) => {
    await installSeceneklerCatalogMocks(page);
  });

  test('dolu katalog render ve trust strip görünürlüğü', async ({ page }) => {
    await page.goto('/secenekler/');
    await waitForPopulatedCatalog(page);

    const cards = page.locator('#listings-grid .listing-card');
    await expect(cards).toHaveCount(PUBLISHED_VEHICLE_LISTING_ROWS.length);

    for (const listingId of Object.values(FIXTURE_IDS)) {
      const card = cardLocator(page, listingId);
      await expect(card).toBeVisible();
      await expect(card.locator('.listing-trust-strip')).toBeVisible();
      await expect(card.locator('.listing-trust-badge')).toHaveCount(4);
    }
  });

  test('image badge copy — verified external, catalog SVG, no image', async ({ page }) => {
    await page.goto('/secenekler/');
    await waitForPopulatedCatalog(page);

    const verifiedCard = cardLocator(page, FIXTURE_IDS.verifiedExternal);
    await expect(
      verifiedCard.locator('[data-trust-badge="image-representation"]')
    ).toHaveText(IMAGE_BADGE_LABELS.verifiedExternal);

    const svgCard = cardLocator(page, FIXTURE_IDS.catalogSvg);
    await expect(
      svgCard.locator('[data-trust-badge="image-representation"]')
    ).toHaveText(IMAGE_BADGE_LABELS.catalogSvg);
    await expect(svgCard.locator('.listing-image')).not.toHaveAttribute('src', new RegExp(CATALOG_SVG_FRAGMENT));
    await expect(svgCard.locator(`img[src*="${CATALOG_SVG_FRAGMENT}"]`)).toHaveCount(0);

    const noImageCard = cardLocator(page, FIXTURE_IDS.noImage);
    await expect(
      noImageCard.locator('[data-trust-badge="image-representation"]')
    ).toHaveText(IMAGE_BADGE_LABELS.noImage);
  });

  test('trust selector yapısı — published ve image-representation badge', async ({ page }) => {
    await page.goto('/secenekler/');
    await waitForPopulatedCatalog(page);

    const firstCard = cardLocator(page, FIXTURE_IDS.verifiedExternal);
    await expect(firstCard.locator('.listing-trust-strip')).toBeVisible();
    await expect(firstCard.locator('.listing-trust-badge')).toHaveCount(4);
    await expect(firstCard.locator('[data-trust-badge="published"]')).toBeVisible();
    await expect(firstCard.locator('[data-trust-badge="image-representation"]')).toBeVisible();
    await expect(firstCard.locator('[data-trust-badge="published"]')).toHaveText('Yayınlanmış seçenek');
  });

  test('mobile trust badge contrast/görünürlük guard @ 390px', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/secenekler/');
    await waitForPopulatedCatalog(page);

    const verifiedId = FIXTURE_IDS.verifiedExternal;
    const audit = await runVisibilityAudit(page, [
      {
        selector: `[data-listing-id="${verifiedId}"] .listing-trust-strip .listing-trust-badge`,
        label: 'Trust strip badge',
        minContrast: MIN_CONTRAST_TEXT
      },
      {
        selector: `[data-listing-id="${verifiedId}"] [data-trust-badge="image-representation"]`,
        label: 'Image representation badge',
        minContrast: MIN_CONTRAST_TEXT
      },
      {
        selector: `[data-listing-id="${verifiedId}"] [data-trust-badge="published"]`,
        label: 'Published badge',
        minContrast: MIN_CONTRAST_TEXT
      },
      {
        selector: `[data-listing-id="${verifiedId}"] .listing-title`,
        label: 'Listing card title',
        minContrast: MIN_CONTRAST_LARGE
      }
    ]);

    expectAuditClean(audit, '/secenekler dolu katalog @ mobile');
  });
});
