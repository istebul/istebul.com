/**
 * Kasko PDF Report V1 — buildPdfReportData üzerinden branded rapor payload.
 */
import { buildPdfReportData } from '../results/results-engine.js';
import {
  buildEngineResult,
  estimatePremiumBand,
  optionLabel,
  resolvePrimaryKaskoResult
} from './kasko-engine.js';
import { buildKaskoAiSummary } from './kasko-ai-summary.js';

function formatTryAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(n);
}

/**
 * @param {object} params
 * @param {object} params.state
 * @param {string} [params.planTier]
 * @param {object} [params.engine]
 * @param {object[]} [params.results]
 * @param {string} [params.selectedOption]
 */
export function buildKaskoPdfPayload({
  state = {},
  planTier = 'free',
  engine = null,
  results = [],
  selectedOption = ''
} = {}) {
  const intel = engine || buildEngineResult(state);
  const ai = buildKaskoAiSummary(intel, state);
  const primary = resolvePrimaryKaskoResult(results, selectedOption) || results[0];
  const premiumBand = primary?.metrics?.premiumBand ?? estimatePremiumBand(state);
  const yearlyPremium = formatTryAmount(premiumBand);

  return buildPdfReportData({
    category: 'kasko',
    planTier,
    purpose: optionLabel('coverage_level', state.coverage_level) || 'Kasko',
    decisionScore: intel.decisionScore,
    scoreLabel: intel.scoreLabel,
    confidenceScore: intel.confidenceScore,
    overallRisk: intel.overallRisk,
    totalCost: {
      isEstimate: true,
      estimateNote: 'Tahmini yıllık prim bandı — bağlayıcı teklif değildir.',
      yearlyPremium,
      coverageScore: intel.coverageScore,
      repairRiskScore: intel.repairRiskScore,
      premiumEfficiencyScore: intel.premiumEfficiencyScore
    },
    riskAnalysis: intel.riskAnalysis,
    strengths: intel.strengths,
    weaknesses: intel.weaknesses,
    alternatives: intel.alternatives,
    nextSteps: intel.nextSteps,
    executiveSummary: ai.summary,
    profile: {
      vehicleCategory: optionLabel('vehicle_category', state.vehicle_category),
      vehicleYear: optionLabel('vehicle_year_band', state.vehicle_year_band),
      licenseYears: optionLabel('license_years', state.license_years),
      usageType: optionLabel('usage_type', state.usage_type),
      coverageLevel: optionLabel('coverage_level', state.coverage_level),
      riskPerception: optionLabel('risk_perception', state.risk_perception),
      budgetLevel: optionLabel('budget_level', state.budget_level)
    },
    scoreFactors: [
      { label: 'Teminat skoru', value: intel.coverageScore, weight: '38%' },
      { label: 'Onarım riski', value: intel.repairRiskScore, weight: '32%' },
      { label: 'Prim verimliliği', value: intel.premiumEfficiencyScore, weight: '30%' }
    ],
    warnings: intel.weaknesses?.slice(0, 3) || [],
    recommendationLevel: intel.decisionScore >= 70 ? 'proceed' : 'review',
    metadata: { primaryPremium: yearlyPremium }
  });
}
