/**
 * PR-566 — İSTEBUL AI Landing Clone boot for `/ai/`.
 *
 * Hydrates the cloned AI marketing surface using the same runtime modules as `/`.
 * Does not load PlatformHero / platform-shell-home. Does not alter `/` traffic.
 */

import { bootstrapLocale } from '../runtime/locale-bootstrap.js';
import '../features/i18n/i18n.js';
import { initHomeCategories } from '../runtime/home-categories.js';
import { initHomeEconomicIndicators } from '../features/home/home-economic-indicators.js';
import { initCategoryGuidesHub } from '../runtime/init-category-guides.js';
import { initLandingFaq } from '../runtime/marketing-shell.js';
import { ensureRevenueManager } from '../runtime/lazy-app-modules.js';
import { initPricingCardsMotion } from '../runtime/pricing-cards-motion.js';
import { refreshLucideIcons, scheduleLucideIcons } from '../runtime/lucide-loader.js';
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

  await window.__ibI18n?.ready;
  try {
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
  await window.__ibI18n?.ready;

  initAiLandingFoundation();
  initAiHeroRender();
  initAiLandingAnchors();
  initLandingFaq();
  initHomeCategories();
  initHomeEconomicIndicators();
  initCategoryGuidesHub();
  await hydrateAiPricing();

  scheduleLucideIcons();
  await refreshLucideIcons();
  document.addEventListener('ib:refresh-icons', () => {
    void refreshLucideIcons();
  });

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
