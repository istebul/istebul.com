/**
 * P4 product polish — runtime UX (all ib-enterprise surfaces).
 */

const REDUCED_MOTION = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

export function initP4ProductPolish() {
  if (typeof document === 'undefined') return;

  document.body.classList.add('ib-enterprise');
  if (document.getElementById('home')) {
    document.body.classList.add('ib-home-landing');
  }
  requestAnimationFrame(() => {
    document.body.classList.add('ib-page-ready');
  });

  injectHeroCtaMicrocopy();
  enhanceStickyCta();
  bindButtonBusyState();
  bindLazySectionReveal();
}

function injectHeroCtaMicrocopy() {
  if (document.querySelector('.ib-hero-cta-hint')) return;

  const heroPrimary = document.querySelector(
    '.hero-actions .btn-primary[data-analytics-placement="hero"]'
  );
  if (!heroPrimary || heroPrimary.closest('.ib-hero-venture')?.querySelector('.ib-cta-trust-line')) {
    return;
  }

  const stack = heroPrimary.closest('.hero-actions, .ib-hero-cta-stack');
  if (!stack || stack.querySelector('.ib-cta-trust-line')) return;

  const line = document.createElement('span');
  line.className = 'ib-cta-trust-line';
  line.textContent =
    'Ücretsiz · ~2 dk · KVKK uyumlu · bağlayıcı teklif değil — metodolojik destek';
  stack.appendChild(line);
}

function enhanceStickyCta() {
  const sticky = document.querySelector('.cro-sticky-cta');
  if (!sticky || sticky.querySelector('.ib-cta-trust-line')) return;

  const line = document.createElement('span');
  line.className = 'ib-cta-trust-line';
  line.textContent = 'Skor ve TCO kural tabanlı · AI yalnızca gerekçe';
  sticky.appendChild(line);
}

function bindButtonBusyState() {
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.hasAttribute('data-enterprise-form')) return;

      const submit = form.querySelector('[type="submit"]');
      if (submit instanceof HTMLButtonElement) {
        submit.setAttribute('aria-busy', 'true');
        window.setTimeout(() => submit.removeAttribute('aria-busy'), 8000);
      }
    },
    true
  );
}

function bindLazySectionReveal() {
  if (REDUCED_MOTION() || !('IntersectionObserver' in window)) return;

  const targets = document.querySelectorAll(
    '.trust-card, .how-step, .pricing-card, .premium-steps article, .ib-moat-layer-card, .hero-trust-panel > div, .ib-premium-step-list li, .partner-rate-card, .ib-methodology-steps li, .ib-social-proof li'
  );

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('ib-reveal-visible');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8%', threshold: 0.08 }
  );

  for (const el of targets) {
    el.classList.add('ib-reveal-pending');
    io.observe(el);
  }
}
