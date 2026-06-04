/**
 * @deprecated Canlı /konut/ rotası `js/real-estate/real-estate-app.js` kullanır.
 * Bu modül yalnızca test/legacy referansları içindir — HTML'e bağlamayın.
 */
import { initDecisionFlow } from '../vertical/vertical-decision-app.js';
import { resolveWizardConfig, wt } from '../vertical/wizard-i18n.js';
import { createVerticalTracker } from '../vertical/vertical-intake.js';
import { KONUT_STEPS, KONUT_OPTIONS, KONUT_DISCLAIMER } from './konut-config.js';
import {
  buildKonutResults,
  buildKonutSummary,
  buildKonutCommentary,
  getKonutProgress,
  parseManualBudget
} from './konut-engine.js';
import { formatTry } from '../tatil/tatil-utils.js';

const tracker = createVerticalTracker('konut');

function canAdvance(state, step) {
  if (!step) return false;
  if (step.id === 'profile') return Boolean(state.profile_goal);
  if (step.id === 'budget') {
    if (!state.budget_range) return false;
    if (state.budget_range === 'manuel') return Boolean(state.budget_manual);
    return true;
  }
  if (step.id === 'property') return Boolean(state.property_type);
  if (step.id === 'location') return Boolean(state.location_pref);
  if (step.id === 'financing') return Boolean(state.financing_mode) && (state.cost_factors?.length || 0) > 0;
  if (step.id === 'risks') return (state.risk_factors?.length || 0) > 0;
  return true;
}

function renderStepBody(step, state, { escapeHtml, renderOptionGrid, renderChipGrid }) {
  if (step.id === 'profile') return renderOptionGrid('profile_goal', KONUT_OPTIONS.profile, true);
  if (step.id === 'budget') {
    return `
      ${renderOptionGrid('budget_range', KONUT_OPTIONS.budget, true)}
      ${
        state.budget_range === 'manuel'
          ? `<label class="vacation-field"><span>${escapeHtml(wt('common.manualBudgetLabel', 'Toplam bütçe hedefi'))}</span>
        <input type="text" data-manual="budget_manual" value="${state.budget_manual ? formatTry(state.budget_manual) : ''}" placeholder="${escapeHtml(wt('common.manualBudgetPlaceholder', 'Örn: 5.500.000 ₺'))}"></label>`
          : ''
      }`;
  }
  if (step.id === 'property') return renderOptionGrid('property_type', KONUT_OPTIONS.property, true);
  if (step.id === 'location') return renderOptionGrid('location_pref', KONUT_OPTIONS.location, true);
  if (step.id === 'financing') {
    return `
      ${renderOptionGrid('financing_mode', KONUT_OPTIONS.financing, true)}
      <p class="vacation-step-subtitle">${escapeHtml(wt('common.fixedCostsHint', 'Sabit gider beklentileri (en az 1)'))}</p>
      ${renderChipGrid('cost_factors', KONUT_OPTIONS.costLevel)}`;
  }
  if (step.id === 'risks') return renderChipGrid('risk_factors', KONUT_OPTIONS.risks);
  return '';
}

initDecisionFlow(
  resolveWizardConfig('konut', {
  vertical: 'konut',
  themeClass: 'konut-page',
  steps: KONUT_STEPS,
  disclaimer: KONUT_DISCLAIMER,
  resultsTitle: 'Konut karar önerileri',
  tracker,
  parseManual: parseManualBudget,
  initialState: {
    profile_goal: '',
    budget_range: '',
    budget_manual: null,
    property_type: '',
    location_pref: '',
    financing_mode: '',
    cost_factors: [],
    risk_factors: []
  },
  canAdvance,
  renderStepBody,
  onFieldChange(state, field) {
    if (field === 'budget_range' && state.budget_range !== 'manuel') state.budget_manual = null;
  },
  onStepComplete(state, step) {
    return tracker.trackStep(step.id, state.stepIndex);
  },
  buildResults: buildKonutResults,
  buildSummary: buildKonutSummary,
  buildCommentary: buildKonutCommentary,
  getProgress: getKonutProgress
  })
);
