/**
 * Results V3 — ortak karar sonucu motoru (Auto, Konut, Tatil, Finansman).
 * Mevcut decision-intelligence-engine ve results-engine üzerine inşa edilir.
 */
import { clampScore, buildPdfReportData } from '../features/results/results-engine.js';
import {
  buildDecisionIntelligenceResult,
  buildExecutiveSummaryFallbackV3,
  buildRiskAnalysisV3
} from '../features/results/decision-intelligence-engine.js';

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCategory(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'araba') return 'auto';
  if (['auto', 'konut', 'tatil', 'finansman'].includes(c)) return c;
  return 'konut';
}

const COST_LABELS = {
  auto: { title: 'Toplam maliyet', horizon: '5 yıllık sahip olma maliyeti' },
  konut: { title: 'Toplam maliyet', horizon: '10 yıllık maliyet projeksiyonu' },
  tatil: { title: 'Toplam maliyet', horizon: 'Toplam seyahat maliyeti' },
  finansman: { title: 'Toplam geri ödeme', horizon: 'Toplam geri ödeme' }
};

/**
 * @param {Array<{level?: string}>} riskAnalysis
 * @returns {number} 0–100 (yüksek = daha fazla risk)
 */
export function computeRiskScore(riskAnalysis = []) {
  const risks = Array.isArray(riskAnalysis) ? riskAnalysis : [];
  if (!risks.length) return 28;
  const weights = { yüksek: 32, orta: 18, düşük: 8 };
  let sum = 0;
  for (const r of risks) {
    const level = String(r.level || 'orta').toLowerCase();
    sum += weights[level] || 14;
  }
  const high = risks.filter((r) => String(r.level).toLowerCase() === 'yüksek').length;
  const base = Math.min(96, 18 + sum + high * 6);
  return clampScore(base);
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} context
 * @param {number} decisionScore
 */
export function computeSuitabilityScore(category, context = {}, decisionScore = 0) {
  const cat = normalizeCategory(category);
  const score = clampScore(decisionScore);
  const riskScore = computeRiskScore(context.riskAnalysis);
  let fit = score * 0.55 + (100 - riskScore) * 0.25;

  if (cat === 'konut') {
    const dti = safeNumber(context.metrics?.dti ?? context.dti);
    if (dti > 0 && dti <= 40) fit += 8;
    if (dti > 45) fit -= 10;
  }
  if (cat === 'finansman') {
    const pti = safeNumber(context.paymentToIncome ?? context.metrics?.paymentToIncome);
    if (pti > 0 && pti <= 40) fit += 6;
    if (pti > 45) fit -= 12;
  }
  if (cat === 'auto') {
    const budgetFit = safeNumber(context.budgetFit ?? context.metrics?.budgetFit);
    if (budgetFit > 70) fit += 5;
  }
  if (cat === 'tatil') {
    const budgetFit = safeNumber(context.budgetFit ?? context.metrics?.budgetFit);
    if (budgetFit > 65) fit += 4;
  }

  return clampScore(Math.round(fit));
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} context
 */
export function buildExecutiveSummaryStructuredV3(category, context = {}) {
  const cat = normalizeCategory(category);
  const decisionScore = clampScore(context.decisionScore ?? 0);
  const confidenceScore = clampScore(context.confidenceScore ?? 0);
  const risks = context.riskAnalysis || buildRiskAnalysisV3(cat, context);
  const highRisks = risks.filter((r) => String(r.level).toLowerCase() === 'yüksek');
  const positives = (context.scoreFactors || []).filter((f) => String(f.impact).startsWith('+'));
  const negatives = (context.scoreFactors || []).filter((f) => String(f.impact).startsWith('-'));

  const templates = {
    auto: {
      overview: `Araç kararınız ${decisionScore}/100 karar skoru ve ${confidenceScore}/100 güven skoru ile modellenmiştir.`,
      strengths: positives.length
        ? positives.slice(0, 3).map((f) => `${f.label}: ${f.reason}`)
        : ['Kullanım profili ve bütçe verileri analize dahil edildi.', 'Toplam sahip olma maliyeti görünür kılındı.'],
      risks: highRisks.length
        ? highRisks.slice(0, 3).map((r) => `${r.title} — ${r.description}`)
        : risks.slice(0, 2).map((r) => `${r.title} (${r.level})`),
      recommendation:
        decisionScore >= 78
          ? 'Mevcut seçenek güçlü görünüyor; teklif ve ekspertiz doğrulaması sonrası ilerleyebilirsiniz.'
          : decisionScore >= 62
            ? 'Alternatif segment ve finansman senaryolarını karşılaştırarak ilerlemeniz önerilir.'
            : 'Bütçe veya segment revizyonu yapmadan bağlayıcı karar vermeyin.'
    },
    konut: {
      overview: `Konut kararınız ${decisionScore}/100 karar skoru ile değerlendirilmiştir; güven ${confidenceScore}/100.`,
      strengths: positives.length
        ? positives.slice(0, 3).map((f) => `${f.label}: ${f.reason}`)
        : ['Lokasyon ve ödeme konforu hesaba katıldı.', '10 yıllık maliyet projeksiyonu oluşturuldu.'],
      risks: highRisks.length
        ? highRisks.slice(0, 3).map((r) => `${r.title} — ${r.description}`)
        : ['Kredi yükü ve likidite senaryolarını doğrulayın.'],
      recommendation:
        decisionScore >= 78
          ? 'Ödeme planı ve bölge emsalleri uyumluysa teklif aşamasına geçebilirsiniz.'
          : 'Peşinat veya bölge alternatiflerini tablolaştırın.'
    },
    tatil: {
      overview: `Tatil planınız ${decisionScore}/100 karar skoru ile özetlenmiştir (güven ${confidenceScore}/100).`,
      strengths: positives.length
        ? positives.slice(0, 3).map((f) => `${f.label}: ${f.reason}`)
        : ['Bütçe ve sezon etkisi modellendi.', 'Toplam seyahat maliyeti tek görünümde.'],
      risks: highRisks.length
        ? highRisks.map((r) => `${r.title} — ${r.description}`)
        : ['İptal koşulları ve sezon yoğunluğunu kontrol edin.'],
      recommendation:
        decisionScore >= 70
          ? 'Rezervasyon öncesi tarih esnekliği ve iptal politikasını doğrulayın.'
          : 'Alternatif tarih veya destinasyon senaryosu oluşturun.'
    },
    finansman: {
      overview: `Finansman profiliniz ${decisionScore}/100 karar skoru ve ${confidenceScore}/100 güven ile özetlenmiştir.`,
      strengths: positives.length
        ? positives.slice(0, 3).map((f) => `${f.label}: ${f.reason}`)
        : ['Ödeme/gelir oranı ve vade etkisi hesaplandı.', 'Toplam geri ödeme görünür.'],
      risks: highRisks.length
        ? highRisks.map((r) => `${r.title} — ${r.description}`)
        : ['Birden fazla banka teklifini EYM ile karşılaştırın.'],
      recommendation:
        decisionScore >= 75
          ? 'Seçilen plan nakit akışınıza uygun görünüyor; sözleşme kalemlerini doğrulayın.'
          : 'Vade veya tutar revizyonu ile alternatif planları test edin.'
    }
  };

  const t = templates[cat] || templates.konut;
  const narrative = buildExecutiveSummaryFallbackV3(cat, { ...context, decisionScore, confidenceScore, riskAnalysis: risks });

  return {
    overview: t.overview,
    strengths: t.strengths.filter(Boolean).slice(0, 4),
    risks: (t.risks || []).filter(Boolean).slice(0, 4),
    recommendation: t.recommendation,
    narrative
  };
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} opts
 * @param {number} [opts.baseAmount]
 * @param {number} [opts.decisionScore]
 */
export function buildScenarioAnalysisV3(category, opts = {}) {
  const cat = normalizeCategory(category);
  const base = Math.max(safeNumber(opts.baseAmount), 1);
  const score = clampScore(opts.decisionScore ?? 70);

  const costFactors = { optimistic: 0.9, expected: 1, pessimistic: 1.14 };
  if (cat === 'finansman') {
    costFactors.optimistic = 0.94;
    costFactors.pessimistic = 1.1;
  }
  if (cat === 'tatil') {
    costFactors.optimistic = 0.88;
    costFactors.pessimistic = 1.18;
  }

  return [
    {
      id: 'optimistic',
      label: 'İyimser',
      decisionScore: clampScore(score + 7),
      totalCost: Math.round(base * costFactors.optimistic),
      summary: 'Maliyet baskısı düşük, riskler sınırlı senaryo.'
    },
    {
      id: 'expected',
      label: 'Beklenen',
      decisionScore: score,
      totalCost: Math.round(base),
      summary: 'Mevcut girdilerle temel senaryo.'
    },
    {
      id: 'pessimistic',
      label: 'Kötümser',
      decisionScore: clampScore(score - 9),
      totalCost: Math.round(base * costFactors.pessimistic),
      summary: 'Maliyet ve risk baskısının arttığı senaryo.'
    }
  ];
}

/**
 * @param {'auto'|'konut'|'tatil'|'finansman'} category
 * @param {object} costInput
 */
export function buildTotalCostViewV3(category, costInput = {}) {
  const cat = normalizeCategory(category);
  const labels = COST_LABELS[cat];
  const amount =
    safeNumber(costInput.amount) ||
    safeNumber(costInput.total) ||
    safeNumber(costInput.tco12Months) ||
    safeNumber(costInput.tenYearTotal) ||
    safeNumber(costInput.tripTotal) ||
    safeNumber(costInput.totalRepayment);

  return {
    category: cat,
    title: labels.title,
    horizon: labels.horizon,
    amount,
    formatted: costInput.formatted || (amount > 0 ? null : '—'),
    isEstimate: costInput.isEstimate !== false,
    note: costInput.note || 'Bilgilendirme amaçlı tahmin; bağlayıcı teklif değildir.'
  };
}

/**
 * @param {object} alt
 */
function buildAlternativeRationale(alt = {}, index = 0) {
  const title = String(alt.title || `Alternatif ${index + 1}`).trim();
  const desc = String(alt.description || alt.reason || '').trim();
  const meta = String(alt.meta || '').trim();
  if (desc) return desc;
  if (meta) return `${title} için: ${meta}`;
  return `${title} profilinize göre değerlendirilebilir bir seçenektir.`;
}

/**
 * Ana V3 payload üretici.
 * @param {object} input
 */
export function buildResultsV3Payload(input = {}) {
  const category = normalizeCategory(input.category);
  const formData = input.formData || {};
  const metrics = input.metrics || {};
  const extras = input.extras || {};

  const intelligence =
    input.intelligence ||
    buildDecisionIntelligenceResult(category, formData, metrics, extras);

  const riskAnalysis = input.riskAnalysis || intelligence.riskAnalysis || [];
  const decisionScore = clampScore(input.decisionScore ?? intelligence.decisionScore);
  const confidenceScore = clampScore(input.confidenceScore ?? intelligence.confidenceScore);
  const context = {
    ...intelligence.context,
    decisionScore,
    confidenceScore,
    riskAnalysis,
    scoreFactors: intelligence.scoreFactors
  };

  const riskScore = computeRiskScore(riskAnalysis);
  const suitabilityScore = computeSuitabilityScore(category, context, decisionScore);
  const executiveSummary = buildExecutiveSummaryStructuredV3(category, context);
  const totalCost = buildTotalCostViewV3(category, input.totalCost || {});

  const rawAlts = input.alternatives || intelligence.alternatives || [];
  const alternatives = rawAlts.slice(0, 3).map((alt, i) => ({
    title: alt.title || `Alternatif ${i + 1}`,
    description: alt.description || alt.reason || '',
    meta: alt.meta || '',
    rationale: buildAlternativeRationale(alt, i)
  }));

  const scenarios = buildScenarioAnalysisV3(category, {
    baseAmount: totalCost.amount || safeNumber(input.scenarioBaseAmount),
    decisionScore
  });

  const nextSteps = input.nextSteps?.length ? input.nextSteps : intelligence.nextSteps || [];

  return {
    category,
    scores: {
      decision: decisionScore,
      confidence: confidenceScore,
      risk: riskScore,
      suitability: suitabilityScore
    },
    scoreLabel: intelligence.scoreLabel,
    recommendationLevel: intelligence.recommendationLevel,
    recommendationLabel: intelligence.recommendationLabel,
    overallRisk: intelligence.overallRisk,
    riskAnalysis,
    executiveSummary,
    totalCost,
    alternatives,
    scenarios,
    nextSteps: nextSteps.slice(0, 6),
    scoreFactors: intelligence.scoreFactors || [],
    warnings: intelligence.warnings || []
  };
}

/**
 * PDF payload'a V3 alanlarını ekler (mevcut PDF akışını bozmaz).
 * @param {object} basePdf
 * @param {object} v3
 */
export function extendPdfReportDataV3(basePdf = {}, v3 = {}) {
  const merged = buildPdfReportData({
    ...basePdf,
    decisionScore: v3.scores?.decision ?? basePdf.decisionScore,
    confidenceScore: v3.scores?.confidence ?? basePdf.confidenceScore,
    executiveSummary:
      v3.executiveSummary?.narrative || basePdf.executiveSummary || '',
    nextSteps: v3.nextSteps?.length ? v3.nextSteps : basePdf.nextSteps,
    alternatives: v3.alternatives?.length ? v3.alternatives : basePdf.alternatives,
    riskAnalysis: v3.riskAnalysis?.length ? v3.riskAnalysis : basePdf.riskAnalysis
  });

  return {
    ...merged,
    resultsV3: {
      scores: v3.scores,
      suitabilityScore: v3.scores?.suitability,
      riskScore: v3.scores?.risk,
      executiveSummaryStructured: v3.executiveSummary,
      scenarios: v3.scenarios,
      totalCostHorizon: v3.totalCost?.horizon
    }
  };
}
