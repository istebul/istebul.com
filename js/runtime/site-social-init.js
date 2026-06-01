import { initSiteSocialLinks } from './site-social-links.js';

function boot() {
  initSiteSocialLinks();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
