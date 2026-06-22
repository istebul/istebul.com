/**
 * Cross-hub "Karar yolculuğu" strip — Karar Merkezi → Seçenekler → Karşılaştır.
 */

const JOURNEY_STEPS = Object.freeze([
  { id: 'karar-merkezi', label: 'Ön değerlendirme', href: '/karar-asistani/' },
  { id: 'secenekler', label: 'Seçenekler', href: '/secenekler/' },
  { id: 'karsilastir', label: 'Karşılaştır', href: '/karsilastir/' }
]);

const ROUTE_TO_STEP = Object.freeze({
  'page-karar-analizi': 'karar-merkezi',
  'decision-assistant': 'karar-merkezi',
  ilanlar: 'secenekler',
  compare: 'compare'
});

const PATH_TO_STEP = Object.freeze({
  '/karar-asistani': 'karar-merkezi',
  '/secenekler': 'secenekler',
  '/ilanlar': 'secenekler',
  '/decision-options': 'secenekler',
  '/karsilastir': 'karsilastir'
});

function resolveActiveStep({ route, path } = {}) {
  const normalizedPath = String(path || window.location.pathname).replace(/\/$/, '') || '/';
  if (PATH_TO_STEP[normalizedPath]) return PATH_TO_STEP[normalizedPath];
  if (route && ROUTE_TO_STEP[route]) {
    const mapped = ROUTE_TO_STEP[route];
    return mapped === 'compare' ? 'karsilastir' : mapped;
  }
  return null;
}

function renderJourneyStrip(activeStepId) {
  const steps = JOURNEY_STEPS.map((step) => {
    const isActive = step.id === activeStepId;
    const current = isActive ? ' aria-current="step"' : '';
    const stateClass = isActive ? ' is-active' : '';
    return `<li><a href="${step.href}" class="ib-decision-journey-step${stateClass}" data-native-route data-journey-step="${step.id}"${current}>${step.label}</a></li>`;
  }).join('');

  return `
    <nav class="ib-decision-journey-strip" data-decision-journey-strip aria-label="Karar yolculuğu">
      <span class="ib-decision-journey-kicker">Karar yolculuğu</span>
      <ol class="ib-decision-journey-steps">${steps}</ol>
    </nav>`;
}

function findMountAnchor(activeStepId) {
  if (activeStepId === 'karar-merkezi') {
    return (
      document.querySelector('#premium-karar-analizi-root .ib-premium-hero') ||
      document.getElementById('premium-karar-analizi-root')
    );
  }
  if (activeStepId === 'secenekler') {
    return document.querySelector('#ilanlar .section-header');
  }
  if (activeStepId === 'karsilastir') {
    return document.querySelector('#compare .section-header');
  }
  return null;
}

function removeJourneyStrip() {
  document.querySelectorAll('[data-decision-journey-strip]').forEach((node) => node.remove());
}

function mountJourneyStrip(activeStepId) {
  if (!activeStepId) {
    removeJourneyStrip();
    return false;
  }

  const anchor = findMountAnchor(activeStepId);
  if (!anchor) return false;

  removeJourneyStrip();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderJourneyStrip(activeStepId);
  const strip = wrapper.firstElementChild;
  if (!strip) return false;

  anchor.insertAdjacentElement('afterend', strip);
  return true;
}

function syncJourneyStrip(detail = {}, attempt = 0) {
  const activeStepId = resolveActiveStep(detail);
  if (!activeStepId) {
    removeJourneyStrip();
    return;
  }

  if (mountJourneyStrip(activeStepId)) return;

  if (activeStepId === 'karar-merkezi' && attempt < 8) {
    window.setTimeout(() => syncJourneyStrip(detail, attempt + 1), 120);
  }
}

export function initDecisionJourneyStrip() {
  document.addEventListener('routeChanged', (event) => {
    syncJourneyStrip(event.detail || {});
  });

  syncJourneyStrip({
    route: document.documentElement.getAttribute('data-ib-route') || '',
    path: window.location.pathname
  });
}

export { JOURNEY_STEPS, resolveActiveStep, renderJourneyStrip };
