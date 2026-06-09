/**
 * Phase 3A — Decision Category Card ViewModel contract (shadow mode).
 * Adapters map existing engine outputs to this shape without recalculating scores.
 */

import { resolveRecommendationLevel } from '../results/decision-intelligence-engine.js';
import {
  buildDecisionInsight,
  buildInsightInputFromIntelligence
} from '../ai/ai-insight-engine.js';

/** @typedef {'araba'|'konut'|'tatil'|'finansman'|'sigorta'|'kasko'} DecisionCategoryId */

/** @typedef {'positive'|'neutral'|'caution'|'risk'} DecisionSignalTone */

/**
 * @typedef {object} DecisionCardSignal
 * @property {string} key
 * @property {string} label
 * @property {string} value
 * @property {DecisionSignalTone} [tone]
 */

/**
 * @typedef {object} DecisionCardAiExplanation
 * @property {string} summary
 * @property {string} why
 * @property {string} risk
 * @property {string} nextStep
 * @property {string} disclaimer
 * @property {'engine'|'llm'} source
 */

/**
 * @typedef {'select'|'compare'|'lead'|'external'} DecisionCardCtaAction
 */

/**
 * @typedef {object} DecisionCardCta
 * @property {{ label: string, action: DecisionCardCtaAction }} primary
 * @property {{ label: string, action: string }} [secondary]
 */

/**
 * @typedef {object} DecisionCategoryCardViewModel
 * @property {DecisionCategoryId} categoryId
 * @property {string} scenarioId
 * @property {string} title
 * @property {number} decisionScore
 * @property {'proceed'|'proceed_with_caution'|'wait'|'avoid'} recommendationLevel
 * @property {DecisionCardSignal[]} signals
 * @property {DecisionCardAiExplanation} aiExplanation
 * @property {string[]} pros
 * @property {string[]} cautions
 * @property {DecisionCardCta} cta
 * @property {object} _source
 */

/**
 * @typedef {object} DecisionCardAdapterInput
 * @property {object} [scenario]
 * @property {object} [engine]
 * @property {object} [state]
 * @property {object} [metrics]
 */

export const MAX_DECISION_CARD_SIGNALS = 4;

export const DECISION_CATEGORY_IDS = Object.freeze([
  'araba',
  'konut',
  'tatil',
  'finansman',
  'sigorta',
  'kasko'
]);

const DEFAULT_DISCLAIMER =
  'Tahminler bilgilendirme amaçlıdır; bağlayıcı teklif veya finansal tavsiye değildir.';

/**
 * Pass through engine scenario score without recomputation.
 * @param {object | null | undefined} scenario
 * @returns {number | null}
 */
export function passthroughDecisionScore(scenario) {
  const raw = scenario?.score ?? scenario?.decisionScore;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * @param {DecisionCardSignal[]} signals
 * @param {number} [max]
 * @returns {DecisionCardSignal[]}
 */
export function limitSignals(signals, max = MAX_DECISION_CARD_SIGNALS) {
  return (Array.isArray(signals) ? signals : []).slice(0, max);
}

/**
 * @param {number | null} score
 * @param {object[]} [riskAnalysis]
 * @returns {'proceed'|'proceed_with_caution'|'wait'|'avoid'}
 */
export function resolveCardRecommendationLevel(score, riskAnalysis = []) {
  const safeScore = Number.isFinite(Number(score)) ? Number(score) : 0;
  return resolveRecommendationLevel(safeScore, { riskAnalysis });
}

/**
 * @param {string[]} [items]
 * @param {number} [max]
 * @returns {string[]}
 */
export function normalizeStringList(items, max = 5) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, max);
}

/**
 * @param {object} scenario
 * @returns {DecisionCardAiExplanation}
 */
export function buildFallbackAiExplanation(scenario = {}) {
  const cautions = normalizeStringList(scenario.cautions, 2);
  return {
    summary: String(scenario.description || scenario.title || '').trim(),
    why: String(scenario.why || '').trim(),
    risk: cautions.join(' ') || 'Belirgin risk sinyali raporlanmadı.',
    nextStep: 'Seçeneği inceleyin ve karşılaştırma yapın.',
    disclaimer: DEFAULT_DISCLAIMER,
    source: 'engine'
  };
}

/**
 * Build AI explanation from existing engine + insight pipeline (no new scores).
 * @param {DecisionCategoryId} categoryId
 * @param {object} scenario
 * @param {object} [engine]
 * @param {object} [state]
 * @param {object} [metrics]
 * @returns {DecisionCardAiExplanation}
 */
export function buildCardAiExplanation(categoryId, scenario = {}, engine = {}, state = {}, metrics = {}) {
  if (!engine || typeof engine !== 'object' || !Object.keys(engine).length) {
    return buildFallbackAiExplanation(scenario);
  }

  const insightInput = buildInsightInputFromIntelligence(
    categoryId,
    { formData: state, ...metrics },
    {
      decisionScore: passthroughDecisionScore(scenario) ?? engine.decisionScore,
      confidenceScore: engine.confidenceScore,
      overallRisk: engine.overallRisk,
      scoreLabel: engine.scoreLabel || scenario.suitability,
      scoreFactors: engine.scoreFactors,
      riskAnalysis: engine.riskAnalysis
    },
    {
      costs: {
        premiumBand: scenario.metrics?.premiumBand,
        monthlyPayment: scenario.metrics?.monthlyPayment ?? metrics.monthlyPayment,
        totalBudget: metrics.totalCost ?? scenario.costs?.realTotal
      }
    }
  );

  const insight = buildDecisionInsight(insightInput);
  return {
    summary: insight.summary || buildFallbackAiExplanation(scenario).summary,
    why: insight.why || String(scenario.why || '').trim(),
    risk: insight.risk || buildFallbackAiExplanation(scenario).risk,
    nextStep: insight.nextStep || 'Teklif karşılaştırmasına geçin.',
    disclaimer: insight.disclaimer || DEFAULT_DISCLAIMER,
    source: insight.source === 'engine' ? 'engine' : 'engine'
  };
}

/**
 * @param {DecisionCategoryId} categoryId
 * @param {object} [source]
 * @returns {DecisionCategoryCardViewModel}
 */
export function createFallbackViewModel(categoryId, source = {}) {
  const score = passthroughDecisionScore(source) ?? 0;
  return {
    categoryId,
    scenarioId: String(source?.id || 'unknown'),
    title: String(source?.title || 'Senaryo'),
    decisionScore: score,
    recommendationLevel: resolveCardRecommendationLevel(score),
    signals: [],
    aiExplanation: buildFallbackAiExplanation(source),
    pros: normalizeStringList(source?.pros, 3),
    cautions: normalizeStringList(source?.cautions, 2),
    cta: {
      primary: { label: 'Bu seçeneği seç', action: 'select' }
    },
    _source: source
  };
}

/**
 * @param {DecisionCategoryId} categoryId
 * @param {DecisionCardAdapterInput} input
 * @param {object} fields
 * @returns {DecisionCategoryCardViewModel}
 */
export function assembleViewModel(categoryId, input = {}, fields = {}) {
  const scenario = input.scenario && typeof input.scenario === 'object' ? input.scenario : {};
  const score = passthroughDecisionScore(scenario);
  const decisionScore = score ?? 0;
  const riskAnalysis = input.engine?.riskAnalysis || fields.riskAnalysis || [];

  return {
    categoryId,
    scenarioId: String(scenario.id || fields.scenarioId || 'unknown'),
    title: String(scenario.title || fields.title || 'Senaryo'),
    decisionScore,
    recommendationLevel: fields.recommendationLevel || resolveCardRecommendationLevel(decisionScore, riskAnalysis),
    signals: limitSignals(fields.signals || []),
    aiExplanation: fields.aiExplanation || buildFallbackAiExplanation(scenario),
    pros: normalizeStringList(fields.pros ?? scenario.pros, 3),
    cautions: normalizeStringList(fields.cautions ?? scenario.cautions, 2),
    cta: fields.cta || {
      primary: { label: 'Bu seçeneği seç', action: 'select' }
    },
    _source: scenario
  };
}
