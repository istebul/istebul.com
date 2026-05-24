/**
 * P4.3 — Mobile premium UX runtime (keyboard, sticky CTA, scroll comfort).
 */

const MOBILE_MQ = '(max-width: 768px)';

function isMobile() {
  return typeof window !== 'undefined' && window.matchMedia?.(MOBILE_MQ)?.matches;
}

function setKeyboardOpen(open) {
  document.body.classList.toggle('ib-keyboard-open', open);
}

function bindKeyboardViewport() {
  if (!window.visualViewport || !isMobile()) return;

  let baseline = window.visualViewport.height;

  const sync = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    if (!baseline || vv.height > baseline * 0.98) {
      baseline = vv.height;
    }
    const keyboardLikely = vv.height < baseline * 0.82;
    setKeyboardOpen(keyboardLikely);
  };

  window.visualViewport.addEventListener('resize', sync);
  window.visualViewport.addEventListener('scroll', sync);
  sync();
}

function bindFocusStickyHide() {
  if (!isMobile()) return;

  const stickySelector = '.cro-sticky-cta';
  let focusDepth = 0;

  const isFormField = (el) =>
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement;

  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target;
      if (!isFormField(target)) return;
      focusDepth += 1;
      document.body.classList.add('ib-hide-sticky-cta');
      setKeyboardOpen(true);

      requestAnimationFrame(() => {
        try {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {
          target.scrollIntoView(true);
        }
      });
    },
    true
  );

  document.addEventListener(
    'focusout',
    () => {
      focusDepth = Math.max(0, focusDepth - 1);
      if (focusDepth === 0) {
        window.setTimeout(() => {
          if (focusDepth === 0) {
            document.body.classList.remove('ib-hide-sticky-cta');
            if (!window.visualViewport) setKeyboardOpen(false);
          }
        }, 120);
      }
    },
    true
  );

  document.addEventListener('click', (event) => {
    if (event.target.closest(stickySelector)) return;
  });
}

function bindHeroStickyDismiss() {
  if (!isMobile() || !document.getElementById('home')) return;

  const heroCta = document.querySelector(
    '.ib-hero-venture .btn-primary[data-analytics-placement="hero"]'
  );
  const sticky = document.querySelector('.cro-sticky-cta');
  if (!heroCta || !sticky || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    ([entry]) => {
      document.body.classList.toggle('ib-hide-sticky-cta', entry.isIntersecting);
    },
    { rootMargin: '0px 0px -40% 0px', threshold: 0.15 }
  );

  io.observe(heroCta);
}

function bindWizardScrollComfort() {
  const wizard = document.getElementById('auto-wizard');
  if (!wizard || !isMobile()) return;

  wizard.addEventListener('click', (event) => {
    const option = event.target.closest('.wizard-option');
    if (!option) return;
    requestAnimationFrame(() => {
      const actions = wizard.querySelector('.wizard-actions');
      actions?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    });
  });
}

export function initMobilePremiumUx() {
  if (typeof document === 'undefined' || !isMobile()) return;

  document.body.classList.add('ib-mobile-premium');
  bindKeyboardViewport();
  bindFocusStickyHide();
  bindHeroStickyDismiss();
  bindWizardScrollComfort();
}
