import { initDecisionFlow } from '../vertical/vertical-decision-app.js';
import { resolveWizardConfig } from '../vertical/wizard-i18n.js';
import { createVerticalTracker } from '../vertical/vertical-intake.js';
import { FINANS_OPTIONS, FINANS_DISCLAIMER } from './finans-config.js';
import {
  getFinansSteps,
  getFinansOptions,
  getFinansStepMeta,
  resetFieldsOnPurposeChange,
  canAdvanceFinansStep
} from './finans-flow.js';
import {
  buildFinansResults,
  buildFinansSummary,
  buildFinansCommentary,
  getFinansProgress,
  parseManualBudget
} from './finans-engine.js';
import { formatTry } from '../tatil/tatil-utils.js';
import { bootstrapFinansFromAssistantQuery } from '../features/assistant/assistant-category-bridge.js';

const tracker = createVerticalTracker('finans');

export const FINANS_DOM_IDS = {
  stepProgress: 'finans-step-progress',
  aiSummary: 'finans-ai-summary',
  wizard: 'finans-wizard',
  results: 'finans-results',
  flow: 'finans-flow',
  heroCta: 'finans-hero-cta',
  heroCtaSecondary: 'finans-hero-cta-secondary',
  nav: 'finans-nav',
  back: 'finans-back',
  next: 'finans-next',
  confirmSelection: 'finans-confirm-selection',
  finalCta: 'finans-final-cta',
  changeSelection: 'finans-change-selection',
  selectPrimary: 'finans-select-primary',
  selectionBar: 'finans-selection-bar',
  leadName: 'finans-lead-name',
  leadPhone: 'finans-lead-phone',
  leadEmail: 'finans-lead-email'
};

function renderStepBody(step, state, { renderOptionGrid }) {
  const purpose = state.purpose;
  if (step.id === 'purpose') return renderOptionGrid('purpose', FINANS_OPTIONS.purpose, true);
  if (step.id === 'amount') {
    return `
      ${renderOptionGrid('amount_range', getFinansOptions('amount', purpose), true)}
      ${
        state.amount_range === 'manuel'
          ? `<label class="vacation-field"><span>Kredi tutarı</span>
        <input type="text" data-manual="amount_manual" value="${state.amount_manual ? formatTry(state.amount_manual) : ''}"></label>`
          : ''
      }`;
  }
  if (step.id === 'term') return renderOptionGrid('term_months', getFinansOptions('term', purpose), true);
  if (step.id === 'capacity') {
    return `
      ${renderOptionGrid('capacity_range', getFinansOptions('capacity', purpose), true)}
      ${
        state.capacity_range === 'manuel'
          ? `<label class="vacation-field"><span>Aylık ödeme kapasitesi</span>
        <input type="text" data-manual="capacity_manual" value="${state.capacity_manual ? formatTry(state.capacity_manual) : ''}"></label>`
          : ''
      }`;
  }
  if (step.id === 'cashflow') {
    return `
      <p class="vacation-step-subtitle">Aylık gelir</p>
      <label class="vacation-field"><span>Net aylık gelir</span>
        <input type="text" data-manual="monthly_income" value="${state.monthly_income ? formatTry(state.monthly_income) : ''}" placeholder="Örn: 45.000 TL"></label>
      <p class="vacation-step-subtitle">Aylık gider</p>
      <label class="vacation-field"><span>Sabit aylık giderler</span>
        <input type="text" data-manual="monthly_expense" value="${state.monthly_expense ? formatTry(state.monthly_expense) : ''}" placeholder="Örn: 18.000 TL"></label>
      <p class="vacation-step-subtitle">Mevcut borç ödemeleri</p>
      <label class="vacation-field"><span>Toplam mevcut borç taksiti / ay</span>
        <input type="text" data-manual="existing_debt" value="${state.existing_debt ? formatTry(state.existing_debt) : ''}" placeholder="Örn: 6.500 TL"></label>
      <p class="vacation-step-subtitle">Gelir tipi</p>
      ${renderOptionGrid('income_type', getFinansOptions('income', purpose), true)}
      <p class="vacation-step-subtitle">Erken ödeme ihtimali</p>
      ${renderOptionGrid('early_payment', getFinansOptions('earlyPayment', purpose), true)}`;
  }
  if (step.id === 'sensitivity') {
    return `
      <p class="vacation-step-subtitle">Faiz hassasiyeti</p>
      ${renderOptionGrid('rate_sensitivity', getFinansOptions('rateSensitivity', purpose), true)}
      <p class="vacation-step-subtitle">Risk toleransı</p>
      ${renderOptionGrid('risk_tolerance', getFinansOptions('riskTolerance', purpose), true)}`;
  }
  return '';
}

initDecisionFlow(
  resolveWizardConfig('finans', {
  vertical: 'finans',
  themeClass: 'finans-page',
  domIds: FINANS_DOM_IDS,
  steps: getFinansSteps(),
  getSteps: (s) => getFinansSteps(s.purpose),
  getStepMeta: (s, step) => getFinansStepMeta(s.purpose, step),
  disclaimer: FINANS_DISCLAIMER,
  resultsTitle: 'Finansman senaryo önerileri',
  resultsKicker: 'Finansman analizi tamamlandı',
  tracker,
  parseManual: parseManualBudget,
  initialState: {
    purpose: '',
    amount_range: '',
    amount_manual: null,
    term_months: '',
    capacity_range: '',
    capacity_manual: null,
    monthly_income: null,
    monthly_expense: null,
    existing_debt: null,
    income_type: '',
    early_payment: '',
    rate_sensitivity: '',
    risk_tolerance: ''
  },
  canAdvance: canAdvanceFinansStep,
  renderStepBody,
  onFieldChange(state, field, _value, previousValue) {
    if (field === 'purpose') {
      resetFieldsOnPurposeChange(state, previousValue, state.purpose);
    }
    if (field === 'amount_range' && state.amount_range !== 'manuel') state.amount_manual = null;
    if (field === 'capacity_range' && state.capacity_range !== 'manuel') state.capacity_manual = null;
  },
  onStepComplete(state, step) {
    return tracker.trackStep(step.id, state.stepIndex);
  },
  buildResults: buildFinansResults,
  buildSummary: buildFinansSummary,
  buildCommentary: buildFinansCommentary,
  getProgress: getFinansProgress,
  bootstrapFromQuery: bootstrapFinansFromAssistantQuery
  })
);
