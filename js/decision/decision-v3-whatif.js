/**
 * Decision Engine V3 — deterministic what-if simulation helpers.
 */
import { buildDecisionIntelligenceResult } from '../features/results/decision-intelligence-engine.js';
import { clampScore } from '../features/results/results-engine.js';
import { mapDecisionSnapshot } from './decision-v3-mappers.js';

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cloneValue(value) {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { ...value };
  }
}

function normalizeCategory(category) {
  const value = String(category || 'konut').toLowerCase();
  if (value === 'finans' || value === 'finance') return 'finansman';
  if (value === 'housing' || value === 'real-estate') return 'konut';
  if (value === 'vehicle' || value === 'arac') return 'auto';
  return value;
}

function resolveTotalCost(intelligence, input = {}) {
  const fromExtras = input.extras?.totalCost ?? input.metrics?.totalCost;
  if (Number.isFinite(fromExtras)) return safeNumber(fromExtras);

  const context = intelligence.context || {};
  if (Number.isFinite(context.totalCost)) return safeNumber(context.totalCost);
  if (Number.isFinite(context.budget)) return safeNumber(context.budget);

  const snapshot = mapDecisionSnapshot(intelligence, {
    vertical: input.category,
    totalCost: fromExtras
  });
  return Number.isFinite(snapshot.totalCost) ? snapshot.totalCost : null;
}

function buildScoreSnapshot(intelligence, input = {}) {
  const mapped = mapDecisionSnapshot(intelligence, {
    vertical: input.category,
    totalCost: input.extras?.totalCost ?? input.metrics?.totalCost,
    riskScore: input.extras?.riskScore,
    decisionQualityScore: input.extras?.decisionQualityScore
  });

  return {
    decisionScore: mapped.decisionScore,
    confidenceScore: mapped.confidenceScore,
    riskScore: mapped.riskScore,
    totalCost: resolveTotalCost(intelligence, input)
  };
}

function applyRiskToleranceAdjustments(scores, riskTolerance) {
  const level = String(riskTolerance || 'orta').toLowerCase();
  const next = { ...scores };

  if (level === 'düşük' || level === 'dusuk' || level === 'low') {
    next.riskScore = clampScore(next.riskScore - 8);
    next.decisionScore = clampScore(next.decisionScore + 3);
    next.confidenceScore = clampScore(next.confidenceScore + 2);
  } else if (level === 'yüksek' || level === 'yuksek' || level === 'high') {
    next.riskScore = clampScore(next.riskScore + 10);
    next.decisionScore = clampScore(next.decisionScore - 4);
    next.confidenceScore = clampScore(next.confidenceScore - 2);
  }

  return next;
}

function applyWhatIfChange(formData, metrics, change = {}, input = {}) {
  const field = String(change.field || '').trim();
  const mode = String(change.mode || 'absolute');
  const value = change.value;

  if (!field) return;

  if (field === 'budget' || field === 'totalBudget') {
    const budgetKey =
      formData.totalBudget != null ? 'totalBudget'
      : formData.budget != null ? 'budget'
      : 'budget';
    const baseBudget =
      safeNumber(formData[budgetKey]) ||
      safeNumber(metrics.totalCost) ||
      safeNumber(input.extras?.totalCost) ||
      1_000_000;

    if (mode === 'percent') {
      formData[budgetKey] = Math.max(0, Math.round(baseBudget * (1 + safeNumber(value) / 100)));
    } else {
      formData[budgetKey] = Math.max(0, safeNumber(value) || baseBudget);
    }

    if (formData.totalBudget != null && budgetKey !== 'totalBudget') {
      formData.totalBudget = formData[budgetKey];
    }
    metrics.totalCost = formData[budgetKey];
    return;
  }

  if (field === 'downPayment' || field === 'down_payment' || field === 'pesinat') {
    const budgetBase =
      safeNumber(formData.budget) ||
      safeNumber(formData.totalBudget) ||
      safeNumber(metrics.totalCost) ||
      1_000_000;
    const pct = mode === 'percent' ? safeNumber(value) : safeNumber(value) / budgetBase * 100;
    const amount = Math.round(budgetBase * (pct / 100));
    formData.down_payment = amount;
    formData.downPayment = amount;
    formData.pesinat = amount;
    metrics.downPayment = amount;
    return;
  }

  if (field === 'termMonths' || field === 'term_months' || field === 'vade') {
    const months = Math.min(60, Math.max(12, Math.round(safeNumber(value) || 36)));
    formData.term_months = String(months);
    formData.termMonths = months;
    metrics.termMonths = months;
    return;
  }

  if (field === 'riskTolerance' || field === 'risk_tolerance') {
    formData.riskTolerance = String(value || 'orta');
  }
}

function buildWhatIfExplanation(before, after, delta, change = {}) {
  const field = String(change.field || '');
  const parts = [];

  if (delta.decisionScore > 2) {
    parts.push('Karar skoru yükseldi');
  } else if (delta.decisionScore < -2) {
    parts.push('Karar skoru düştü');
  } else {
    parts.push('Karar skoru stabil kaldı');
  }

  if (delta.riskScore > 2) {
    parts.push('risk baskısı arttı');
  } else if (delta.riskScore < -2) {
    parts.push('risk baskısı azaldı');
  }

  if (Number.isFinite(delta.totalCost) && delta.totalCost !== 0) {
    parts.push(
      delta.totalCost > 0
        ? `toplam maliyet yaklaşık ${Math.abs(Math.round(delta.totalCost)).toLocaleString('tr-TR')} ₺ arttı`
        : `toplam maliyet yaklaşık ${Math.abs(Math.round(delta.totalCost)).toLocaleString('tr-TR')} ₺ azaldı`
    );
  }

  if (field === 'riskTolerance') {
    parts.push(`risk toleransı ${String(change.value || 'orta')} bandına alındı`);
  }

  return `${parts.join('; ')}. (Önce: ${before.decisionScore} → Sonra: ${after.decisionScore})`;
}

function computeDelta(before, after) {
  const delta = {
    decisionScore: (after.decisionScore ?? 0) - (before.decisionScore ?? 0),
    confidenceScore: (after.confidenceScore ?? 0) - (before.confidenceScore ?? 0),
    riskScore: (after.riskScore ?? 0) - (before.riskScore ?? 0),
    totalCost: null
  };

  if (Number.isFinite(before.totalCost) && Number.isFinite(after.totalCost)) {
    delta.totalCost = after.totalCost - before.totalCost;
  }

  return delta;
}

/**
 * @param {object} input
 * @param {object} change
 */
export function simulateWhatIfChange(input = {}, change = {}) {
  try {
    if (!input || typeof input !== 'object') return null;
    if (!change || typeof change !== 'object' || !change.field) return null;

    const category = normalizeCategory(input.category);
    const baseFormData = cloneValue(input.formData) || {};
    const baseMetrics = cloneValue(input.metrics) || {};
    const baseExtras = cloneValue(input.extras) || {};

    const beforeIntel = buildDecisionIntelligenceResult(category, baseFormData, baseMetrics, baseExtras);
    const before = buildScoreSnapshot(beforeIntel, { ...input, category });

    const changedFormData = cloneValue(input.formData) || {};
    const changedMetrics = cloneValue(input.metrics) || {};
    const changedExtras = cloneValue(input.extras) || {};

    applyWhatIfChange(changedFormData, changedMetrics, change, input);

    const afterIntel = buildDecisionIntelligenceResult(
      category,
      changedFormData,
      changedMetrics,
      changedExtras
    );
    let after = buildScoreSnapshot(afterIntel, {
      ...input,
      category,
      formData: changedFormData,
      metrics: changedMetrics,
      extras: changedExtras
    });

    if (change.field === 'riskTolerance' || change.field === 'risk_tolerance') {
      after = applyRiskToleranceAdjustments(after, change.value);
    }

    if (change.field === 'budget' || change.field === 'totalBudget') {
      after.totalCost = safeNumber(changedMetrics.totalCost ?? changedFormData.budget ?? changedFormData.totalBudget);
    }

    if (change.field === 'termMonths' || change.field === 'term_months' || change.field === 'vade') {
      const months = safeNumber(changedMetrics.termMonths || changedFormData.termMonths || 36);
      if (Number.isFinite(before.totalCost)) {
        after.totalCost = Math.round(
          before.totalCost * (months / Math.max(12, safeNumber(baseMetrics.termMonths) || 36))
        );
      }
    }

    const delta = computeDelta(before, after);

    return {
      before,
      after,
      delta,
      explanation: buildWhatIfExplanation(before, after, delta, change)
    };
  } catch {
    return null;
  }
}

/**
 * @param {object} input
 * @param {object} controls
 */
export function simulateWhatIfControls(input = {}, controls = {}) {
  try {
    if (!input || typeof input !== 'object') return null;

    const category = normalizeCategory(input.category);
    const baseFormData = cloneValue(input.formData) || {};
    const baseMetrics = cloneValue(input.metrics) || {};
    const baseExtras = cloneValue(input.extras) || {};

    const beforeIntel = buildDecisionIntelligenceResult(category, baseFormData, baseMetrics, baseExtras);
    const before = buildScoreSnapshot(beforeIntel, { ...input, category });

    const changedFormData = cloneValue(input.formData) || {};
    const changedMetrics = cloneValue(input.metrics) || {};
    const changedExtras = cloneValue(input.extras) || {};

    applyWhatIfChange(
      changedFormData,
      changedMetrics,
      { field: 'budget', value: controls.budgetPercent ?? 0, mode: 'percent' },
      input
    );
    applyWhatIfChange(
      changedFormData,
      changedMetrics,
      { field: 'downPayment', value: controls.downPaymentPercent ?? 0, mode: 'percent' },
      input
    );
    applyWhatIfChange(
      changedFormData,
      changedMetrics,
      { field: 'termMonths', value: controls.termMonths ?? 36, mode: 'absolute' },
      input
    );
    applyWhatIfChange(
      changedFormData,
      changedMetrics,
      { field: 'riskTolerance', value: controls.riskTolerance ?? 'orta', mode: 'toggle' },
      input
    );

    const afterIntel = buildDecisionIntelligenceResult(
      category,
      changedFormData,
      changedMetrics,
      changedExtras
    );
    let after = buildScoreSnapshot(afterIntel, {
      ...input,
      category,
      formData: changedFormData,
      metrics: changedMetrics,
      extras: changedExtras
    });
    after = applyRiskToleranceAdjustments(after, controls.riskTolerance ?? 'orta');
    after.totalCost = safeNumber(changedMetrics.totalCost ?? changedFormData.budget ?? changedFormData.totalBudget);

    const delta = computeDelta(before, after);

    return {
      before,
      after,
      delta,
      explanation: buildWhatIfExplanation(before, after, delta, { field: 'combined' })
    };
  } catch {
    return null;
  }
}

export { resolveTotalCost };
