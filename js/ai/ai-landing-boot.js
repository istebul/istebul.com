/**
 * PR-566 — İSTEBUL AI Landing Clone boot for `/ai/`.
 *
 * Hydrates the cloned AI marketing surface using the same runtime modules as `/`.
 * Does not load PlatformHero / platform-shell-home. Does not alter `/` traffic.
 */

import { bootstrapLocale } from '../runtime/locale-bootstrap.js';
import '../features/i18n/i18n.js';
import {
  AI_LANDING_SECTION_IDS,
  initAiLandingFoundation
} from './ai-landing-foundation.js';

/** EPIC-003A: lock hero mockup to final paint state (no stale animation frame). */
function initAiHeroRender() {
  const preview = document.querySelector('#home .decision-preview.ib-glass-dashboard');
  if (!preview || preview.dataset.aiHeroRenderReady === '1') return;
  preview.dataset.aiHeroRenderReady = '1';
  preview.classList.add('ib-ai-hero-render-ready');
}

function initAiLandingAnchors() {
  document.querySelectorAll('[data-home-anchor]').forEach((el) => {
    if (el.dataset.aiLandingAnchorBound === '1') return;
    el.dataset.aiLandingAnchorBound = '1';
    el.addEventListener('click', (event) => {
      const targetId =
        el.getAttribute('data-home-anchor') ||
        el.getAttribute('href')?.replace(/^[#/]+/, '')?.replace(/^ai#/, '');
      if (!targetId) return;
      const section = document.getElementById(targetId);
      if (!section) return;
      event.preventDefault();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', `/ai/#${targetId}`);
      }
    });
  });
}

async function hydrateAiPricing() {
  const homeRoot = document.querySelector('#pricing #pricing-plans-root');
  if (!homeRoot) return;

  try {
    await window.__ibI18n?.ready;

    const [{ ensureRevenueManager }, { initPricingCardsMotion }] = await Promise.all([
      import('../runtime/lazy-app-modules.js'),
      import('../runtime/pricing-cards-motion.js')
    ]);

    const revenueManager = await ensureRevenueManager();
    if (!revenueManager?.renderPricingCards) return;

    homeRoot.innerHTML = revenueManager.renderPricingCards({ layout: 'default' });
    revenueManager.initPricingControls?.(homeRoot);
    initPricingCardsMotion(document);
  } catch {
    // Keep static teaser fallback already in HTML.
  }
}

/**
 * Pricing is below the fold. Load its implementation only as the visitor
 * approaches the section; the static HTML teaser remains available meanwhile.
 */
function schedulePricingHydration() {
  const section = document.getElementById('pricing');
  const homeRoot = section?.querySelector('#pricing-plans-root');
  if (!homeRoot) return;

  const hydrate = () => {
    void hydrateAiPricing();
  };

  if (typeof IntersectionObserver !== 'function') {
    window.setTimeout(hydrate, 1200);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    hydrate();
  }, { rootMargin: '480px 0px' });

  observer.observe(section || homeRoot);
}

/**
 * Hydrate a secondary section only when it approaches the viewport.
 * Wait for locale initialization at the point of use, not during first paint.
 */
function hydrateWhenNear(selector, hydrate, rootMargin = '560px 0px') {
  const target = document.querySelector(selector);
  if (!target) return;

  let started = false;

  const start = () => {
    if (started) return;
    started = true;

    Promise.resolve()
      .then(async () => {
        await window.__ibI18n?.ready;
        await hydrate();
      })
      .catch(() => {
        // Secondary content failures must not block the main landing page.
      });
  };

  if (typeof IntersectionObserver !== 'function') {
    window.setTimeout(start, 1800);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    start();
  }, { rootMargin });

  observer.observe(target);
}

/** Let the browser paint the server-provided hero before loading secondary sections. */
function waitForInitialPaint() {
  return new Promise((resolve) => {
    let completed = false;

    const timer = window.setTimeout(finish, 250);

    function finish() {
      if (completed) return;
      completed = true;
      window.clearTimeout(timer);
      resolve();
    }

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(finish);
      });
    }
  });
}

/**
 * Boot AI Landing clone surface.
 * @returns {Promise<{ ready: boolean, sections: string[] }>}
 */
export async function initAiLandingClone() {
  if (typeof document === 'undefined') {
    return { ready: false, sections: [] };
  }

  const root = document.querySelector('[data-ai-landing-clone-root],[data-ai-landing-root]');
  if (!root) {
    return { ready: false, sections: [] };
  }
  if (root.dataset.aiLandingCloneReady === '1') {
    return { ready: true, sections: [...AI_LANDING_SECTION_IDS] };
  }

  bootstrapLocale();

  // These operations are small and do not wait for below-the-fold modules.
  initAiLandingFoundation();
  initAiHeroRender();
  initAiLandingAnchors();

  // Give the browser an opportunity to paint the existing HTML hero first.
  await waitForInitialPaint();

  // Register secondary sections without importing their modules up front.
  hydrateWhenNear('#home-vertical-focus', async () => {
    const { initHomeCategories } = await import('../runtime/home-categories.js');
    initHomeCategories();
  });

  hydrateWhenNear('#home-economic-indicators', async () => {
    const { initHomeEconomicIndicators } = await import(
      '../features/home/home-economic-indicators.js'
    );
    initHomeEconomicIndicators();
  });

  hydrateWhenNear('#landing-faq', async () => {
    const { initLandingFaq } = await import('../runtime/marketing-shell.js');
    initLandingFaq();
  });

  hydrateWhenNear('#home-guides-strip', async () => {
    const { initCategoryGuidesHub } = await import('../runtime/init-category-guides.js');
    initCategoryGuidesHub();
  });

  // Only load the icon library when its section approaches the viewport.
  let lucideLoaderPromise = null;

  document.addEventListener('ib:refresh-icons', () => {
    if (!lucideLoaderPromise) return;
    void lucideLoaderPromise.then(({ refreshLucideIcons }) => refreshLucideIcons());
  });

  hydrateWhenNear('#how-it-works', async () => {
    lucideLoaderPromise = import('../runtime/lucide-loader.js');
    const { refreshLucideIcons } = await lucideLoaderPromise;
    await refreshLucideIcons();
  }, '320px 0px');

  // Pricing implementation is loaded only near its section.
  schedulePricingHydration();

  root.dataset.aiLandingCloneReady = '1';
  document.documentElement.dataset.aiLandingClone = '1';
  document.body.classList.add('marketing-shell');

  return { ready: true, sections: [...AI_LANDING_SECTION_IDS] };
}

async function boot() {
  await initAiLandingClone();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void boot();
    }, { once: true });
  } else {
    void boot();
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      initAiHeroRender();
    }
  });
}

export default initAiLandingClone;
