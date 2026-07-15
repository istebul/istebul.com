/**
 * PR-565 — İSTEBUL AI Landing Foundation boot.
 *
 * Bağımsız `/ai/` SEO shell için iskelet hazırlığı.
 * İçerik taşımaz, home hydrate etmez, cutover yapmaz.
 * Platform bileşenlerini / `js/runtime/platform-*` import etmez.
 */

export const AI_LANDING_SECTION_IDS = Object.freeze([
  'home',
  'home-vertical-focus',
  'how-it-works',
  'home-features-strip',
  'pricing',
  'home-economic-indicators',
  'partner-enterprise',
  'landing-faq',
  'home-guides-strip'
]);

export const AI_LANDING_SECTION_KEYS = Object.freeze([
  'hero',
  'categories',
  'how',
  'features',
  'pricing',
  'economic',
  'partner',
  'faq',
  'guides'
]);

/**
 * Foundation mount noktalarını işaretler (içerik hydrate yok).
 * @returns {{ ready: boolean, mounts: number, sections: number }}
 */
export function initAiLandingFoundation() {
  if (typeof document === 'undefined') {
    return { ready: false, mounts: 0, sections: 0 };
  }

  const root = document.querySelector('[data-ai-landing-root]');
  if (!root) {
    return { ready: false, mounts: 0, sections: 0 };
  }

  if (root.dataset.aiLandingFoundationReady === '1') {
    return {
      ready: true,
      mounts: root.querySelectorAll('[data-ai-landing-mount]').length,
      sections: root.querySelectorAll('[data-ai-landing-section]').length
    };
  }

  const sections = root.querySelectorAll('[data-ai-landing-section]');
  sections.forEach((section) => {
    section.setAttribute('data-ai-landing-foundation', '1');
  });

  const mounts = root.querySelectorAll('[data-ai-landing-mount]');
  mounts.forEach((el) => {
    el.setAttribute('data-ai-landing-ready', '1');
    el.setAttribute('aria-busy', 'false');
  });

  root.dataset.aiLandingFoundationReady = '1';
  document.documentElement.dataset.aiLandingFoundation = '1';

  return {
    ready: true,
    mounts: mounts.length,
    sections: sections.length
  };
}

function boot() {
  initAiLandingFoundation();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}

export default initAiLandingFoundation;
