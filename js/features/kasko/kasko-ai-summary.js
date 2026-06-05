import { optionLabel } from '../../kasko/kasko-config.js';
import {
  buildDecisionInsight,
  fetchInsightWithProxy,
  normalizeInsightInput
} from '../ai/ai-insight-engine.js';

export function buildKaskoAiSummary(engine = {}, state = {}) {
  const paragraphs = [
    `Kasko analizi tamamlandı. Karar skorunuz ${engine.decisionScore}/100 (${engine.scoreLabel}). Skor; teminat yeterliliği, onarım riski ve prim verimliliğinden türetilir.`,
    `Teminat: ${engine.coverageScore}/100 (${optionLabel('coverage_level', state.coverage_level)}). Onarım riski: ${engine.repairRiskScore}/100. Prim verimliliği: ${engine.premiumEfficiencyScore}/100.`,
    `Genel risk: ${engine.overallRisk}. ${(engine.strengths || []).slice(0, 2).join('; ') || '—'}`
  ];
  return {
    summary: paragraphs.join('\n\n'),
    paragraphs,
    bullets: (engine.nextSteps || []).slice(0, 4).map((s) => `Sonraki adım: ${s}`),
    source: 'deterministic'
  };
}

export async function fetchKaskoExecutiveSummary(engine = {}, state = {}, options = {}) {
  const deterministic = buildKaskoAiSummary(engine, state);
  const input = normalizeInsightInput({
    vertical: 'kasko',
    answers: state,
    decisionScore: engine.decisionScore,
    overallRisk: engine.overallRisk,
    scoreLabel: engine.scoreLabel,
    strengths: engine.strengths,
    weaknesses: engine.weaknesses,
    planTier: options.planTier || 'guest'
  });
  buildDecisionInsight(input);
  const result = await fetchInsightWithProxy(input, {
    executiveOnly: true,
    skipProxy: options.skipProxy,
    timeoutMs: options.timeoutMs || 6000
  });
  return {
    text: result.source === 'ai' ? result.text : deterministic.summary,
    insight: result.insight || null,
    source: result.source === 'ai' ? 'ai' : 'deterministic',
    bullets: deterministic.bullets
  };
}
