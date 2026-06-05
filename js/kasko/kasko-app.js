import { initDecisionFlow } from '../vertical/vertical-decision-app.js';
import { resolveWizardConfig } from '../vertical/wizard-i18n.js';
import { createVerticalTracker } from '../vertical/vertical-intake.js';
import {
  KASKO_STEPS,
  KASKO_OPTIONS,
  KASKO_DISCLAIMER
} from './kasko-config.js';
import { getKaskoOptions, getKaskoStepMeta, resetKaskoFieldsOnUsageChange } from './kasko-flow.js';
import {
  buildKaskoResults,
  buildKaskoSummary,
  buildEngineResult,
  getKaskoProgress
} from '../features/kasko/kasko-engine.js';
import { buildKaskoAiSummary } from '../features/kasko/kasko-ai-summary.js';
import { trackKaskoPageView } from './kasko-intake.js';
import { bootstrapKaskoFromAssistantQuery } from '../features/assistant/assistant-category-bridge.js';

export const KASKO_DOM_IDS = {
  stepProgress: 'kasko-step-progress',
  aiSummary: 'kasko-ai-summary',
  wizard: 'kasko-wizard',
  results: 'kasko-results',
  flow: 'kasko-flow',
  heroCta: 'kasko-hero-cta',
  heroCtaSecondary: 'kasko-hero-cta-secondary',
  nav: 'kasko-nav',
  back: 'kasko-back',
  next: 'kasko-next',
  confirmSelection: 'kasko-confirm-selection',
  finalCta: 'kasko-final-cta',
  changeSelection: 'kasko-change-selection',
  selectPrimary: 'kasko-select-primary',
  selectionBar: 'kasko-selection-bar',
  leadName: 'kasko-lead-name',
  leadPhone: 'kasko-lead-phone',
  leadEmail: 'kasko-lead-email'
};

const tracker = createVerticalTracker('kasko');

function isValidAge(age) {
  const n = Number(age);
  return Number.isFinite(n) && n >= 18 && n <= 99;
}

function canAdvance(state, step) {
  if (!step) return false;
  switch (step.id) {
    case 'vehicle':
      return Boolean(state.vehicle_category) && Boolean(state.vehicle_year_band);
    case 'driver':
      return (
        isValidAge(state.age) &&
        Boolean(state.license_years) &&
        Boolean(state.usage_type)
      );
    case 'coverage':
      return Boolean(state.coverage_level);
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
    case 'vehicle':
      return `
      <p class="vacation-step-subtitle">Araç tipi</p>
      ${renderOptionGrid('vehicle_category', getKaskoOptions('vehicle_category', state), true)}
      <p class="vacation-step-subtitle">Araç yaşı</p>
      ${renderOptionGrid('vehicle_year_band', KASKO_OPTIONS.vehicle_year_band, true)}`;
    case 'driver':
      return `
      <label class="vacation-field"><span>Sürücü yaşı</span>
        <input type="number" min="18" max="99" data-manual="age" value="${state.age ?? ''}"></label>
      <p class="vacation-step-subtitle">Ehliyet süresi</p>
      ${renderOptionGrid('license_years', KASKO_OPTIONS.license_years, true)}
      <p class="vacation-step-subtitle">Kullanım</p>
      ${renderOptionGrid('usage_type', KASKO_OPTIONS.usage_type, true)}`;
    case 'coverage':
      return renderOptionGrid('coverage_level', getKaskoOptions('coverage_level', state), true);
    case 'risk':
      return renderOptionGrid('risk_perception', KASKO_OPTIONS.risk_perception, true);
    case 'budget':
      return renderOptionGrid('budget_level', KASKO_OPTIONS.budget_level, true);
    default:
      return '';
  }
}

function buildCommentary(state) {
  const engine = buildEngineResult(state);
  const ai = buildKaskoAiSummary(engine, state);
  return { summary: ai.summary, bullets: ai.bullets, nextStep: engine.nextSteps[0] };
}

function boot() {
  const flowApi = initDecisionFlow(
    resolveWizardConfig('kasko', {
      vertical: 'kasko',
      themeClass: 'kasko-page',
      domIds: KASKO_DOM_IDS,
      externalHeroBindings: true,
      steps: KASKO_STEPS,
      getStepMeta: (s, step) => getKaskoStepMeta(s, step),
      disclaimer: KASKO_DISCLAIMER,
      resultsTitle: 'Kasko senaryoları',
      resultsKicker: 'Kasko analizi tamamlandı',
      tracker,
      initialState: {
        age: null,
        vehicle_category: '',
        vehicle_year_band: '',
        license_years: '',
        usage_type: '',
        coverage_level: '',
        risk_perception: '',
        budget_level: ''
      },
      canAdvance,
      renderStepBody,
      onFieldChange(state, field, _value, previousValue) {
        if (field === 'usage_type') {
          resetKaskoFieldsOnUsageChange(state, previousValue, state.usage_type);
        }
      },
      buildResults: buildKaskoResults,
      buildSummary: buildKaskoSummary,
      buildCommentary,
      getProgress: getKaskoProgress,
      bootstrapFromQuery: bootstrapKaskoFromAssistantQuery
    })
  );

  document.getElementById(KASKO_DOM_IDS.heroCta)?.addEventListener('click', () => {
    flowApi.scrollToFlow();
    flowApi.startWizard();
    tracker.trackStart({ source: 'hero_cta' });
  });
  document.getElementById(KASKO_DOM_IDS.heroCtaSecondary)?.addEventListener('click', () => {
    flowApi.scrollToFlow();
    tracker.trackStart({ source: 'hero_secondary' });
  });

  trackKaskoPageView();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
