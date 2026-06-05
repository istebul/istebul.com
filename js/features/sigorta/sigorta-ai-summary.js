/**
 * Sigorta AI Executive Summary — deterministik motor + isteğe bağlı Groq açıklama.
 * Skorları veya risk seviyelerini değiştirmez.
 */
import { optionLabel } from './sigorta-engine.js';
import {
  buildDecisionInsight,
  fetchInsightWithProxy,
  normalizeInsightInput
} from '../ai/ai-insight-engine.js';

function formatScoreLine(label, value) {
  return `${label}: ${value}/100`;
}

/**
 * @param {object} engine — buildEngineResult çıktısı
 * @param {object} state — kullanıcı girdileri
 */
export function buildSigortaAiSummary(engine = {}, state = {}) {
  const typeLabel = optionLabel('insurance_type', state.insurance_type);
  const riskLabel = optionLabel('risk_perception', state.risk_perception);
  const budgetLabel = optionLabel('budget_level', state.budget_level);

  const paragraphs = [
    `${typeLabel || 'Sigorta'} analizi tamamlandı. Genel karar skorunuz ${engine.decisionScore}/100 (${engine.scoreLabel}). Bu skor; koruma, teminat yeterliliği ve maliyet verimliliği bileşenlerinin sabit ağırlıklarla birleştirilmesiyle üretilmiştir — yapay zekâ skoru yeniden hesaplamaz.`,
    `${formatScoreLine('Koruma skoru', engine.protectionScore)} risk algınız (${riskLabel}) ve hane yapınızla ilişkilidir. ${formatScoreLine('Teminat yeterliliği', engine.coverageScore)} seçilen ürün tipi ile bütçe (${budgetLabel}) uyumunu yansıtır. ${formatScoreLine('Maliyet verimliliği', engine.costEfficiencyScore)} prim–teminat dengesinin sürdürülebilirliğini özetler.`,
    `Genel risk seviyesi "${engine.overallRisk}" olarak modellenmiştir. Güçlü taraflar: ${(engine.strengths || []).slice(0, 2).join('; ') || '—'}. Dikkat: ${(engine.weaknesses || []).slice(0, 2).join('; ') || '—'}.`
  ];

  const bullets = [
    `Güven skoru (form doluluğu): ${engine.confidenceScore}/100`,
    ...(engine.nextSteps || []).slice(0, 4).map((s) => `Sonraki adım: ${s}`)
  ];

  return {
    summary: paragraphs.join('\n\n'),
    paragraphs,
    bullets,
    source: 'deterministic',
    scoresSnapshot: {
      decisionScore: engine.decisionScore,
      protectionScore: engine.protectionScore,
      coverageScore: engine.coverageScore,
      costEfficiencyScore: engine.costEfficiencyScore,
      overallRisk: engine.overallRisk
    }
  };
}

/**
 * Opsiyonel LLM açıklaması için bağlam — skorlar değiştirilemez olarak işaretlenir.
 */
/**
 * Groq ile yönetici özeti (skorlar sabit); başarısızlıkta deterministik metin.
 */
export async function fetchSigortaExecutiveSummary(engine = {}, state = {}, options = {}) {
  const deterministic = buildSigortaAiSummary(engine, state);
  const input = normalizeInsightInput({
    vertical: 'sigorta',
    category: 'sigorta',
    answers: state,
    decisionScore: engine.decisionScore,
    confidenceScore: engine.confidenceScore,
    overallRisk: engine.overallRisk,
    scoreLabel: engine.scoreLabel,
    risks: engine.riskAnalysis,
    strengths: engine.strengths,
    weaknesses: engine.weaknesses,
    planTier: options.planTier || 'guest'
  });
  buildDecisionInsight(input);

  const result = await fetchInsightWithProxy(
    input,
    {
      executiveOnly: true,
      skipProxy: options.skipProxy,
      timeoutMs: options.timeoutMs || 6000
    }
  );

  const text = result.source === 'ai' ? result.text : deterministic.summary;
  return {
    text,
    insight: result.insight || null,
    bullets: deterministic.bullets,
    paragraphs: deterministic.paragraphs,
    source: result.source === 'ai' ? 'ai' : 'deterministic',
    scoresSnapshot: deterministic.scoresSnapshot
  };
}

export function buildSigortaAiPromptContext(engine = {}, state = {}) {
  const commentary = buildSigortaAiSummary(engine, state);
  return {
    role: 'explainer_only',
    immutable_scores: commentary.scoresSnapshot,
    user_profile: {
      insurance_type: state.insurance_type,
      age: state.age,
      marital_status: state.marital_status,
      children_count: state.children_count,
      risk_perception: state.risk_perception,
      budget_level: state.budget_level
    },
    narrative_seed: commentary.summary,
    instruction:
      'Skorları veya risk seviyesini değiştirme. Yalnızca verilen deterministik sonuçları Türkçe ve anlaşılır şekilde açıkla.'
  };
}
