import { initDecisionFlow } from '../vertical/vertical-decision-app.js';
import { resolveWizardConfig } from '../vertical/wizard-i18n.js';
import { createVerticalTracker } from '../vertical/vertical-intake.js';
import { FINANS_STEPS, FINANS_OPTIONS, FINANS_DISCLAIMER } from './finans-config.js';
import {
  buildFinansResults,
  buildFinansSummary,
  buildFinansCommentary,
  getFinansProgress,
  parseManualBudget
} from './finans-engine.js';
import { formatTry } from '../tatil/tatil-utils.js';

const tracker = createVerticalTracker('finans');

function canAdvance(state, step) {
  if (!step) return false;
  if (step.id === 'purpose') return Boolean(state.purpose);
  if (step.id === 'amount') {
    if (!state.amount_range) return false;
    if (state.amount_range === 'manuel') return Boolean(state.amount_manual);
    return true;
  }
  if (step.id === 'term') return Boolean(state.term_months);
  if (step.id === 'capacity') {
    if (!state.capacity_range) return false;
    if (state.capacity_range === 'manuel') return Boolean(state.capacity_manual);
    return true;
  }
  if (step.id === 'cashflow') {
    return Boolean(state.income_type) && Boolean(state.early_payment) && Boolean(state.monthly_income);
  }
  if (step.id === 'sensitivity') {
    return Boolean(state.rate_sensitivity) && Boolean(state.risk_tolerance);
  }
  return true;
}

function renderStepBody(step, state, { renderOptionGrid }) {
  if (step.id === 'purpose') return renderOptionGrid('purpose', FINANS_OPTIONS.purpose, true);
  if (step.id === 'amount') {
    return `
      ${renderOptionGrid('amount_range', FINANS_OPTIONS.amount, true)}
      ${
        state.amount_range === 'manuel'
          ? `<label class="vacation-field"><span>Kredi tutarı</span>
        <input type="text" data-manual="amount_manual" value="${state.amount_manual ? formatTry(state.amount_manual) : ''}"></label>`
          : ''
      }`;
  }
  if (step.id === 'term') return renderOptionGrid('term_months', FINANS_OPTIONS.term, true);
  if (step.id === 'capacity') {
    return `
      ${renderOptionGrid('capacity_range', FINANS_OPTIONS.capacity, true)}
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
      ${renderOptionGrid('income_type', FINANS_OPTIONS.income, true)}
      <p class="vacation-step-subtitle">Erken ödeme ihtimali</p>
      ${renderOptionGrid('early_payment', FINANS_OPTIONS.earlyPayment, true)}`;
  }
  if (step.id === 'sensitivity') {
    return `
      <p class="vacation-step-subtitle">Faiz hassasiyeti</p>
      ${renderOptionGrid('rate_sensitivity', FINANS_OPTIONS.rateSensitivity, true)}
      <p class="vacation-step-subtitle">Risk toleransı</p>
      ${renderOptionGrid('risk_tolerance', FINANS_OPTIONS.riskTolerance, true)}`;
  }
  return '';
}

initDecisionFlow(
  resolveWizardConfig('finans', {
  vertical: 'finans',
  themeClass: 'finans-page',
  steps: FINANS_STEPS,
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
  canAdvance,
  renderStepBody,
  onFieldChange(state, field) {
    if (field === 'amount_range' && state.amount_range !== 'manuel') state.amount_manual = null;
    if (field === 'capacity_range' && state.capacity_range !== 'manuel') state.capacity_manual = null;
  },
  onStepComplete(state, step) {
    return tracker.trackStep(step.id, state.stepIndex);
  },
  buildResults: buildFinansResults,
  buildSummary: buildFinansSummary,
  buildCommentary: buildFinansCommentary,
  getProgress: getFinansProgress
  })
);
