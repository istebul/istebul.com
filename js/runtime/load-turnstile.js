/**
 * Lazy-load Cloudflare Turnstile only when a token is needed.
 */
let turnstileLoadPromise = null;

export function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.turnstile) return Promise.resolve(true);
  if (turnstileLoadPromise) return turnstileLoadPromise;

  turnstileLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[data-istebul-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.turnstile)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.defer = true;
    script.dataset.istebulTurnstile = '1';
    script.onload = () => resolve(Boolean(window.turnstile));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return turnstileLoadPromise;
}
