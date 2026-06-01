import { initDecisionFlow } from '../vertical/vertical-decision-app.js';
import { resolveWizardConfig } from '../vertical/wizard-i18n.js';
import {
  SIGORTA_STEPS,
  SIGORTA_OPTIONS,
  SIGORTA_DISCLAIMER
} from './sigorta-config.js';
import {
  buildSigortaResults,
  buildSigortaSummary,
  buildEngineResult,
  getSigortaProgress
} from '../features/sigorta/sigorta-engine.js';
import { buildSigortaAiSummary } from '../features/sigorta/sigorta-ai-summary.js';
import {
  trackSigortaPageView,
  trackSigortaAnalysisStarted,
  trackSigortaStep,
  saveSigortaLead
} from './sigorta-intake.js';

/** Sigorta sayfası DOM id’leri — vacation-* id’leri ile çakışmayı önler */
export const SIGORTA_DOM_IDS = {
  stepProgress: 'sigorta-step-progress',
  aiSummary: 'sigorta-ai-summary',
  wizard: 'sigorta-wizard',
  results: 'sigorta-results',
  flow: 'sigorta-flow',
  heroCta: 'sigorta-hero-cta',
  heroCtaSecondary: 'sigorta-hero-cta-secondary',
  nav: 'sigorta-nav',
  back: 'sigorta-back',
  next: 'sigorta-next',
  confirmSelection: 'sigorta-confirm-selection',
  finalCta: 'sigorta-final-cta',
  changeSelection: 'sigorta-change-selection',
  selectPrimary: 'sigorta-select-primary',
  selectionBar: 'sigorta-selection-bar',
  leadName: 'sigorta-lead-name',
  leadPhone: 'sigorta-lead-phone',
  leadEmail: 'sigorta-lead-email'
};

const BOOT_ERROR_ID = 'sigorta-boot-error';

const tracker = {
  track(eventName, metadata = {}) {
    return trackSigortaStep(eventName, metadata?.step_index ?? 0);
  },
  trackStart() {
    return trackSigortaAnalysisStarted({ source: 'wizard' });
  },
  trackStep(stepId, stepIndex) {
    return trackSigortaStep(stepId, stepIndex);
  },
  trackResults(meta = {}) {
    return trackSigortaAnalysisStarted({ phase: 'results', ...meta });
  },
  trackSelect(option, extra = {}) {
    return trackSigortaStep('option_selected', { option, ...extra });
  },
  trackConfirm(option) {
    return trackSigortaStep('selection_confirmed', { option });
  },
  saveLead: saveSigortaLead,
  events: {}
};

function canAdvance(state, step) {
  if (!step) return false;
  if (step.id === 'type') return Boolean(state.insurance_type);
  if (step.id === 'profile') {
    const age = Number(state.age);
    return age >= 18 && age <= 99 && Boolean(state.marital_status);
  }
  if (step.id === 'household') return state.children_count !== undefined && state.children_count !== '';
  if (step.id === 'risk') return Boolean(state.risk_perception);
  if (step.id === 'budget') return Boolean(state.budget_level);
  return true;
}

function renderStepBody(step, state, { renderOptionGrid }) {
  if (step.id === 'type') {
    return renderOptionGrid('insurance_type', SIGORTA_OPTIONS.insurance_type, true);
  }
  if (step.id === 'profile') {
    return `
      <label class="vacation-field"><span>Yaşınız</span>
        <input type="number" min="18" max="99" data-manual="age" value="${state.age ?? ''}" placeholder="Örn: 35"></label>
      <p class="vacation-step-subtitle">Medeni durum</p>
      ${renderOptionGrid('marital_status', SIGORTA_OPTIONS.marital_status, true)}`;
  }
  if (step.id === 'household') {
    return renderOptionGrid('children_count', SIGORTA_OPTIONS.children_count, true);
  }
  if (step.id === 'risk') {
    return renderOptionGrid('risk_perception', SIGORTA_OPTIONS.risk_perception, true);
  }
  if (step.id === 'budget') {
    return renderOptionGrid('budget_level', SIGORTA_OPTIONS.budget_level, true);
  }
  return '';
}

function buildCommentary(state, _results) {
  const engine = buildEngineResult(state);
  const ai = buildSigortaAiSummary(engine, state);
  return {
    summary: ai.summary,
    bullets: ai.bullets,
    nextStep: engine.nextSteps[0]
  };
}

let flowApi = null;
let domRefs = null;

function showBootError(message, anchorId = SIGORTA_DOM_IDS.wizard) {
  const anchor =
    document.getElementById(anchorId) ||
    document.getElementById(SIGORTA_DOM_IDS.flow) ||
    document.querySelector('.vacation-main');
  if (!anchor) return;

  let banner = document.getElementById(BOOT_ERROR_ID);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = BOOT_ERROR_ID;
    banner.className = 'sigorta-boot-error';
    banner.setAttribute('role', 'alert');
    anchor.prepend(banner);
  }
  banner.hidden = false;
  banner.textContent = message;
}

function clearBootError() {
  const banner = document.getElementById(BOOT_ERROR_ID);
  if (banner) banner.hidden = true;
}

function collectDomRefs() {
  return {
    heroCta: document.getElementById(SIGORTA_DOM_IDS.heroCta),
    heroCtaSecondary: document.getElementById(SIGORTA_DOM_IDS.heroCtaSecondary),
    flow: document.getElementById(SIGORTA_DOM_IDS.flow),
    wizard: document.getElementById(SIGORTA_DOM_IDS.wizard),
    results: document.getElementById(SIGORTA_DOM_IDS.results),
    stepProgress: document.getElementById(SIGORTA_DOM_IDS.stepProgress),
    aiSummary: document.getElementById(SIGORTA_DOM_IDS.aiSummary)
  };
}

function validateDomRefs(refs) {
  const required = [
    ['heroCta', SIGORTA_DOM_IDS.heroCta],
    ['flow', SIGORTA_DOM_IDS.flow],
    ['wizard', SIGORTA_DOM_IDS.wizard],
    ['results', SIGORTA_DOM_IDS.results]
  ];
  const missing = required.filter(([key]) => !refs[key]).map(([, id]) => id);
  if (missing.length) {
    showBootError(
      `Sigorta analizi başlatılamadı. Eksik sayfa öğeleri: ${missing.join(', ')}. Sayfayı yenileyin veya destek ile iletişime geçin.`
    );
    return false;
  }
  clearBootError();
  return true;
}

function revealFlow(flowEl) {
  if (!flowEl) return;
  flowEl.hidden = false;
  flowEl.classList.remove('hidden');
  flowEl.removeAttribute('hidden');
  const main = flowEl.closest('main');
  if (main) {
    main.hidden = false;
    main.classList.remove('hidden');
  }
}

function scrollToFlow(flowEl) {
  revealFlow(flowEl);
  flowEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ensureWizardRendered() {
  if (!flowApi?.renderWizard) return;
  const wizard = domRefs?.wizard;
  if (wizard && !wizard.innerHTML.trim()) {
    flowApi.renderWizard();
    return;
  }
  if (wizard?.hidden) {
    flowApi.startWizard?.();
    return;
  }
  flowApi.renderWizard();
}

function bindSigortaHeroCtas(refs) {
  refs.heroCta?.addEventListener('click', () => {
    scrollToFlow(refs.flow);
    flowApi?.startWizard?.();
    ensureWizardRendered();
    trackSigortaAnalysisStarted({ source: 'hero_cta' });
  });

  refs.heroCtaSecondary?.addEventListener('click', () => {
    scrollToFlow(refs.flow);
    ensureWizardRendered();
    trackSigortaAnalysisStarted({ source: 'hero_secondary' });
  });
}

function bootSigortaApp() {
  domRefs = collectDomRefs();
  const domOk = validateDomRefs(domRefs);

  flowApi = initDecisionFlow(
    resolveWizardConfig('sigorta', {
      vertical: 'sigorta',
      themeClass: 'sigorta-page',
      domIds: SIGORTA_DOM_IDS,
      externalHeroBindings: true,
      steps: SIGORTA_STEPS,
      disclaimer: SIGORTA_DISCLAIMER,
      resultsTitle: 'Sigorta koruma senaryoları',
      resultsKicker: 'Sigorta analizi tamamlandı',
      tracker,
      initialState: {
        insurance_type: '',
        age: null,
        marital_status: '',
        children_count: '',
        risk_perception: '',
        budget_level: ''
      },
      canAdvance,
      renderStepBody,
      onStepComplete(state, step) {
        return tracker.trackStep(step.id, state.stepIndex);
      },
      buildResults: buildSigortaResults,
      buildSummary: buildSigortaSummary,
      buildCommentary,
      getProgress: getSigortaProgress
    })
  );

  if (domOk) {
    bindSigortaHeroCtas(domRefs);
    revealFlow(domRefs.flow);
    ensureWizardRendered();
  }

  trackSigortaPageView();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootSigortaApp, { once: true });
} else {
  bootSigortaApp();
}
