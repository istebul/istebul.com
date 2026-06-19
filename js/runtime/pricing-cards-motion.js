/**
 * Scroll-triggered pricing card entrance + stagger indices.
 */
function applyCardStagger(stage) {
  const cards = stage.querySelectorAll('.revenue-plan-card');
  cards.forEach((card, index) => {
    card.style.setProperty('--ib-card-i', String(index));
  });
}

export function initPricingCardsMotion(scope = document) {
  if (typeof window === 'undefined' || !scope?.querySelectorAll) return;

  const stages = scope.querySelectorAll('.ib-pricing-cards-stage');
  if (!stages.length) return;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  stages.forEach((stage) => {
    applyCardStagger(stage);

    if (reducedMotion) {
      stage.classList.add('ib-pricing-cards-stage--in-view');
      return;
    }

    if (stage.classList.contains('ib-pricing-cards-stage--in-view')) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('ib-pricing-cards-stage--in-view');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6%' }
    );

    observer.observe(stage);
  });
}

document.addEventListener('ib:pricing-rendered', () => {
  initPricingCardsMotion(document);
});

if (typeof document !== 'undefined') {
  const boot = () => initPricingCardsMotion(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
