/**
 * P4.4 — Runtime conversion micro-UX (nav CTAs, trust lines, auth toasts).
 */
import { CONVERSION_COPY } from '../core/conversion-copy.js';

export function initConversionMicroUx() {
  if (typeof document === 'undefined') return;

  applyNavConversionLabels();
  injectPricingTrustLine();
  bindAuthSuccessToasts();

  document.addEventListener('routeChanged', () => {
    applyNavConversionLabels();
    injectPricingTrustLine();
  });
}

function applyNavConversionLabels() {
  const { nav, mobileNav } = CONVERSION_COPY;

  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const autoCta = document.querySelector('.nav-cta-auto');

  if (loginBtn && !loginBtn.dataset.conversionApplied) {
    loginBtn.textContent = nav.login;
    loginBtn.setAttribute('aria-label', nav.login);
    loginBtn.dataset.conversionApplied = '1';
  }

  if (registerBtn && !registerBtn.dataset.conversionApplied) {
    registerBtn.textContent = nav.register;
    registerBtn.setAttribute('title', nav.registerTitle);
    registerBtn.setAttribute('aria-label', nav.registerTitle);
    registerBtn.dataset.conversionApplied = '1';
  }

  if (autoCta && autoCta.textContent.trim() === 'Ücretsiz maliyet analizi') {
    autoCta.setAttribute(
      'title',
      '5 adımlı TCO analizi — ücretsiz, kayıt zorunlu değil'
    );
  }

  document.querySelectorAll('[data-mobile-login], [data-mobile-header-login]').forEach((el) => {
    if (el instanceof HTMLElement) el.textContent = mobileNav.login;
  });
  document.querySelectorAll('[data-mobile-register], [data-mobile-header-register]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.textContent = mobileNav.register;
      el.setAttribute('aria-label', mobileNav.register);
    }
  });

  document.querySelectorAll('[data-account-register]').forEach((el) => {
    if (el instanceof HTMLElement) {
      el.textContent = CONVERSION_COPY.account.register;
      el.setAttribute('title', CONVERSION_COPY.nav.registerTitle);
    }
  });

  const accountLogin = document.getElementById('account-login-btn');
  if (accountLogin instanceof HTMLElement) {
    accountLogin.textContent = CONVERSION_COPY.account.login;
  }
}

function injectPricingTrustLine() {
  const pricing = document.getElementById('planlar') || document.querySelector('[data-route="planlar"]');
  const host =
    pricing?.querySelector('.pricing-hero, .revenue-pricing-head, .page-hero') ||
    document.querySelector('.revenue-pricing-head');

  if (!host || host.querySelector('.ib-conversion-trust-line')) return;

  const line = document.createElement('p');
  line.className = 'ib-conversion-trust-line text-muted-sm';
  line.setAttribute('role', 'note');
  line.textContent = CONVERSION_COPY.trust.pricing;
  host.appendChild(line);
}

function bindAuthSuccessToasts() {
  document.addEventListener('ib:auth-toast', (event) => {
    const message = event.detail?.message;
    const type = event.detail?.type || 'success';
    if (!message || type !== 'success') return;

    const toast = document.createElement('div');
    toast.className = 'ib-conversion-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 320);
    }, 5200);
  });
}
