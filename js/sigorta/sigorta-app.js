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

initDecisionFlow(
  resolveWizardConfig('sigorta', {
    vertical: 'sigorta',
    themeClass: 'sigorta-page',
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

trackSigortaPageView();
