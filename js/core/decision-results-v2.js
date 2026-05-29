/**
 * Decision Results V2 — ortak sonuç modeli, adapter'lar ve executive summary.
 */
import { escapeHtml } from './security.js';
import { computeHousingDecisionV2 } from './housing-decision-engine-v2.js';
import {
  computeFinanceWizardV2,
  computeFinansVerticalV2
} from './finance-decision-engine-v2.js';

export { escapeHtml };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function riskFromScore(score) {
  const s = Number(score) || 50;
  if (s < 38) return 'Düşük';
  if (s < 62) return 'Orta';
  return 'Yüksek';
}

function formatTryAmount(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

/**
 * @typedef {object} DecisionResultV2
 * @property {string} category
 * @property {string} categoryLabel
 * @property {number} decisionScore
 * @property {number} confidenceScore
 * @property {string} riskLevel
 * @property {{ label: string, value: string, hint?: string }} totalCost
 * @property {string[]} strengths
 * @property {string[]} weaknesses
 * @property {Array<{ title: string, description?: string, meta?: string }>} alternatives
 * @property {string} executiveSummary
 * @property {string[]} nextSteps
 * @property {Array<{ label: string, value: number, max?: number }>} [subScores]
 * @property {string[]} [notices]
 * @property {string} [summarySource]
 */

export function trackDecisionV2Event(eventName, { category = 'vertical', metadata = {}, trackFn } = {}) {
  try {
    if (typeof trackFn === 'function') {
      trackFn(eventName, { category, ...metadata });
      return;
    }
    window.dispatchEvent(
      new CustomEvent('ib:decision-v2', {
        detail: { eventName, category, metadata }
      })
    );
  } catch {
    /* kullanıcı akışını etkileme */
  }
}

function buildRuleExecutiveSummary(category, ctx) {
  const risk = ctx.riskLevel || 'Orta';
  const score = ctx.decisionScore ?? '—';
  const cost = ctx.totalCostValue || 'tahmini maliyet profiliniz';

  if (category === 'auto') {
    const vehicle = ctx.vehicleName || 'önerilen model';
    const tone = Number(score) >= 80 ? 'mantıklı' : Number(score) >= 65 ? 'dengeli ancak dikkat gerektiren' : 'riskli';
    return [
      `${vehicle} için oluşturulan analiz, bütçe ve kullanım profilinize göre ${score}/100 karar skoru üretiyor; bu ${tone} bir eşleşme olarak değerlendiriliyor.`,
      `12 aylık işletme ve finansman yükü ${cost} bandında özetleniyor; risk seviyesi ${risk} olarak işaretlendi.`,
      ctx.strengths?.[0]
        ? `Güçlü yön: ${ctx.strengths[0]}.`
        : 'Toplam sahip olma maliyeti ve segment uyumu öne çıkan kriterler.',
      ctx.weaknesses?.[0]
        ? `Dikkat: ${ctx.weaknesses[0]}.`
        : 'Nihai karar öncesi ekspertiz, sigorta ve finansman tekliflerini karşılaştırmanız önerilir.',
      'Bu çıktı bilgilendirme amaçlıdır; bağlayıcı teklif veya kredi onayı yerine geçmez.'
    ].join(' ');
  }

  if (category === 'konut') {
    const loc = ctx.locationLabel || 'seçilen bölge';
    const tone = Number(score) >= 75 ? 'mantıklı' : Number(score) >= 58 ? 'koşullu olarak uygun' : 'yüksek riskli';
    return [
      `${loc} için konut kararınız ${score}/100 nihai skorla ${tone} görünüyor; risk seviyesi ${risk}.`,
      `Toplam sahip olma maliyeti ${cost} çevresinde tahmin ediliyor${ctx.costHint ? ` (${ctx.costHint})` : ''}.`,
      ctx.housingV2
        ? `Bölge puanı ${ctx.housingV2.regionScore}/100, deprem riski ${ctx.housingV2.earthquakeRisk}/100 ve ulaşım ${ctx.housingV2.transportScore}/100 ile modellendi.`
        : 'Lokasyon, finansman yükü ve yaşam kalitesi birlikte değerlendirildi.',
      ctx.weaknesses?.[0] || 'Tapu, ekspertiz ve zemin raporu için resmi kontroller şart.',
      'Peşinat ve vade senaryolarını alternatiflerle kıyaslayarak ilerlemeniz önerilir.'
    ].join(' ');
  }

  if (category === 'tatil') {
    const dest = ctx.destination || 'önerilen destinasyon';
    return [
      `${dest} tatil senaryonuz ${score}/100 uyum skoru ve ${risk} sezon/maliyet riski ile öne çıkıyor.`,
      `Tahmini toplam maliyet ${cost}; bu aralık kampanya ve tarihe göre değişebilir.`,
      ctx.strengths?.[0] ? `Avantaj: ${ctx.strengths[0]}.` : 'Profil ve bütçe bandınızla uyumlu bir denge sunuyor.',
      ctx.weaknesses?.[0] ? `Dikkat: ${ctx.weaknesses[0]}.` : 'Rezervasyon öncesi iptal koşulları ve gizli giderleri kontrol edin.',
      'Alternatif destinasyonları aynı bütçe bandında karşılaştırmanız kararı güçlendirir.'
    ].join(' ');
  }

  if (category === 'finans' || category === 'finansman') {
    const tone = Number(score) >= 72 ? 'mantıklı' : Number(score) >= 55 ? 'dikkatli planlama gerektiren' : 'riskli';
    return [
      `Finansman profiliniz ${score}/100 karar skoru ile ${tone} bir borçlanma dengesi gösteriyor; risk ${risk}.`,
      `Tahmini aylık ödeme ${ctx.monthlyPaymentLabel || '—'}, toplam geri ödeme ${cost}.`,
      ctx.gapMessage || 'Gelir, vade ve tutar girdileri modele yansıtıldı.',
      ctx.weaknesses?.[0] ? `Önemli uyarı: ${ctx.weaknesses[0]}.` : 'Borç/gelir oranı banka onayında belirleyici olacaktır.',
      'En az iki kurumdan karşılaştırmalı teklif alarak faiz ve erken ödeme koşullarını doğrulayın.'
    ].join(' ');
  }

  return `Karar skorunuz ${score}/100; risk ${risk}. ${cost} özetleniyor. Profilinize göre alternatif senaryoları değerlendirin.`;
}

export async function resolveExecutiveSummary(category, ctx, aiText) {
  const trimmed = String(aiText || '').trim();
  if (trimmed.length >= 80) {
    return { text: trimmed.slice(0, 680), source: 'ai' };
  }

  const prompt = [
    'Turkce profesyonel finans/karar danismani olarak 4-6 cumle yaz.',
    'Kesin tavsiye verme; tahmini analiz dili kullan.',
    `Kategori: ${category}`,
    `Karar skoru: ${ctx.decisionScore}/100`,
    `Risk: ${ctx.riskLevel}`,
    `Maliyet: ${ctx.totalCostValue}`,
    `Guclu: ${(ctx.strengths || []).slice(0, 2).join('; ')}`,
    `Dikkat: ${(ctx.weaknesses || []).slice(0, 2).join('; ')}`
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context: { category: `decision-v2-${category}` } }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return { text: buildRuleExecutiveSummary(category, ctx), source: 'rules' };
    }
    const data = await response.json().catch(() => ({}));
    const text = String(data?.text || data?.output || '').trim();
    if (text.length >= 60) return { text: text.slice(0, 680), source: 'ai' };
    return { text: buildRuleExecutiveSummary(category, ctx), source: 'rules' };
  } catch {
    clearTimeout(timeout);
    return { text: buildRuleExecutiveSummary(category, ctx), source: 'rules' };
  }
}

export function autoResultAdapter({ topResult, formData, results = [] }) {
  const score = Number(topResult?.score) || 0;
  const confidenceMeta = topResult?.confidenceMeta || {};
  const confidence = clamp(
    Number(confidenceMeta.score ?? confidenceMeta.percent ?? score * 0.92) || 72,
    35,
    98
  );
  const monthly = Math.round((Number(topResult?.costs?.total || 0) / 12) / 100) * 100;
  const total12 =
    topResult?.costs?.ownership?.totals?.months12 || topResult?.costs?.total || 0;

  const strengths = (topResult?.reasons || []).slice(0, 4);
  const weaknesses = (topResult?.risks || []).slice(0, 4);
  const alternatives = (results || [])
    .slice(1, 4)
    .map((r, i) => ({
      title: r.name || `Alternatif ${i + 1}`,
      description: (r.reasons || [])[0] || r.description || '',
      meta: `${r.score}/100`
    }));

  const riskScore =
    weaknesses.length >= 3 ? 65 : weaknesses.length >= 1 ? 48 : 32;

  return {
    category: 'auto',
    categoryLabel: 'Araç',
    decisionScore: score,
    confidenceScore: confidence,
    riskLevel: riskFromScore(riskScore),
    totalCost: {
      label: '12 ay TCO (tahmini)',
      value: total12 ? formatTryAmount(total12) : '—',
      hint: monthly ? `Aylık ~${formatTryAmount(monthly)} etki` : ''
    },
    strengths: strengths.length ? strengths : ['Profilinize uygun segment eşleşmesi'],
    weaknesses: weaknesses.length ? weaknesses : ['Kesin fiyat taahhüdü değildir'],
    alternatives,
    executiveSummary: '',
    nextSteps: [
      'Önerilen model için finansman ve sigorta tekliflerini karşılaştırın.',
      'Ekspertiz ve garanti koşullarını doğrulayın.',
      'Alternatif modelleri TCO skorlarıyla yan yana değerlendirin.'
    ],
    subScores: [
      { label: 'Uyum skoru', value: score },
      { label: 'Güven', value: confidence }
    ],
    _summaryCtx: {
      vehicleName: topResult?.name,
      decisionScore: score,
      riskLevel: riskFromScore(riskScore),
      totalCostValue: total12 ? formatTryAmount(total12) : 'tahmini',
      strengths,
      weaknesses,
      formData
    }
  };
}

export function housingResultAdapter({
  state,
  metrics,
  ai,
  scenarios = [],
  attention = [],
  nextStep = ''
}) {
  const housingV2 = computeHousingDecisionV2(state, metrics);
  const score = housingV2.finalHousingScore;
  const confidence = Math.round((housingV2.confidenceScore + (metrics?.score ? 8 : 0)) / 1.08);

  const strengths = [
    `Bölge puanı ${housingV2.regionScore}/100`,
    `Ulaşım puanı ${housingV2.transportScore}/100`,
    `Yaşam kalitesi ${housingV2.lifeQuality}/100`,
    `Yatırım puanı ${housingV2.investmentScore}/100`
  ];
  const weaknesses = [...attention, ...housingV2.dataGaps].filter(Boolean).slice(0, 5);

  const alternatives = scenarios.slice(0, 4).map((s) => ({
    title: s.title,
    description: `${s.monthlyEffect || ''} · ${s.riskEffect || ''}`.trim(),
    meta: s.score ? `${s.score}/100` : ''
  }));

  const formatTry = metrics?.ownership?.realTotal
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
        metrics.ownership.realTotal
      )
    : '—';

  return {
    category: 'konut',
    categoryLabel: 'Konut',
    decisionScore: score,
    confidenceScore: clamp(confidence, 32, 98),
    riskLevel: metrics?.risk?.label || riskFromScore(housingV2.earthquakeRisk),
    totalCost: {
      label: 'Toplam sahip olma (tahmini)',
      value: formatTry,
      hint: metrics?.ownership?.monthlyPayment
        ? `Aylık ~${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(metrics.ownership.monthlyPayment)}`
        : ''
    },
    strengths,
    weaknesses: weaknesses.length ? weaknesses : ['Resmi tapu ve ekspertiz kontrolü gerekir'],
    alternatives,
    executiveSummary: ai?.text || '',
    nextSteps: nextStep
      ? [nextStep]
      : ['Ekspertiz randevusu planlayın.', 'Peşinat senaryosunu güncelleyin.'],
    subScores: [
      { label: 'Bölge', value: housingV2.regionScore },
      { label: 'Deprem riski', value: housingV2.earthquakeRisk },
      { label: 'Ulaşım', value: housingV2.transportScore },
      { label: 'Yaşam kalitesi', value: housingV2.lifeQuality },
      { label: 'Aidat etkisi', value: housingV2.duesImpact },
      { label: 'Kira potansiyeli', value: housingV2.rentPotential },
      { label: 'Yatırım', value: housingV2.investmentScore },
      { label: 'Nihai skor', value: score }
    ],
    notices: housingV2.dataGaps,
    _summaryCtx: {
      locationLabel: state?.city ? `${state.city}${state.district ? ` / ${state.district}` : ''}` : 'Bölge',
      decisionScore: score,
      riskLevel: metrics?.risk?.label,
      totalCostValue: formatTry,
      costHint: '',
      housingV2,
      strengths,
      weaknesses
    }
  };
}

export function travelResultAdapter({ state, results = [], summary = {}, commentary = {}, primary }) {
  const top = primary || results[0];
  const score = Number(summary.fitScore ?? top?.score) || 0;
  const confidence = clamp(
    70 +
      (state?.budget_range ? 8 : 0) +
      (state?.vacation_goal ? 6 : 0) +
      (results.length >= 2 ? 4 : 0),
    40,
    96
  );

  const strengths = (top?.pros || summary.advantages || []).slice(0, 4);
  const weaknesses = (top?.cautions || summary.cautions || []).slice(0, 4);
  const alternatives = (top?.alternatives || results.slice(1, 3)).map((alt) => ({
    title: alt.title || alt.name || 'Alternatif',
    description: alt.reason || alt.description || alt.delta || '',
    meta: alt.score ? `${alt.score}/100` : alt.cost || ''
  }));

  const riskLabel = summary.seasonRisk || top?.scores?.risk || 'Orta';

  return {
    category: 'tatil',
    categoryLabel: 'Tatil',
    decisionScore: score,
    confidenceScore: confidence,
    riskLevel: String(riskLabel).includes('Yüksek')
      ? 'Yüksek'
      : String(riskLabel).includes('Düşük')
        ? 'Düşük'
        : 'Orta',
    totalCost: {
      label: 'Tahmini toplam maliyet',
      value: summary.totalCostLabel || top?.estimatedCost || '—',
      hint: summary.totalCostHint || ''
    },
    strengths: strengths.length ? strengths : ['Bütçe bandınıza uygun senaryo'],
    weaknesses: weaknesses.length ? weaknesses : ['Kesin fiyat taahhüdü değildir'],
    alternatives,
    executiveSummary: commentary.summary || '',
    nextSteps: summary.nextStep
      ? [summary.nextStep]
      : ['Bir destinasyon seçin.', 'Sezon yoğunluğunu kontrol edin.'],
    _summaryCtx: {
      destination: top?.title || summary.topTitle,
      decisionScore: score,
      riskLevel: riskLabel,
      totalCostValue: summary.totalCostLabel,
      strengths,
      weaknesses
    }
  };
}

export function financeResultAdapter(input) {
  if (input?.state?.loanAmount != null || input?.metrics?.principal != null) {
    return financeWizardResultAdapter(input);
  }
  return financeVerticalResultAdapter(input);
}

function financeWizardResultAdapter({ state, metrics, ai, scenarios = [] }) {
  const v2 = computeFinanceWizardV2(state, metrics);
  const formatTry = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
      Number(n) || 0
    );

  const strengths = [
    `Ödeme konforu ${metrics.paymentComfort}/100`,
    `Nakit akışı uyumu ${metrics.cashFlowFit}/100`,
    `Bütçe uyumu ${v2.budgetFit}/100`
  ];
  const weaknesses = [];
  if (v2.gapMessage) weaknesses.push(v2.gapMessage);
  if (metrics.dti > 40) weaknesses.push(`Borç/gelir oranı %${Math.round(metrics.dti)} — yüksek baskı`);
  if (!weaknesses.length) weaknesses.push('Faiz oranı kampanyaya göre değişir');

  return {
    category: 'finansman',
    categoryLabel: 'Finansman',
    decisionScore: v2.financeDecisionScore,
    confidenceScore: v2.confidenceScore,
    riskLevel: v2.riskLevel,
    totalCost: {
      label: 'Toplam geri ödeme (tahmini)',
      value: formatTry(v2.totalRepayment),
      hint: `Aylık ${formatTry(v2.monthlyPayment)} · Faiz yükü ${formatTry(v2.interestLoad)}`
    },
    strengths,
    weaknesses,
    alternatives: scenarios.slice(0, 4).map((s) => ({
      title: s.title,
      description: `${s.monthlyEffect || ''} · ${s.totalEffect || ''}`.trim(),
      meta: `${s.score}/100`
    })),
    executiveSummary: ai?.text || '',
    nextSteps: [
      '2–3 kurumdan karşılaştırmalı teklif alın.',
      'Erken ödeme ve masraf kalemlerini sorun.',
      v2.gapMessage || 'Gelir ve vade bilgilerini güncel tutun.'
    ].filter(Boolean),
    subScores: [
      { label: 'Aylık ödeme', value: v2.monthlyPayment, max: null },
      { label: 'Gelir/taksit %', value: Math.round(v2.incomeInstallmentRatio) },
      { label: 'Bütçe uyumu', value: v2.budgetFit },
      { label: 'Risk', value: v2.riskScore },
      { label: 'Finansman skoru', value: v2.financeDecisionScore }
    ],
    notices: v2.dataGaps.length ? [v2.gapMessage] : [],
    _summaryCtx: {
      decisionScore: v2.financeDecisionScore,
      riskLevel: v2.riskLevel,
      totalCostValue: formatTry(v2.totalRepayment),
      monthlyPaymentLabel: formatTry(v2.monthlyPayment),
      gapMessage: v2.gapMessage,
      strengths,
      weaknesses
    }
  };
}

function financeVerticalResultAdapter({ state, results = [], summary = {}, commentary = {} }) {
  const primary = results[0];
  const v2 = computeFinansVerticalV2(state, primary);
  const formatTry = (n) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(
      Number(n) || 0
    );

  const strengths = (primary?.pros || []).slice(0, 3);
  if (!strengths.length) {
    strengths.push(`Finansman skoru ${v2.financeDecisionScore}/100`, `Bütçe uyumu ${v2.budgetFit}/100`);
  }
  const weaknesses = (primary?.cautions || []).slice(0, 3);
  if (v2.gapMessage) weaknesses.unshift(v2.gapMessage);

  return {
    category: 'finans',
    categoryLabel: 'Finansman',
    decisionScore: v2.financeDecisionScore,
    confidenceScore: v2.confidenceScore,
    riskLevel: v2.riskLevel,
    totalCost: {
      label: 'Toplam geri ödeme (tahmini)',
      value: summary.totalCostLabel || formatTry(v2.totalRepayment),
      hint: summary.totalCostHint || `Aylık ${formatTry(v2.monthlyPayment)}`
    },
    strengths,
    weaknesses: weaknesses.length ? weaknesses : ['Kampanya koşulları değişkendir'],
    alternatives: results.slice(1, 4).map((r) => ({
      title: r.title,
      description: r.description || '',
      meta: `${r.score}/100`
    })),
    executiveSummary: commentary.summary || '',
    nextSteps: summary.nextStep
      ? [summary.nextStep]
      : ['Vade ve tutarı revize ederek tekrar simüle edin.', 'Banka ön görüşmesi planlayın.'],
    subScores: [
      { label: 'Bütçe uyumu', value: v2.budgetFit },
      { label: 'Gelir/taksit %', value: Math.round(v2.incomeInstallmentRatio) },
      { label: 'Risk puanı', value: v2.riskScore },
      { label: 'Finansman skoru', value: v2.financeDecisionScore }
    ],
    notices: v2.gapMessage ? [v2.gapMessage] : [],
    _summaryCtx: {
      decisionScore: v2.financeDecisionScore,
      riskLevel: v2.riskLevel,
      totalCostValue: summary.totalCostLabel,
      monthlyPaymentLabel: formatTry(v2.monthlyPayment),
      gapMessage: v2.gapMessage,
      strengths,
      weaknesses
    }
  };
}

export function normalizeDecisionResult(raw) {
  const result = { ...raw };
  delete result._summaryCtx;
  return result;
}
