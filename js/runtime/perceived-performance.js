/**
 * P4.5 — Perceived performance: route paint, prefetch, link hints.
 */

const AUTO_PREFETCH_KEY = '__ibAutoPrefetched';

export function initPerceivedPerformance() {
  if (typeof document === 'undefined') return;

  bindRoutePaintPulse();
  bindAutoRuntimePrefetch();
  bindNavIntentPrefetch();
}

function bindRoutePaintPulse() {
  document.addEventListener('routeChanged', () => {
    document.body.classList.add('ib-route-painting');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.body.classList.remove('ib-route-painting');
      });
    });
  });
}

function prefetchOnce(href, as) {
  if (!href || document.querySelector(`link[data-ib-prefetch="${href}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  if (as) link.as = as;
  link.dataset.ibPrefetch = href;
  document.head.appendChild(link);
}

function bindAutoRuntimePrefetch() {
  const targets = document.querySelectorAll(
    'a[href="/auto/"], a[href="/auto"], .nav-cta-auto, [data-analytics-placement="sticky"]'
  );

  const warm = () => {
    if (window[AUTO_PREFETCH_KEY]) return;
    window[AUTO_PREFETCH_KEY] = true;
    prefetchOnce('/auto/', 'document');
  };

  for (const el of targets) {
    el.addEventListener('pointerenter', warm, { once: true, passive: true });
    el.addEventListener('focus', warm, { once: true, passive: true });
  }
}

function bindNavIntentPrefetch() {
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest?.(
        'a[href^="/secenekler"], a[href^="/ilanlar"], a[href^="/decision-options"], a[href^="/planlar"]'
      );
      if (!link || event.defaultPrevented) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('/planlar')) {
        prefetchOnce('/planlar', 'document');
      }
    },
    true
  );
}

/**
 * Flash enter animation on a route section (called from router).
 */
export function pulseRouteSection(element) {
  if (!element || typeof element.classList?.add !== 'function') return;
  if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') return;

  element.classList.remove('ib-route-enter');
  // reflow to restart animation
  if (typeof element.offsetWidth === 'number') {
    void element.offsetWidth;
  }
  element.classList.add('ib-route-enter');
  window.setTimeout(() => element.classList.remove('ib-route-enter'), 320);
}
