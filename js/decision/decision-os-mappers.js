/**
 * Decision OS v1 — intelligence / V2 payload → render model.
 */
import { clampScore } from '../features/results/results-engine.js';
import { mapDecisionSnapshot } from './decision-v3-mappers.js';

const VERDICT_MAP = Object.freeze({
  proceed: { label: 'AL', emoji: '🟢', color: '#16A34A', level: 'proceed' },
  proceed_with_caution: { label: 'BEKLE', emoji: '🟡', color: '#F59E0B', level: 'wait' },
  wait: { label: 'BEKLE', emoji: '🟡', color: '#F59E0B', level: 'wait' },
  avoid: { label: 'ALMA', emoji: '🔴', color: '#DC2626', level: 'avoid' }
});

const VERTICAL_LABELS = Object.freeze({
  auto: 'Araç',
  konut: 'Konut',
  finansman: 'Finansman',
  tatil: 'Tatil',
  sigorta: 'Sigorta',
  kasko: 'Kasko'
});

const ALT_BADGES = Object.freeze(['🥇 En uygun', '🥈 En ekonomik', '🥉 En güvenli']);

const CROSS_DECISION_HINTS = Object.freeze({
  auto: { from: 'Araç', to: 'Konut', message: 'Konut almanız daha avantajlı olabilir.' },
  konut: { from: 'Konut', to: 'Finansman', message: 'Önce finansman yapılandırması daha avantajlı olabilir.' },
  finansman: { from: 'Finansman', to: 'Konut', message: 'Konut yatırımı daha avantajlı olabilir.' },
  tatil: { from: 'Tatil', to: 'Finansman', message: 'Tasarruf için finansman planı daha avantajlı olabilir.' },
  sigorta: { from: 'Sigorta', to: 'Kasko', message: 'Kasko kapsamını gözden geçirmeniz avantajlı olabilir.' },
  kasko: { from: 'Kasko', to: 'Sigorta', message: 'Trafik sigortası optimizasyonu daha avantajlı olabilir.' }
});

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

/**
 * @param {string} recommendationLevel
 * @returns {{ label: string, emoji: string, color: string, level: string }}
 */
export function mapVerdict(recommendationLevel) {
  return VERDICT_MAP[recommendationLevel] || VERDICT_MAP.wait;
}

function buildWhyReasons(intelligence = {}, extras = {}) {
  const factors = Array.isArray(intelligence.scoreFactors) ? intelligence.scoreFactors : [];
  const strengths = Array.isArray(extras.strengths) ? extras.strengths : [];
  const fromFactors = factors
    .filter((f) => f?.reason)
    .slice(0, 3)
    .map((f) => f.reason);
  const fromStrengths = strengths.slice(0, 3);
  const merged = [...fromStrengths, ...fromFactors].filter(Boolean);
  if (merged.length) return merged.slice(0, 3);
  return [
    'Profiliniz mevcut piyasa koşullarıyla uyumlu görünüyor.',
    'Maliyet ve risk dengesi kabul edilebilir aralıkta.',
    'Veri kalitesi karar için yeterli seviyede.'
  ];
}

function buildRiskItems(intelligence = {}, extras = {}) {
  const risks = Array.isArray(intelligence.riskAnalysis) ? intelligence.riskAnalysis : [];
  const cautions = Array.isArray(extras.cautions) ? extras.cautions : [];
  const fromRisks = risks
    .slice(0, 3)
    .map((r) => r.detail || r.description || r.reason || r.title || r.label || r.key)
    .filter(Boolean);
  const fromCautions = cautions.slice(0, 2);
  const merged = [...fromRisks, ...fromCautions].filter(Boolean);
  if (merged.length) return merged.slice(0, 3);
  return ['Piyasa koşulları değişkenlik gösterebilir.', 'Kesin teklif değildir; bilgilendirme amaçlıdır.'];
}

function buildProfileCards(memory) {
  if (!memory || memory.version !== 'memory-lite-v1') {
    return [
      { icon: '💰', label: 'Tasarruf Odaklı' },
      { icon: '📈', label: 'Yatırımcı' },
      { icon: '🛡', label: 'Düşük Risk' },
      { icon: '🏡', label: 'Uzun Vadeli' }
    ];
  }

  const profile = memory.profile || {};
  const cards = [];

  if (safeNumber(profile.budgetDiscipline) >= 55) {
    cards.push({ icon: '💰', label: 'Tasarruf Odaklı' });
  }
  if (safeNumber(profile.investmentFocus) >= 55) {
    cards.push({ icon: '📈', label: 'Yatırımcı' });
  }
  if (safeNumber(profile.riskPreference) <= 45) {
    cards.push({ icon: '🛡', label: 'Düşük Risk' });
  } else if (safeNumber(profile.riskPreference) >= 60) {
    cards.push({ icon: '⚡', label: 'Yüksek Risk Toleransı' });
  }
  if (safeNumber(profile.comfortPriority) >= 55 || safeNumber(profile.financeSensitivity) >= 55) {
    cards.push({ icon: '🏡', label: 'Uzun Vadeli' });
  }

  if (!cards.length) {
    cards.push(
      { icon: '💰', label: 'Tasarruf Odaklı' },
      { icon: '📈', label: 'Yatırımcı' }
    );
  }

  return cards.slice(0, 4);
}

function buildProfileAiComment(memory, vertical) {
  const verticalLabel = VERTICAL_LABELS[vertical] || 'karar';
  if (!memory || memory.version !== 'memory-lite-v1') {
    return `Sistem geçmiş analizlerinize göre ${verticalLabel.toLowerCase()} kararlarında dengeli bir profil olduğunuzu düşünüyor.`;
  }
  const insights = Array.isArray(memory.insights) ? memory.insights : [];
  if (insights[0]) return insights[0];
  const trend = memory.trend?.explanation;
  if (trend) return trend;
  return `Sistem geçmiş analizlerinize göre yatırım odaklı olduğunuzu düşünüyor.`;
}

function estimateSavings(intelligence = {}, extras = {}) {
  const totalCost = safeNumber(extras.totalCost ?? extras.metrics?.totalCost);
  const decisionScore = clampScore(intelligence.decisionScore || 0);
  if (!totalCost) return { amount: null, years: 5, rate: 0.08 };

  const savingsRate = decisionScore >= 75 ? 0.12 : decisionScore >= 60 ? 0.08 : 0.05;
  const amount = Math.round(totalCost * savingsRate);
  return { amount, years: 5, rate: savingsRate };
}

function buildAlternatives(extras = {}) {
  const raw = Array.isArray(extras.alternatives) ? extras.alternatives : [];
  return raw.slice(0, 3).map((alt, index) => ({
    badge: ALT_BADGES[index] || `Alternatif ${index + 1}`,
    title: alt.title || alt.name || alt.vehicle?.name || alt.label || `Seçenek ${index + 1}`,
    score: clampScore(alt.score ?? alt.decisionScore ?? 0),
    summary: alt.summary || alt.text || alt.description || alt.pros?.[0] || ''
  }));
}

function buildAiCommentary(intelligence = {}, extras = {}) {
  const insight = extras.insight || {};
  const preferReasons = [];
  const waitReasons = [];

  if (Array.isArray(insight.bullets)) {
    insight.bullets.slice(0, 3).forEach((b) => preferReasons.push(b));
  }
  if (Array.isArray(extras.strengths)) {
    extras.strengths.slice(0, 2).forEach((s) => preferReasons.push(s));
  }
  if (Array.isArray(extras.cautions)) {
    extras.cautions.slice(0, 3).forEach((c) => waitReasons.push(c));
  }
  if (Array.isArray(intelligence.warnings)) {
    intelligence.warnings.slice(0, 2).forEach((w) => waitReasons.push(w));
  }

  if (!preferReasons.length) {
    preferReasons.push('Maliyet ve risk dengesi profilinize uygun.', 'Piyasa verileri kararı destekliyor.');
  }
  if (!waitReasons.length) {
    waitReasons.push('Piyasa koşulları değişebilir.', 'Alternatif senaryoları karşılaştırmak faydalı olabilir.');
  }

  return {
    preferLead: 'Ben olsam bu seçeneği tercih ederdim.',
    preferReasons: preferReasons.slice(0, 3),
    waitLead: 'Ancak şu durumda beklemek daha doğru olabilir:',
    waitReasons: waitReasons.slice(0, 3)
  };
}

function buildDataQuality(intelligence = {}, extras = {}) {
  const factorCount = (intelligence.scoreFactors || []).length;
  const riskCount = (intelligence.riskAnalysis || []).length;
  const confidence = clampScore(intelligence.confidenceScore || 0);
  const score = clampScore(Math.round(confidence * 0.5 + Math.min(factorCount, 6) * 6 + Math.min(riskCount, 4) * 4));

  return {
    score,
    label: score >= 75 ? 'Yüksek' : score >= 55 ? 'Orta' : 'Düşük',
    notes: [
      `${factorCount || 3} skor faktörü değerlendirildi`,
      `${riskCount || 2} risk kalemi analiz edildi`,
      extras.evdsAvailable ? 'EVDS piyasa verisi dahil' : 'Temel piyasa verileri kullanıldı'
    ]
  };
}

/**
 * @param {object} intelligence
 * @param {object} [context]
 */
export function buildDecisionOsModel(intelligence = {}, context = {}) {
  const vertical = normalizeVertical(context.vertical || intelligence.context?.category);
  const snapshot = mapDecisionSnapshot(intelligence, {
    vertical,
    totalCost: context.totalCost,
    riskScore: context.riskScore,
    decisionQualityScore: context.decisionQualityScore
  });

  const verdict = mapVerdict(intelligence.recommendationLevel);
  const confidenceScore = clampScore(intelligence.confidenceScore || 0);
  const decisionScore = clampScore(intelligence.decisionScore || 0);
  const savings = estimateSavings(intelligence, context);
  const crossDecision = CROSS_DECISION_HINTS[vertical] || CROSS_DECISION_HINTS.konut;

  const whatIfInput = context.whatIfInput || (context.formData
    ? {
        category: vertical,
        formData: context.formData,
        metrics: context.metrics || {},
        extras: {
          ...context.extras,
          totalCost: context.totalCost ?? context.metrics?.totalCost ?? null
        }
      }
    : null);

  return {
    vertical,
    verticalLabel: VERTICAL_LABELS[vertical] || vertical,
    title: context.title || `${VERTICAL_LABELS[vertical] || 'Karar'} Analizi`,
    verdict,
    decisionScore,
    confidenceScore,
    confidencePercent: confidenceScore,
    decisionQualityScore: snapshot.decisionQualityScore,
    riskScore: snapshot.riskScore,
    totalCost: snapshot.totalCost,
    overallRisk: intelligence.overallRisk || 'Orta',
    executiveSummary: intelligence.executiveSummary || context.executiveSummary || '',
    whyReasons: buildWhyReasons(intelligence, context),
    risks: buildRiskItems(intelligence, context),
    decisionQuality: {
      score: snapshot.decisionQualityScore,
      label: intelligence.scoreLabel || 'Orta',
      summary: intelligence.executiveSummary || ''
    },
    riskRadar: (intelligence.riskAnalysis || []).slice(0, 5),
    dataQuality: buildDataQuality(intelligence, context),
    actionPlan: Array.isArray(intelligence.nextSteps) ? intelligence.nextSteps.slice(0, 6) : [],
    scoreFactors: Array.isArray(intelligence.scoreFactors) ? intelligence.scoreFactors : [],
    whatIfInput,
    whatIfScenarios: context.whatIfScenarios,
    profile: {
      cards: buildProfileCards(context.memory),
      aiComment: buildProfileAiComment(context.memory, vertical)
    },
    savings,
    alternatives: buildAlternatives(context),
    aiCommentary: buildAiCommentary(intelligence, context),
    crossDecision,
    memory: context.memory || null,
    snapshot,
    reportContext: {
      intelligence,
      memory: context.memory,
      title: context.title
    }
  };
}

export {
  VERDICT_MAP,
  VERTICAL_LABELS,
  ALT_BADGES,
  CROSS_DECISION_HINTS,
  normalizeVertical
};
