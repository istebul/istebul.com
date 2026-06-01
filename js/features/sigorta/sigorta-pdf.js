/**
 * Sigorta PDF Report V1 — buildPdfReportData üzerinden branded rapor payload.
 */
import { buildPdfReportData } from '../results/results-engine.js';
import { buildEngineResult, optionLabel } from './sigorta-engine.js';
import { buildSigortaAiSummary } from './sigorta-ai-summary.js';

/**
 * @param {object} params
 * @param {object} params.state
 * @param {string} [params.planTier]
 * @param {object} [params.engine] — önceden hesaplanmış motor çıktısı
 */
export function buildSigortaPdfPayload({ state = {}, planTier = 'free', engine = null } = {}) {
  const intel = engine || buildEngineResult(state);
  const ai = buildSigortaAiSummary(intel, state);
  const primaryPremium = intel.alternatives?.[0]?.meta;

  return buildPdfReportData({
    category: 'sigorta',
    planTier,
    purpose: optionLabel('insurance_type', state.insurance_type),
    decisionScore: intel.decisionScore,
    scoreLabel: intel.scoreLabel,
    confidenceScore: intel.confidenceScore,
    overallRisk: intel.overallRisk,
    totalCost: {
      isEstimate: true,
      estimateNote: 'Tahmini yıllık prim bandı — bağlayıcı teklif değildir.',
      yearlyPremium: intel.alternatives?.[1]?.description,
      protectionScore: intel.protectionScore,
      coverageScore: intel.coverageScore,
      costEfficiencyScore: intel.costEfficiencyScore
    },
    riskAnalysis: intel.riskAnalysis,
    strengths: intel.strengths,
    weaknesses: intel.weaknesses,
    alternatives: intel.alternatives,
    nextSteps: intel.nextSteps,
    executiveSummary: ai.summary,
    profile: {
      insuranceType: optionLabel('insurance_type', state.insurance_type),
      age: state.age ? String(state.age) : '—',
      maritalStatus: optionLabel('marital_status', state.marital_status),
      children: optionLabel('children_count', state.children_count),
      riskPerception: optionLabel('risk_perception', state.risk_perception),
      budgetLevel: optionLabel('budget_level', state.budget_level)
    },
    scoreFactors: [
      { label: 'Koruma skoru', value: intel.protectionScore, weight: '35%' },
      { label: 'Teminat yeterliliği', value: intel.coverageScore, weight: '35%' },
      { label: 'Maliyet verimliliği', value: intel.costEfficiencyScore, weight: '30%' }
    ],
    warnings: intel.weaknesses?.slice(0, 3) || [],
    recommendationLevel: intel.decisionScore >= 70 ? 'proceed' : 'review',
    metadata: { primaryPremium }
  });
}
