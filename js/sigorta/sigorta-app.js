import { initDecisionFlow } from '../vertical/vertical-decision-app.js';
import { resolveWizardConfig } from '../vertical/wizard-i18n.js';
import {
  getSigortaSteps,
  SIGORTA_OPTIONS,
  SIGORTA_DISCLAIMER,
  resetSigortaFieldsForTypeChange
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

function isValidAge(age) {
  const n = Number(age);
  return Number.isFinite(n) && n >= 18 && n <= 99;
}

function canAdvance(state, step) {
  if (!step) return false;
  switch (step.id) {
    case 'type':
      return Boolean(state.insurance_type);
    case 'driver':
      return (
        isValidAge(state.age) &&
        Boolean(state.license_years) &&
        Boolean(state.usage_type)
      );
    case 'vehicle':
      return Boolean(state.vehicle_category) && Boolean(state.vehicle_year_band);
    case 'property':
      return Boolean(state.property_role) && Boolean(state.property_type);
    case 'profile':
      return isValidAge(state.age) && Boolean(state.marital_status);
    case 'household':
      if (state.insurance_type === 'konut') {
        return (
          isValidAge(state.age) &&
          Boolean(state.marital_status) &&
          state.children_count !== undefined &&
          state.children_count !== ''
        );
      }
      return state.children_count !== undefined && state.children_count !== '';
    case 'trip':
      return (
        Boolean(state.destination_type) &&
        Boolean(state.trip_duration) &&
        Boolean(state.traveler_count)
      );
    case 'risk':
      return Boolean(state.risk_perception);
    case 'budget':
      return Boolean(state.budget_level);
    default:
      return true;
  }
}

function renderStepBody(step, state, { renderOptionGrid }) {
  switch (step.id) {
    case 'type':
      return renderOptionGrid('insurance_type', SIGORTA_OPTIONS.insurance_type, true);
    case 'driver':
      return `
      <label class="vacation-field"><span>Sürücü yaşı</span>
        <input type="number" min="18" max="99" data-manual="age" value="${state.age ?? ''}" placeholder="Örn: 35"></label>
      <p class="vacation-step-subtitle">Ehliyet süresi</p>
      ${renderOptionGrid('license_years', SIGORTA_OPTIONS.license_years, true)}
      <p class="vacation-step-subtitle">Kullanım tipi</p>
      ${renderOptionGrid('usage_type', SIGORTA_OPTIONS.usage_type, true)}`;
    case 'vehicle':
      return `
      <p class="vacation-step-subtitle">Araç tipi</p>
      ${renderOptionGrid('vehicle_category', SIGORTA_OPTIONS.vehicle_category, true)}
      <p class="vacation-step-subtitle">Araç yaşı</p>
      ${renderOptionGrid('vehicle_year_band', SIGORTA_OPTIONS.vehicle_year_band, true)}`;
    case 'property':
      return `
      <p class="vacation-step-subtitle">Konut durumu</p>
      ${renderOptionGrid('property_role', SIGORTA_OPTIONS.property_role, true)}
      <p class="vacation-step-subtitle">Konut tipi</p>
      ${renderOptionGrid('property_type', SIGORTA_OPTIONS.property_type, true)}`;
    case 'profile':
      return `
      <label class="vacation-field"><span>Yaşınız</span>
        <input type="number" min="18" max="99" data-manual="age" value="${state.age ?? ''}" placeholder="Örn: 35"></label>
      <p class="vacation-step-subtitle">Medeni durum</p>
      ${renderOptionGrid('marital_status', SIGORTA_OPTIONS.marital_status, true)}`;
    case 'household':
      if (state.insurance_type === 'konut') {
        return `
        <label class="vacation-field"><span>Yaşınız</span>
          <input type="number" min="18" max="99" data-manual="age" value="${state.age ?? ''}" placeholder="Örn: 35"></label>
        <p class="vacation-step-subtitle">Medeni durum</p>
        ${renderOptionGrid('marital_status', SIGORTA_OPTIONS.marital_status, true)}
        <p class="vacation-step-subtitle">Çocuk sayısı</p>
        ${renderOptionGrid('children_count', SIGORTA_OPTIONS.children_count, true)}`;
      }
      return renderOptionGrid('children_count', SIGORTA_OPTIONS.children_count, true);
    case 'trip':
      return `
      <p class="vacation-step-subtitle">Destinasyon</p>
      ${renderOptionGrid('destination_type', SIGORTA_OPTIONS.destination_type, true)}
      <p class="vacation-step-subtitle">Seyahat süresi</p>
      ${renderOptionGrid('trip_duration', SIGORTA_OPTIONS.trip_duration, true)}
      <p class="vacation-step-subtitle">Kaç kişi seyahat edecek?</p>
      ${renderOptionGrid('traveler_count', SIGORTA_OPTIONS.traveler_count, true)}`;
    case 'risk':
      return renderOptionGrid('risk_perception', SIGORTA_OPTIONS.risk_perception, true);
    case 'budget':
      return renderOptionGrid('budget_level', SIGORTA_OPTIONS.budget_level, true);
    default:
      return '';
  }
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
      steps: getSigortaSteps(),
      getSteps: (s) => getSigortaSteps(s.insurance_type),
      disclaimer: SIGORTA_DISCLAIMER,
      resultsTitle: 'Sigorta koruma senaryoları',
      resultsKicker: 'Sigorta analizi tamamlandı',
      tracker,
      initialState: {
        insurance_type: '',
        age: null,
        marital_status: '',
        children_count: '',
        license_years: '',
        usage_type: '',
        vehicle_category: '',
        vehicle_year_band: '',
        property_role: '',
        property_type: '',
        destination_type: '',
        trip_duration: '',
        traveler_count: '',
        risk_perception: '',
        budget_level: ''
      },
      canAdvance,
      renderStepBody,
      onFieldChange(state, field) {
        if (field !== 'insurance_type') return;
        const prev = state._lastInsuranceType || '';
        if (state.insurance_type === prev) return;
        resetSigortaFieldsForTypeChange(state, prev);
        state._lastInsuranceType = state.insurance_type;
        const steps = getSigortaSteps(state.insurance_type);
        if (state.stepIndex >= steps.length) {
          state.stepIndex = Math.max(0, steps.length - 1);
        }
        if (state.stepIndex > 0 && prev) {
          state.stepIndex = 1;
        }
      },
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
