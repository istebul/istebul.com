import './locale-bootstrap.js';
import '../features/i18n/i18n.js';
import './site-analytics-boot.js';
import '../features/auth/auth-click-bindings.js';
import { mountVerticalSoftAuthGate } from '../features/auth/vertical-soft-auth.js';
import { mountVerticalProductNav } from './vertical-product-nav.js';
import { initSiteSocialLinks } from './site-social-links.js';

mountVerticalProductNav();
initSiteSocialLinks();

if (typeof document !== 'undefined') {
  const bootAuthBanner = () => {
    if (document.getElementById('auth-modal')) return;
    mountVerticalSoftAuthGate();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAuthBanner, { once: true });
  } else {
    bootAuthBanner();
  }
}
