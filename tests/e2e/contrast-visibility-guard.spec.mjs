import { test, expect } from '@playwright/test';
import { MIN_CONTRAST_LARGE, MIN_CONTRAST_TEXT, MIN_CONTRAST_UI } from './helpers/visibility-guard.mjs';
import { installAiListingsAdminMocks } from './helpers/ai-listings-admin-mocks.mjs';

const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 800 },
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 }
];

async function waitForAppRoute(page, route) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    (expectedRoute) => document.documentElement.getAttribute('data-ib-route') === expectedRoute,
    route,
    { timeout: 20000 }
  );
}

async function openVerticalMobileNav(page) {
  await page.evaluate(() => {
    const toggle = document.querySelector('.vacation-nav-toggle, .housing-nav-toggle');
    const navId = toggle?.getAttribute('aria-controls');
    const nav = navId ? document.getElementById(navId) : document.querySelector('nav[id$="-nav"]');
    if (!nav) return;
    nav.classList.add('is-open');
    toggle?.setAttribute('aria-expanded', 'true');
  });
}

async function runVisibilityAudit(page, targets) {
  return page.evaluate((auditTargets) => {
    const audit = (selector, options = {}) => {
      const label = options.label || selector;
      const minContrast = options.minContrast ?? 4.5;
      const requireText = options.requireText !== false;
      const checkClip = options.checkClip !== false;
      const checkContrast = options.checkContrast !== false;
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
      const skipContrast = checkContrast === false || hasComplexBackground(element);
      if (!skipContrast && fgColor) {
        const effectiveBg = getEffectiveBackground(element);
        if (!effectiveBg) {
          // Görsel/gradyan arka plan — kontrast guard atlanır, görünürlük yeterli
        } else {
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

test.describe('P0-1 contrast/visibility guard', () => {
  for (const viewport of VIEWPORTS) {
    test(`ana sayfa hero + kategori CTA @ ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await waitForAppRoute(page, 'home');
      await page.locator('#home-vertical-focus').scrollIntoViewIfNeeded();

      await page.waitForSelector('#home-category-grid .ib-cat-mockup__title', { timeout: 15000 });

      const audit = await runVisibilityAudit(page, [
        { selector: '#hero-v4-title', label: 'Ana hero başlık', minContrast: MIN_CONTRAST_LARGE },
        { selector: '[data-hero-cta-primary]', label: 'Ana hero CTA', minContrast: MIN_CONTRAST_UI },
        { selector: '#home-use-cases-title', label: 'Kategori bölüm başlığı', checkContrast: false },
        {
          selector: '#home-category-grid .ib-cat-mockup__title',
          label: 'Kategori kart başlığı',
          checkContrast: false
        },
        {
          selector: '#home-category-grid .ib-cat-mockup__link',
          label: 'Kategori kart CTA',
          checkContrast: false
        }
      ]);

      expectAuditClean(audit, `Ana sayfa @ ${viewport.label}`);
    });
  }

  const verticalPages = [
    {
      path: '/auto/',
      hero: '[data-auto-hero-cta]',
      navMoreBtn: '#auto-nav-more-btn',
      navMoreMenuLink: '#auto-nav-more-menu a',
      waitFor: '.wizard-progress, [data-auto-hero-cta]'
    },
    {
      path: '/tatil/',
      hero: '#vacation-hero-cta',
      navMoreBtn: '#vacation-nav-more-btn',
      navMoreMenuLink: '#vacation-nav-more-menu a',
      waitFor: '#vacation-hero-cta'
    },
    {
      path: '/sigorta/',
      hero: '#sigorta-hero-cta',
      navMoreBtn: '#sigorta-nav-more-btn',
      navMoreMenuLink: '#sigorta-nav-more-menu a',
      waitFor: '#sigorta-hero-cta'
    },
    {
      path: '/kasko/',
      hero: '#kasko-hero-cta',
      navMoreBtn: '#kasko-nav-more-btn',
      navMoreMenuLink: '#kasko-nav-more-menu a',
      waitFor: '#kasko-hero-cta'
    }
  ];

  const verticalDesktop = { label: 'desktop', width: 1280, height: 800 };
  const verticalMobileTablet = [
    { label: 'mobile', width: 390, height: 844 },
    { label: 'tablet', width: 768, height: 1024 }
  ];

  for (const vertical of verticalPages) {
    test(`${vertical.path} hero CTA + nav-more @ desktop`, async ({ page }) => {
      if (vertical.path === '/auto/') {
        await page.addInitScript(() => {
          try {
            sessionStorage.setItem('istebul_auto_soft_gate_dismissed', '1');
          } catch {
            /* ignore */
          }
        });
      }

      await page.setViewportSize({ width: verticalDesktop.width, height: verticalDesktop.height });
      await page.goto(vertical.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector(vertical.waitFor, { state: 'visible', timeout: 20000 });

      const audit = await runVisibilityAudit(page, [
        { selector: vertical.hero, label: `${vertical.path} hero CTA`, minContrast: MIN_CONTRAST_UI },
        { selector: vertical.navMoreBtn, label: `${vertical.path} nav-more btn`, minContrast: MIN_CONTRAST_UI }
      ]);

      expectAuditClean(audit, `${vertical.path} @ desktop`);
    });

    for (const viewport of verticalMobileTablet) {
      test(`${vertical.path} hero CTA + nav-more menu @ ${viewport.label}`, async ({ page }) => {
        if (vertical.path === '/auto/') {
          await page.addInitScript(() => {
            try {
              sessionStorage.setItem('istebul_auto_soft_gate_dismissed', '1');
            } catch {
              /* ignore */
            }
          });
        }

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(vertical.path);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForSelector(vertical.waitFor, { state: 'visible', timeout: 20000 });
        await openVerticalMobileNav(page);

        const audit = await runVisibilityAudit(page, [
          { selector: vertical.hero, label: `${vertical.path} hero CTA`, minContrast: MIN_CONTRAST_UI },
          {
            selector: vertical.navMoreMenuLink,
            label: `${vertical.path} nav-more menu link`,
            minContrast: MIN_CONTRAST_TEXT
          }
        ]);

        expectAuditClean(audit, `${vertical.path} @ ${viewport.label}`);
      });
    }
  }

  for (const viewport of VIEWPORTS.filter((item) => item.label !== 'desktop')) {
    test(`/karar-asistani/ başlık + örnek skor @ ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/karar-asistani/');
      await waitForAppRoute(page, 'page-karar-analizi');
      await page.waitForSelector('#premium-karar-analizi-root .ib-premium-hero h1', { timeout: 20000 });

      const audit = await runVisibilityAudit(page, [
        {
          selector: '#premium-karar-analizi-root .ib-premium-hero h1',
          label: 'Karar asistanı başlık',
          minContrast: MIN_CONTRAST_LARGE
        },
        {
          selector: '#premium-karar-analizi-root .ib-score-ring strong',
          label: 'Örnek skor değeri',
          minContrast: MIN_CONTRAST_LARGE
        },
        {
          selector: '#premium-karar-analizi-root .ib-premium-hero-actions .btn-primary',
          label: 'Karar asistanı hero CTA',
          minContrast: MIN_CONTRAST_UI
        }
      ]);

      expectAuditClean(audit, `/karar-asistani/ @ ${viewport.label}`);
    });

    test(`/secenekler/ loading/empty shell @ ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/secenekler/');
      await waitForAppRoute(page, 'ilanlar');
      await page.waitForSelector('#ilanlar #active-category-label', { state: 'visible', timeout: 20000 });

      const audit = await runVisibilityAudit(page, [
        {
          selector: '#active-category-label',
          label: 'Seçenekler başlık',
          minContrast: MIN_CONTRAST_LARGE
        },
        {
          selector: '#listing-result-count',
          label: 'Seçenekler durum metni',
          minContrast: MIN_CONTRAST_TEXT
        },
        {
          selector: '#add-listing-btn',
          label: 'Seçenek gönder CTA',
          minContrast: MIN_CONTRAST_UI
        }
      ]);

      expectAuditClean(audit, `/secenekler/ @ ${viewport.label}`);
    });
  }

  test('admin-panel authenticated shell has no page-level horizontal overflow @ mobile', async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin-panel.html');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      document.body.classList.add('admin-enterprise');
      const login = document.getElementById('login-screen');
      const app = document.getElementById('app');
      if (login) login.style.display = 'none';
      if (app) app.style.display = 'block';
    });

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      if (doc.scrollWidth > doc.clientWidth + 2) return 'document';
      const pageEl = document.querySelector('#app .page');
      if (pageEl && pageEl.scrollWidth > pageEl.clientWidth + 2) return 'page';
      return null;
    });
    expect(overflow).toBeNull();
  });

  test('admin-panel login shell + nav (DOM) görünürlük', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin-panel.html');
    await page.waitForLoadState('domcontentloaded');

    const loginAudit = await runVisibilityAudit(page, [
      { selector: '#login-screen h1', label: 'Admin giriş başlığı', minContrast: MIN_CONTRAST_LARGE },
      { selector: '#login-btn', label: 'Admin giriş CTA', minContrast: MIN_CONTRAST_UI }
    ]);
    expectAuditClean(loginAudit, 'admin-panel login shell');

    await page.evaluate(() => {
      const login = document.getElementById('login-screen');
      const app = document.getElementById('app');
      if (login) login.style.display = 'none';
      if (app) app.style.display = 'block';
    });

    const navAudit = await runVisibilityAudit(page, [
      { selector: '.sidebar-brand-title', label: 'Admin marka başlığı', minContrast: MIN_CONTRAST_LARGE },
      { selector: '#admin-nav .nav-item.active .nav-label', label: 'Aktif nav öğesi', minContrast: MIN_CONTRAST_TEXT }
    ]);
    expectAuditClean(navAudit, 'admin-panel nav shell');
  });

  test('admin/ai-listings başlık + Yeni CTA', async ({ page }) => {
    await installAiListingsAdminMocks(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/ai-listings/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.ai-listings-admin__brand-title', { timeout: 20000 });

    const audit = await runVisibilityAudit(page, [
      {
        selector: '.ai-listings-admin__brand-title',
        label: 'AI listings ana başlık',
        minContrast: MIN_CONTRAST_LARGE
      },
      {
        selector: '#ai-listings-new-menu-btn',
        label: 'AI listings Yeni CTA',
        minContrast: MIN_CONTRAST_UI
      },
      {
        selector: '#ai-listings-sidebar h2',
        label: 'AI listings sidebar başlık',
        minContrast: MIN_CONTRAST_LARGE
      }
    ]);

    expectAuditClean(audit, 'admin/ai-listings');
  });
});
