/**
 * CSP-safe GA4 consent-mode bootstrap (injected by build; no inline script).
 */
(function bootGa4ConsentHead() {
  const script = document.currentScript;
  const measurementId = String(script?.getAttribute('data-measurement-id') || '').trim();
  if (!measurementId) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  try {
    const stored =
      localStorage.getItem('istebul_cookie_consent') ||
      localStorage.getItem('istebu_cookie_consent');
    if (stored === 'accepted') {
      gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    }
  } catch {
    /* storage blocked */
  }

  gtag('config', measurementId, { anonymize_ip: true });
})();
