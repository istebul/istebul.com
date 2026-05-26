/**
 * Google AdSense — consent-gated, rehber/static pages only (no SPA funnel).
 */

const CONSENT_KEY = 'istebul_cookie_consent';

export function hasMarketingConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function getPublisherId() {
  const id = (window.__env?.ADSENSE_PUBLISHER_ID || '').trim();
  return id || null;
}

export function loadAdSense() {
  if (!hasMarketingConsent()) return Promise.resolve(false);
  const client = getPublisherId();
  if (!client) return Promise.resolve(false);
  if (document.querySelector('script[data-adsense="true"]')) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.adsense = 'true';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function pushAdSlots(root = document) {
  if (!hasMarketingConsent() || !getPublisherId()) return;
  const slots = root.querySelectorAll('ins.adsbygoogle:not([data-adsense-pushed])');
  if (!slots.length) return;
  window.adsbygoogle = window.adsbygoogle || [];
  slots.forEach((el) => {
    el.dataset.adsensePushed = '1';
    try {
      window.adsbygoogle.push({});
    } catch {
      /* ignore */
    }
  });
}

export async function initRehberAds() {
  const ok = await loadAdSense();
  if (ok) pushAdSlots();
}
