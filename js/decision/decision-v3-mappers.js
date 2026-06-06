/**
 * Decision Engine V3 — dikey bazlı input mapper'ları.
 * Her dikey kendi form/state yapısını ortak engine formatına çevirir.
 */
import { FINANS_OPTIONS } from '../finans/finans-config.js';
import { buildDecisionEngineV3 } from './ai-decision-engine-v3.js';
import { renderDecisionEngineV3 } from './decision-v3-renderer.js';

function pickNullable(...candidates) {
  for (const value of candidates) {
    if (value == null) continue;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.trim() ? value.trim() : null;
    if (Array.isArray(value)) return value.length ? value : null;
    return value;
  }
  return null;
}

function financeAmountMid(state = {}) {
  if (state.amount_range === 'manuel' && state.amount_manual) {
    return Number(state.amount_manual);
  }
  const mid = FINANS_OPTIONS.amount.find((o) => o.value === state.amount_range)?.mid;
  return mid ?? null;
}

function financeTermMonths(state = {}) {
  return FINANS_OPTIONS.term.find((o) => o.value === state.term_months)?.months ?? null;
}

function financeCapacityMid(state = {}) {
  if (state.capacity_range === 'manuel' && state.capacity_manual) {
    return Number(state.capacity_manual);
  }
  return FINANS_OPTIONS.capacity.find((o) => o.value === state.capacity_range)?.cap ?? null;
}

function riskPrefsInclude(prefs, pattern) {
  return (prefs || []).some((item) => pattern.test(String(item)));
}

/**
 * Araç sonuç ekranı → Decision Engine V3 input.
 * @param {object} input
 * @param {object} [input.formData]
 * @param {object} [input.topResult]
 * @param {object} [input.intel]
 * @param {Array} [input.alternatives]
 */
export function mapAutoToDecisionV3(input = {}) {
  const formData = input.formData || {};
  const topResult = input.topResult || {};
  const intel = input.intel || input.intelligence || {};
  const costs = topResult.costs || {};
  const ownership = costs.ownership || {};
  const totals = ownership.totals || {};

  return {
    vertical: 'auto',
    budget: pickNullable(formData.budget),
    usage: pickNullable(formData.usage),
    fuel: pickNullable(formData.fuel, topResult.fuel),
    vehiclePrice: pickNullable(topResult.price),
    downPayment: pickNullable(formData.downPayment, formData.down_payment),
    termMonths: pickNullable(formData.termMonths, formData.term_months, formData.ownership_months),
    monthlyIncome: pickNullable(formData.monthlyIncome, formData.monthly_income),
    monthlyDebt: pickNullable(formData.monthlyDebt, formData.existing_debt),
    riskTolerance: pickNullable(formData.riskTolerance, formData.risk_tolerance),
    totalCost12: pickNullable(totals.months12, costs.total),
    totalCost36: pickNullable(totals.months36),
    totalCost60: pickNullable(totals.months60),
    formData,
    topResult,
    decisionScore: intel.decisionScore ?? null,
    confidenceScore: intel.confidenceScore ?? null,
    reasons: topResult.reasons || [],
    risks: topResult.risks || [],
    alternatives: (input.alternatives || []).map((a) => ({
      name: a.vehicle?.name,
      title: a.vehicle?.name
    }))
  };
}

/**
 * Konut sonuç ekranı → Decision Engine V3 input.
 * @param {object} input
 * @param {object} [input.state]
 * @param {object} [input.metrics]
 * @param {object} [input.totalCost]
 * @param {object} [input.intel]
 * @param {Array} [input.alternatives]
 */
export function mapHousingToDecisionV3(input = {}) {
  const state = input.state || input.formData || {};
  const metrics = input.metrics || {};
  const totalCost = input.totalCost || {};
  const intel = input.intel || input.intelligence || {};
  const ownership = metrics.ownership || {};
  const riskPrefs = Array.isArray(state.riskPreferences) ? state.riskPreferences : [];

  const hasRentExpectation = riskPrefsInclude(riskPrefs, /kira getiri/i);
  const hasAppreciation = riskPrefsInclude(riskPrefs, /değer artış|deger artis/i);
  const hasLiquidityPref = riskPrefsInclude(riskPrefs, /likidite/i);

  const budget = pickNullable(state.totalBudget, ownership.homePrice);
  const firstYear = pickNullable(totalCost.firstYearTotal);
  const yearlyLoad = pickNullable(totalCost.yearlyLoad);

  return {
    vertical: 'housing',
    budget,
    city: pickNullable(state.city),
    district: pickNullable(state.district),
    propertyType: pickNullable(state.homeType),
    usagePurpose: pickNullable(state.purchasePurpose),
    financingUsage: pickNullable(state.useFinancing),
    downPayment: pickNullable(state.downPayment, ownership.downPayment, totalCost.downPayment),
    loanTerm: pickNullable(state.loanTermMonths, ownership.termMonths),
    monthlyIncome: pickNullable(state.monthlyIncome),
    earthquakeRisk: pickNullable(metrics.earthquakeRiskScore),
    liquidityNeed: pickNullable(metrics.liquidityRisk, hasLiquidityPref ? 'belirtilmiş' : null),
    maintenanceCost: pickNullable(
      totalCost.duesMonthly != null ? totalCost.duesMonthly * 12 : null,
      yearlyLoad
    ),
    expectedRent: pickNullable(
      state.expectedRent,
      hasRentExpectation ? metrics.investmentPotential : null
    ),
    appreciationExpectation: pickNullable(
      state.appreciationExpectation,
      hasAppreciation ? metrics.investmentPotential : null
    ),
    riskTolerance: pickNullable(
      state.riskTolerance,
      riskPrefs.length ? riskPrefs.join(', ') : null
    ),
    formData: state,
    metrics,
    totalCost12: firstYear ?? yearlyLoad,
    totalCost36: firstYear != null ? Math.round(firstYear * 2.8) : null,
    totalCost60: pickNullable(totalCost.realTotal, ownership.homePrice),
    termMonths: pickNullable(state.loanTermMonths, ownership.termMonths),
    monthlyDebt: pickNullable(state.existingDebt),
    squareMeters: pickNullable(state.squareMeters, state.square_meters),
    decisionScore: intel.decisionScore ?? null,
    confidenceScore: intel.confidenceScore ?? null,
    reasons: input.reasons || [],
    risks: input.risks || [],
    alternatives: input.alternatives || []
  };
}

/**
 * Finansman sonuç ekranı → Decision Engine V3 input.
 * @param {object} input
 * @param {object} [input.state]
 * @param {object} [input.totalCost]
 * @param {object} [input.intel]
 * @param {object} [input.primaryResult]
 * @param {Array} [input.alternatives]
 */
export function mapFinanceToDecisionV3(input = {}) {
  const state = input.state || input.formData || {};
  const totalCost = input.totalCost || {};
  const intel = input.intel || input.intelligence || {};
  const primary = input.primaryResult || null;

  const requestedAmount = pickNullable(
    state.amount_manual ? Number(state.amount_manual) : null,
    financeAmountMid(state),
    totalCost.principal,
    primary?.metrics?.principal
  );
  const loanTerm = pickNullable(financeTermMonths(state), totalCost.months);
  const installment = pickNullable(
    totalCost.monthlyPayment,
    primary?.metrics?.monthlyPayment
  );
  const interestRate = pickNullable(
    totalCost.effectiveAnnualRate,
    primary?.metrics?.effectiveAnnualRate
  );

  const yearlyRepayment = installment != null && loanTerm != null ? installment * loanTerm : null;

  return {
    vertical: 'finance',
    requestedAmount,
    monthlyIncome: pickNullable(state.monthly_income),
    existingDebt: pickNullable(state.existing_debt),
    loanTerm,
    interestRate,
    installment,
    purpose: pickNullable(state.purpose),
    riskTolerance: pickNullable(state.risk_tolerance),
    paymentDiscipline: pickNullable(state.early_payment),
    emergencyFund: pickNullable(financeCapacityMid(state), state.capacity_manual),
    incomeStability: pickNullable(state.income_type),
    formData: state,
    budget: requestedAmount,
    termMonths: loanTerm,
    monthlyDebt: pickNullable(state.existing_debt),
    totalCost12: pickNullable(totalCost.yearlyLoad, installment != null ? installment * 12 : null),
    totalCost36: yearlyRepayment,
    totalCost60: yearlyRepayment,
    decisionScore: intel.decisionScore ?? null,
    confidenceScore: intel.confidenceScore ?? null,
    reasons: input.reasons || [],
    risks: input.risks || [],
    alternatives: input.alternatives || []
  };
}

/**
 * Deneysel mount — mount noktası yoksa veya hata olursa sessizce geçer.
 * @param {HTMLElement|null} root
 * @param {object} mappedInput — mapper çıktısı
 */
export function tryMountDecisionEngineV3(root, mappedInput) {
  try {
    const mount = root?.querySelector('#ib-results-detail');
    if (!mount || !mappedInput) return;
    const decision = buildDecisionEngineV3(mappedInput);
    renderDecisionEngineV3(mount, decision);
  } catch {
    /* deneysel bölüm — ana akışı bozmamalı */
  }
}
