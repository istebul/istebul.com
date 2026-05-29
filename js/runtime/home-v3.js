/**
 * Ana sayfa V3 — animasyonlu nasıl çalışır progress (yalnızca #home rotasında).
 */
const STEP_MS = 3200;

function initHowItWorksProgress() {
  const section = document.getElementById('how-it-works');
  if (!section || !section.querySelector('.home-v3-progress')) return;

  const fill = section.querySelector('.home-v3-progress-fill');
  const steps = [...section.querySelectorAll('.home-v3-progress-step')];
  if (!fill || !steps.length) return;

  let index = 0;

  function applyStep(i) {
    steps.forEach((el, idx) => {
      el.classList.toggle('is-active', idx === i);
    });
    const pct = ((i + 1) / steps.length) * 100;
    fill.style.width = `${pct}%`;
  }

  applyStep(0);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    steps.forEach((el) => el.classList.add('is-active'));
    fill.style.width = '100%';
    return;
  }

  window.setInterval(() => {
    index = (index + 1) % steps.length;
    applyStep(index);
  }, STEP_MS);
}

export function initHomeV3() {
  if (document.documentElement.getAttribute('data-ib-route') !== 'home') return;
  initHowItWorksProgress();
}
