/**
 * Defer cookie banner reveal until after LCP / idle so footer consent is not the LCP element.
 */

/**
 * @param {() => void} callback
 */
export function scheduleCookieConsentReveal(callback) {
  if (typeof callback !== 'function') return;

  if (typeof document === 'undefined') {
    setTimeout(callback, 0);
    return;
  }

  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    callback();
  };

  const afterPaint = () => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2500 });
      return;
    }
    setTimeout(run, 1200);
  };

  try {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        if (!list.getEntries().length) return;
        observer.disconnect();
        afterPaint();
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    }
  } catch {
    /* PerformanceObserver unavailable */
  }

  if (document.readyState === 'complete') {
    setTimeout(afterPaint, 800);
  } else {
    window.addEventListener(
      'load',
      () => {
        setTimeout(afterPaint, 600);
      },
      { once: true }
    );
  }

  setTimeout(run, 5000);
}
