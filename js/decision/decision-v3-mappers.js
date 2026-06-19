/**
 * Decision Engine V3 mappers — intelligence output to storage/render models.
 */
import { clampScore } from '../features/results/results-engine.js';

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeVertical(category) {
  const value = String(category || 'unknown').toLowerCase();
  if (value === 'finans' || value === 'finance') return 'finansman';
  if (value === 'housing' || value === 'real-estate') return 'konut';
  if (value === 'vehicle' || value === 'arac') return 'auto';
  return value;
}

function deriveRiskScore(intelligence = {}, context = {}) {
  if (Number.isFinite(context.riskScore)) return clampScore(context.riskScore);
  const risks = intelligence.riskAnalysis || [];
  const high = risks.filter((item) => item.level === 'yüksek').length;
  const medium = risks.filter((item) => item.level === 'orta').length;
  return clampScore(28 + high * 18 + medium * 8);
}

function computeDecisionQualityScore(intelligence = {}, context = {}) {
  if (Number.isFinite(context.decisionQualityScore)) {
    return clampScore(context.decisionQualityScore);
  }

  const decisionScore = clampScore(intelligence.decisionScore || 0);
  const confidenceScore = clampScore(intelligence.confidenceScore || 0);
  const recommendationLevel = intelligence.recommendationLevel || 'wait';
  const recommendationBonus =
    recommendationLevel === 'proceed'
      ? 8
      : recommendationLevel === 'proceed_with_caution'
        ? 4
        : recommendationLevel === 'avoid'
          ? -10
          : 0;

  return clampScore(Math.round((decisionScore * 0.62 + confidenceScore * 0.38) + recommendationBonus));
}

/**
 * @param {object} intelligence
 * @param {object} [context]
 */
export function mapDecisionSnapshot(intelligence = {}, context = {}) {
  const vertical = normalizeVertical(context.vertical || intelligence.context?.category);
  const decisionScore = clampScore(intelligence.decisionScore || 0);
  const confidenceScore = clampScore(intelligence.confidenceScore || 0);

  return {
    createdAt: context.createdAt || new Date().toISOString(),
    vertical,
    decisionScore,
    confidenceScore,
    riskScore: deriveRiskScore(intelligence, context),
    decisionQualityScore: computeDecisionQualityScore(intelligence, context),
    totalCost: Number.isFinite(context.totalCost) ? safeNumber(context.totalCost) : null,
    badges: Array.isArray(context.badges) ? context.badges.slice(0, 8) : []
  };
}

/**
 * @param {object} intelligence
 * @param {object} [extras]
 */
export const DEFAULT_WHAT_IF_SCENARIOS = Object.freeze([
  {
    title: 'Bütçe +10%',
    description: 'Bütçeyi %10 artırdığınızda seçenekler genişleyebilir; toplam maliyet baskısı artabilir.'
  },
  {
    title: 'Peşinat +15%',
    description: 'Peşinat artışı aylık yükü azaltabilir; likidite ihtiyacı yükselir.'
  },
  {
    title: 'Vade 48 ay',
    description: 'Vade uzadıkça aylık ödeme düşer; toplam faiz maliyeti artabilir.'
  }
]);

export function mapDecisionToRenderModel(intelligence = {}, extras = {}) {
  return {
    vertical: normalizeVertical(extras.vertical || intelligence.context?.category),
    decisionScore: clampScore(intelligence.decisionScore || 0),
    confidenceScore: clampScore(intelligence.confidenceScore || 0),
    overallRisk: intelligence.overallRisk || 'Orta',
    scoreLabel: intelligence.scoreLabel || 'Orta',
    executiveSummary: intelligence.executiveSummary || '',
    nextSteps: Array.isArray(intelligence.nextSteps) ? intelligence.nextSteps.slice(0, 6) : [],
    scoreFactors: Array.isArray(intelligence.scoreFactors) ? intelligence.scoreFactors : [],
    riskAnalysis: Array.isArray(intelligence.riskAnalysis) ? intelligence.riskAnalysis : [],
    recommendationLabel: intelligence.recommendationLabel || 'Değerlendirme',
    warnings: Array.isArray(intelligence.warnings) ? intelligence.warnings : [],
    memory: extras.memory || null,
    title: extras.title || 'Karar Özeti',
    whatIfInput: extras.whatIfInput || null,
    whatIfScenarios: Array.isArray(extras.whatIfScenarios) ? extras.whatIfScenarios : DEFAULT_WHAT_IF_SCENARIOS
  };
}
