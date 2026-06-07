/**
 * Finansman Decision Results V2 — Konut/Auto V2 ile aynı premium dil.
 */
import { escapeHtml } from '../../core/security.js';
import { FINANS_OPTIONS } from '../../finans/finans-config.js';
import { formatTry } from '../../tatil/tatil-utils.js';
import { baseScore as finansBaseScore, computeDebtScore } from '../../finans/finans-engine.js';
import {
  buildConfidenceScore,
  buildPdfReportData,
  buildRiskItem,
  clampScore,
  resolveScoreLabel,
  riskLevelToTone,
  safeTrackEvent
} from '../results/results-engine.js';
import { gatePdfDownload } from '../billing/pdf-access-v1.js';
import { getResultsPlanContext } from '../billing/paywall-v1.js';
import {
  buildInsightInputFromIntelligence,
  buildDecisionInsight,
  hydrateInsightBlocks,
  renderInsightBlocksHtml
} from '../ai/ai-insight-engine.js';
import {
  buildDecisionIntelligenceResult,
  fetchExecutiveSummaryV3,
  renderRiskAnalysisHtml,
  renderScoreFactorsHtml
} from '../results/decision-intelligence-engine.js';
import { hydrateResultsEconomicIndicators } from '../results/results-economic-indicators.js';
import {
  buildEvdsAiMarketSentence,
  buildEvdsRiskLayer,
  mountEvdsRiskLayer
} from '../results/results-evds-risk-layer.js';
import { fetchEvdsRatesForEngine } from '../evds/evds-market-engine.js';
import { withTimeout } from '../../core/async-utils.js';
import {
  renderResultsHeroLayout,
  scoreToneFromLabel
} from '../results/results-hero-layout.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatTryAmount(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function optionLabel(mapKey, value) {
  return FINANS_OPTIONS[mapKey]?.find((o) => o.value === value)?.label || value || '';
}

function amountMid(state) {
  if (state.amount_range === 'manuel' && state.amount_manual) {
    return Number(state.amount_manual);
  }
  return FINANS_OPTIONS.amount.find((o) => o.value === state.amount_range)?.mid || 750_000;
}

function capacityMid(state) {
  if (state.capacity_range === 'manuel' && state.capacity_manual) {
    return Number(state.capacity_manual);
  }
  return FINANS_OPTIONS.capacity.find((o) => o.value === state.capacity_range)?.cap || 25_000;
}

function termMonths(state) {
  return FINANS_OPTIONS.term.find((o) => o.value === state.term_months)?.months || 36;
}

function estimatePayment(principal, months, annualRate = 0.45) {
  const r = annualRate / 12;
  if (r <= 0) return Math.round(principal / Math.max(months, 1));
  return Math.round((principal * r * (1 + r) ** months) / ((1 + r) ** months - 1));
}

export function decisionScoreLabel(score) {
  return resolveScoreLabel(score, 'finansman');
}

function overallRiskFromDti(dti, cashPressure) {
  if (dti > 45 || cashPressure === 'Yüksek') return 'Yüksek';
  if (dti > 32 || cashPressure === 'Orta') return 'Orta';
  return 'Düşük';
}

export function computeConfidenceScore(state = {}) {
  return buildDecisionIntelligenceResult('finansman', state, {}).confidenceScore;
}

function computeConfidenceScoreLegacy(state = {}) {
  return buildConfidenceScore(state, [
    { ok: Boolean(state.purpose), weight: 12 },
    { ok: Boolean(state.amount_range) || safeNumber(state.amount_manual) > 0, weight: 14 },
    { ok: Boolean(state.term_months), weight: 12 },
    { ok: Boolean(state.capacity_range) || safeNumber(state.capacity_manual) > 0, weight: 12 },
    { ok: safeNumber(state.monthly_income) > 0, weight: 14 },
    { ok: safeNumber(state.monthly_expense) >= 0 && state.monthly_expense !== null, weight: 6 },
    { ok: safeNumber(state.existing_debt) >= 0, weight: 8 },
    { ok: Boolean(state.income_type), weight: 8 },
    { ok: Boolean(state.risk_tolerance), weight: 8 },
    { ok: Boolean(state.rate_sensitivity), weight: 6 }
  ]);
}

export function computeDecisionScore(state = {}, primaryResult = null) {
  return buildDecisionIntelligenceResult('finansman', state, {}, { primaryResult, results: [primaryResult] })
    .decisionScore;
}

/**
 * Seçili veya birincil senaryoyu çözümler.
 */
export function resolvePrimaryFinansResult(results = [], selectedId = '') {
  if (!results.length) return null;
  if (selectedId) {
    const picked = results.find((r) => r.id === selectedId);
    if (picked) return picked;
  }
  return results[0] || null;
}

/**
 * Tüm senaryo skorlarını V3 decisionScore ile senkronize eder (canonical kaynak).
 */
export function syncCanonicalFinansScores(state, results = [], selectedId = '') {
  (results || []).forEach((r) => {
    r.score = computeDecisionScore(state, r);
  });
  return resolvePrimaryFinansResult(results, selectedId);
}

export function isGenericFinansAlternative(alt = {}) {
  const description = String(alt.description || '').toLowerCase();
  if (/₺|tl/.test(description) && /taksit|toplam|aylık|geri/.test(description)) {
    return false;
  }
  const genericHints = [
    'toplam faizi düşürmek',
    'vade uzatma',
    'anapara %10',
    'nakit akışı baskısı yüksekse',
    'aylık yükü rahatlatır'
  ];
  return genericHints.some((hint) => description.includes(hint)) || description.length < 24;
}

function computeDecisionScoreLegacy(state = {}, primaryResult = null) {
  const principal = amountMid(state);
  const months = termMonths(state);
  const pay = primaryResult?.metrics?.monthlyPayment ?? estimatePayment(principal, months);
  const cap = capacityMid(state);
  const income = safeNumber(state.monthly_income);
  const debt = safeNumber(state.existing_debt);
  const dti = income > 0 ? ((pay + debt) / income) * 100 : 100;

  const paymentFit = cap > 0 ? clamp(100 - Math.max(0, pay - cap) / cap * 120, 20, 98) : 60;
  const dtiFit = clamp(100 - Math.max(0, dti - 28) * 1.5, 15, 95);
  const purposeFit = state.purpose ? 82 : 50;
  const riskTol =
    state.risk_tolerance === 'muhafazakar' ? 88 : state.risk_tolerance === 'agresif' ? 62 : 75;
  const termFit = months <= 24 ? 78 : months <= 48 ? 72 : 65;

  const blended = Math.round(
    paymentFit * 0.26 + dtiFit * 0.24 + purposeFit * 0.12 + riskTol * 0.14 + termFit * 0.1 + 14
  );
  const legacy = safeNumber(primaryResult?.score) || finansBaseScore(state);
  return clampScore(Math.round(blended * 0.55 + legacy * 0.45));
}

function estimateEffectiveAnnualRate(principal, months, monthlyPayment, extras = 0) {
  const p = safeNumber(principal);
  const n = Math.max(safeNumber(months), 1);
  const pay = safeNumber(monthlyPayment);
  if (!p || !pay) return null;
  const totalPaid = pay * n + safeNumber(extras);
  const annualFactor = (totalPaid / p - 1) / (n / 12);
  return Math.round(Math.max(annualFactor, 0) * 1000) / 10;
}

export function buildBddkBandExamples(state = {}) {
  const principal = amountMid(state);
  const months = termMonths(state);
  return {
    low: estimatePayment(principal, months, 0.4),
    mid: estimatePayment(principal, months, 0.45),
    high: estimatePayment(principal, months, 0.52)
  };
}

export function buildTotalCostView(state = {}, primaryResult = null) {
  const principal = amountMid(state);
  const months = termMonths(state);
  const monthly =
    primaryResult?.metrics?.monthlyPayment ?? estimatePayment(principal, months);
  const totalRepay = primaryResult?.metrics?.totalRepay ?? monthly * months;
  const interestCost = Math.max(totalRepay - principal, 0);
  const fileFees = Math.round(principal * 0.015);
  const kkdfBsmvEstimate = Math.round(interestCost * 0.3);
  const insuranceEstimate = Math.round(principal * 0.008);
  const yearlyLoad = monthly * 12;
  const income = safeNumber(state.monthly_income);
  const debt = safeNumber(state.existing_debt);
  const incomeLoadPct = income > 0 ? Math.round(((monthly + debt) / income) * 100) : null;
  const effectiveAnnualRate = estimateEffectiveAnnualRate(
    principal,
    months,
    monthly,
    fileFees + kkdfBsmvEstimate + insuranceEstimate
  );

  const isEstimate =
    !state.amount_range && !state.amount_manual ||
    !safeNumber(state.monthly_income) ||
    !state.term_months;

  return {
    isEstimate,
    estimateNote: isEstimate ? 'Tahmini model — banka teklifi ile doğrulanmalıdır.' : '',
    principal,
    monthlyPayment: monthly,
    totalRepayment: totalRepay,
    interestCost,
    fileFees,
    kkdfBsmvEstimate,
    insuranceEstimate,
    effectiveAnnualRate,
    yearlyLoad,
    incomeLoadPct,
    months
  };
}

export function buildRiskAnalysis(state = {}, primaryResult = null) {
  return buildDecisionIntelligenceResult('finansman', state, {}, { primaryResult }).riskAnalysis;
}

function buildRiskAnalysisLegacy(state = {}, primaryResult = null) {
  const principal = amountMid(state);
  const months = termMonths(state);
  const pay = primaryResult?.metrics?.monthlyPayment ?? estimatePayment(principal, months);
  const cap = capacityMid(state);
  const income = safeNumber(state.monthly_income);
  const expense = safeNumber(state.monthly_expense);
  const debt = safeNumber(state.existing_debt);
  const dti = income > 0 ? ((pay + debt) / income) * 100 : 100;
  const freeCash = income - expense - debt - pay;

  const paymentLevel =
    pay > cap * 1.05 ? 'yüksek' : pay > cap * 0.88 ? 'orta' : 'düşük';
  const dtiLevel = dti > 45 ? 'yüksek' : dti > 32 ? 'orta' : 'düşük';
  const rateLevel =
    state.rate_sensitivity === 'yuksek' ? 'yüksek' : state.rate_sensitivity === 'dusuk' ? 'düşük' : 'orta';
  const termLevel = months >= 60 ? 'orta' : months <= 24 ? 'düşük' : 'orta';
  const cashflowLevel = freeCash < 0 ? 'yüksek' : freeCash < income * 0.1 ? 'orta' : 'düşük';
  const earlyLevel =
    state.early_payment === 'dusuk' ? 'orta' : state.early_payment === 'yuksek' ? 'düşük' : 'orta';

  return [
    buildRiskItem(
      'payment',
      'Aylık ödeme riski',
      paymentLevel,
      paymentLevel === 'yüksek'
        ? 'Tahmini taksit aylık ödeme kapasitenizi aşabilir.'
        : 'Aylık ödeme kapasite bandınızla uyumlu görünüyor.',
      'Kapasite altında kalacak vade/tutar senaryosu simüle edin.'
    ),
    buildRiskItem(
      'dti',
      'Borç/gelir oranı riski',
      dtiLevel,
      `Borç ve yeni taksit toplamı gelirin yaklaşık %${Math.round(dti)} seviyesinde modelleniyor.`,
      dtiLevel === 'yüksek'
        ? 'Kredi tutarını düşürün veya gelir belgesi ile birlikte banka ön görüşmesi yapın.'
        : 'Gelir/borç tablosunu güncel belgelerle doğrulayın.'
    ),
    buildRiskItem(
      'rate',
      'Faiz oranı riski',
      rateLevel,
      rateLevel === 'yüksek'
        ? 'Faiz artışına hassas bir profil; kampanya dışı oranlar maliyeti artırabilir.'
        : 'Faiz bandı için 2–3 kurumdan teklif karşılaştırması önerilir.',
      'Efektif yıllık maliyet oranını (EYM) her teklifte kontrol edin.'
    ),
    buildRiskItem(
      'term',
      'Vade riski',
      termLevel,
      months >= 60
        ? 'Uzun vade aylık yükü düşürür; toplam faiz maliyeti artabilir.'
        : 'Vade yapısı dengeli görünüyor.',
      'Kısa ve uzun vade senaryolarını yan yana tablolaştırın.'
    ),
    buildRiskItem(
      'cashflow',
      'Nakit akışı riski',
      cashflowLevel,
      cashflowLevel === 'yüksek'
        ? 'Taksit sonrası serbest nakit akışı negatif veya çok dar görünüyor.'
        : 'Nakit akışında makul tampon var.',
      '3 aylık gider planı ile serbest nakit tamponunu test edin.'
    ),
    buildRiskItem(
      'flex',
      'Erken kapama / esneklik riski',
      earlyLevel,
      state.early_payment === 'dusuk'
        ? 'Erken kapama ihtimali düşük; uzun vadeli taahhüt maliyeti artabilir.'
        : 'Erken ödeme esnekliği profilinize uygun görünüyor.',
      'Erken kapama cezası ve sigorta zorunluluklarını sözleşmede kontrol edin.'
    )
  ];
}

function buildStrengths(state, primary, cost) {
  const items = [];
  const cap = capacityMid(state);
  const pay = cost.monthlyPayment;
  if (pay <= cap) items.push('Tahmini aylık ödeme, belirttiğiniz kapasite bandı içinde.');
  if (state.income_type === 'stabil') items.push('Stabil gelir profili finansman onayı için olumlu sinyal.');
  if (state.risk_tolerance === 'muhafazakar') items.push('Muhafazakar risk tercihi ile uyumlu senaryo seçildi.');
  if (state.early_payment === 'yuksek') items.push('Erken ödeme potansiyeli toplam faiz yükünü azaltabilir.');
  if (computeDebtScore(state) >= 75) items.push(`Borçlanma skoru güçlü (${computeDebtScore(state)}/100).`);
  if (items.length < 3) {
    items.push(`${optionLabel('purpose', state.purpose)} amacı için yapılandırılmış senaryo.`);
    items.push('Alternatif vade seçenekleri karşılaştırmaya hazır.');
  }
  return items.slice(0, 5);
}

function buildWeaknesses(state, primary, cost) {
  const items = [];
  const income = safeNumber(state.monthly_income);
  if (!income) items.push('Net gelir girilmediği için borç/gelir analizi sınırlıdır.');
  if (cost.isEstimate) items.push('Bazı tutarlar tahmini model ile hesaplandı; banka teklifi şart.');
  if (primary?.metrics?.cashPressure === 'Yüksek') {
    items.push('Aylık nakit akışı baskısı yüksek görünüyor.');
  }
  if (cost.incomeLoadPct && cost.incomeLoadPct > 40) {
    items.push(`Yeni taksit gelirin yaklaşık %${cost.incomeLoadPct} seviyesinde — sınırda olabilir.`);
  }
  (primary?.cautions || []).slice(0, 2).forEach((c) => items.push(c));
  if (!items.length) items.push('Kampanya faiz oranı müşteri profiline göre değişir.');
  return items.slice(0, 5);
}

function buildAlternativeCost(state, monthlyPayment, months, principalOverride = null) {
  const principal = principalOverride ?? amountMid(state);
  const totalRepayment = monthlyPayment * months;
  const interestCost = Math.max(totalRepayment - principal, 0);
  const income = safeNumber(state.monthly_income);
  const debt = safeNumber(state.existing_debt);
  const incomeLoadPct =
    income > 0 ? Math.round(((monthlyPayment + debt) / income) * 100) : null;
  return { principal, monthlyPayment, totalRepayment, interestCost, incomeLoadPct, months };
}

function formatAlternativeDescription(cost) {
  const parts = [
    `Aylık taksit: ${formatTryAmount(cost.monthlyPayment)}`,
    `Toplam geri ödeme: ${formatTryAmount(cost.totalRepayment)}`,
    `Faiz maliyeti: ${formatTryAmount(cost.interestCost)}`,
    cost.incomeLoadPct != null ? `Gelire göre yük: %${cost.incomeLoadPct}` : null
  ].filter(Boolean);
  return parts.join(' · ');
}

function alternativeFromResult(r, state, { selectedId = '' } = {}) {
  const months = termMonths(state);
  const monthly = r.metrics?.monthlyPayment ?? estimatePayment(amountMid(state), months);
  const totalRepay = r.metrics?.totalRepay ?? monthly * months;
  const cost = buildAlternativeCost(state, monthly, months);
  cost.totalRepayment = totalRepay;
  cost.interestCost = Math.max(totalRepay - cost.principal, 0);

  return {
    id: r.id,
    title: r.title,
    description: formatAlternativeDescription(cost),
    meta: r.id === selectedId ? 'Seçili senaryo' : r.badge?.label || `${computeDecisionScore(state, r)}/100`,
    why: r.why || r.description || '',
    monthlyPayment: cost.monthlyPayment,
    totalRepayment: cost.totalRepayment,
    interestCost: cost.interestCost,
    incomeLoadPct: cost.incomeLoadPct,
    isSelected: r.id === selectedId
  };
}

function alternativeFromComputed({
  id,
  title,
  months,
  monthlyPayment,
  principal,
  meta,
  why,
  state,
  selectedId = ''
}) {
  const cost = buildAlternativeCost(state, monthlyPayment, months, principal);
  return {
    id,
    title,
    description: formatAlternativeDescription(cost),
    meta,
    why,
    monthlyPayment: cost.monthlyPayment,
    totalRepayment: cost.totalRepayment,
    interestCost: cost.interestCost,
    incomeLoadPct: cost.incomeLoadPct,
    isSelected: id === selectedId
  };
}

export function buildAlternatives(state = {}, results = [], selectedId = '') {
  const principal = amountMid(state);
  const baseMonths = termMonths(state);
  const cap = capacityMid(state);

  const shortMonths = Math.max(12, baseMonths - 12);
  const longMonths = Math.min(60, baseMonths + 12);
  const shortPay = estimatePayment(principal, shortMonths, 0.44);
  const longPay = estimatePayment(principal, longMonths, 0.41);
  const lowPrincipal = Math.round(principal * 0.85);
  const lowPrincipalPay = estimatePayment(lowPrincipal, baseMonths, 0.43);

  const fromResults = (results || []).slice(0, 3).map((r) =>
    alternativeFromResult(r, state, { selectedId })
  );

  const defaults = [
    alternativeFromComputed({
      id: 'alt-short-term',
      title: 'Daha kısa vade alternatifi',
      months: shortMonths,
      monthlyPayment: shortPay,
      principal,
      meta: 'Toplam faiz düşebilir',
      why: 'Vade kısaltarak toplam faiz yükünü azaltmayı hedefler; aylık taksit artabilir.',
      state,
      selectedId
    }),
    alternativeFromComputed({
      id: 'alt-long-term',
      title: 'Daha düşük aylık ödeme alternatifi',
      months: longMonths,
      monthlyPayment: longPay,
      principal,
      meta: longPay <= cap ? 'Kapasiteye uygun' : 'Revizyon gerekir',
      why: 'Uzun vade ile aylık nakit akışını rahatlatır; toplam maliyet artabilir.',
      state,
      selectedId
    }),
    alternativeFromComputed({
      id: 'alt-lower-principal',
      title: 'Daha düşük toplam maliyet alternatifi',
      months: baseMonths,
      monthlyPayment: lowPrincipalPay,
      principal: lowPrincipal,
      meta: 'Anapara azaltma',
      why: 'Kredi tutarını düşürerek hem taksiti hem toplam geri ödemeyi azaltır.',
      state,
      selectedId
    })
  ];

  return [...fromResults, ...defaults].slice(0, 3);
}

function resolveAlternatives(state, results, intelAlternatives, selectedId) {
  const rich = buildAlternatives(state, results, selectedId);
  const useRich =
    !intelAlternatives?.length || intelAlternatives.every(isGenericFinansAlternative);
  if (useRich) return rich;

  return intelAlternatives.slice(0, 3).map((alt, index) => {
    const fallback = rich[index] || rich[0];
    return {
      ...fallback,
      ...alt,
      id: alt.id || fallback?.id,
      title: alt.title || fallback?.title || 'Alternatif',
      description:
        alt.description && !isGenericFinansAlternative(alt)
          ? alt.description
          : fallback?.description || alt.description,
      why: alt.why || fallback?.why || '',
      isSelected: (alt.id || fallback?.id) === selectedId
    };
  });
}

/**
 * V2 sonuç aksiyon çubuğu (legacy vacation-final-cta / selection-bar karşılığı).
 */
export function renderFinansmanActionsBarHtml({ esc = escapeHtml } = {}) {
  return `
    <div class="finansman-v2-actions" aria-label="Sonuç aksiyonları">
      <button type="button" class="btn secondary finansman-v2-detail" data-finansman-v2-detail>
        Detaylı finansman analizi al
      </button>
      <button type="button" class="btn secondary finansman-v2-restart" data-finansman-v2-restart>
        Tekrar hesapla
      </button>
      <button type="button" class="btn secondary finansman-v2-pdf" data-finansman-v2-pdf>
        PDF olarak kaydet
      </button>
      <button type="button" class="btn secondary finansman-v2-partner" data-finansman-v2-partner>
        Uygun teklif / danışman desteği al
      </button>
      <div class="finansman-v2-lead-panel" data-finansman-v2-lead-panel hidden>
        <p class="finansman-v2-lead-hint" data-finansman-v2-lead-hint></p>
        <div class="finansman-v2-lead-fields">
          <input type="text" data-finansman-v2-lead-name placeholder="Ad soyad" autocomplete="name">
          <input type="tel" data-finansman-v2-lead-phone placeholder="Telefon" autocomplete="tel">
          <input type="email" data-finansman-v2-lead-email placeholder="E-posta" autocomplete="email">
        </div>
        <button type="button" class="btn primary finansman-v2-lead-submit" data-finansman-v2-lead-submit>
          Talebi gönder
        </button>
      </div>
      <p class="finansman-v2-action-feedback" data-finansman-v2-action-feedback hidden></p>
      <p class="finansman-v2-pdf-hint" data-finansman-v2-pdf-hint hidden></p>
    </div>`;
}

function buildNextSteps(state, riskAnalysis) {
  const high = riskAnalysis.filter((r) => r.level === 'yüksek');
  const steps = [
    'Banka tekliflerini karşılaştırın (en az 2–3 kurum).',
    'Efektif yıllık maliyet oranını (EYM) her teklifte kontrol edin.',
    'Aylık ödeme/gelir oranını %40–45 bandının altında tutmayı hedefleyin.',
    'Erken kapama şartları ve cezalarını sözleşmede inceleyin.',
    'Sigorta ve dosya/masraf kalemlerini teklif dökümünde doğrulayın.',
    'Alternatif vade senaryosu tablosu çıkarın (12 / 36 / 48 ay).'
  ];
  if (high.some((r) => r.key === 'cashflow')) {
    steps.unshift('Önce aylık gider planını güncelleyin; serbest nakit tamponu oluşturun.');
  }
  return steps.slice(0, 6);
}

/**
 * Tam result payload.
 */
export function buildFinansmanResultsV2Payload({
  state = {},
  results = [],
  selectedOption = '',
  evdsRates = null
}) {
  const primary = resolvePrimaryFinansResult(results, selectedOption);
  const cost = buildTotalCostView(state, primary);
  const intel = buildDecisionIntelligenceResult('finansman', state, { monthlyPayment: cost.monthlyPayment }, {
    primaryResult: primary,
    results
  });
  const evdsRiskLayer = buildEvdsRiskLayer('finance', evdsRates || {});
  const riskAnalysis = intel.riskAnalysis;
  const decisionScore = intel.decisionScore;
  const confidenceScore = intel.confidenceScore;
  const overallRisk = intel.overallRisk;

  const strengths = buildStrengths(state, primary, cost);
  const weaknesses = buildWeaknesses(state, primary, cost);
  const alternatives = resolveAlternatives(state, results, intel.alternatives, primary?.id || selectedOption);
  const nextSteps = intel.nextSteps;
  const highRisk = riskAnalysis.find((r) => r.level === 'yüksek');
  const criticalRisk = highRisk?.title || '';

  const { planTier } = getResultsPlanContext();
  const insightInput = buildInsightInputFromIntelligence('finansman', intel.context || {}, intel, {
    planTier,
    strengths,
    weaknesses,
    marketAssessment: buildEvdsAiMarketSentence(evdsRiskLayer),
    costs: {
      monthlyPayment: cost.monthlyPayment,
      paymentToIncome: cost.incomeLoadPct,
      termMonths: state.term_months === '60' ? 60 : state.term_months === '24' ? 24 : 36
    }
  });

  const pdfReportData = buildPdfReportData({
    category: 'finansman',
    planTier,
    purpose: optionLabel('purpose', state.purpose),
    decisionScore,
    scoreLabel: intel.scoreLabel,
    confidenceScore,
    overallRisk,
    totalCost: cost,
    riskAnalysis,
    strengths,
    weaknesses,
    alternatives,
    nextSteps,
    executiveSummary: intel.executiveSummary,
    scoreFactors: intel.scoreFactors,
    warnings: intel.warnings,
    recommendationLevel: intel.recommendationLevel,
    profile: {
      term: optionLabel('term', state.term_months),
      incomeType: optionLabel('income', state.income_type),
      riskTolerance: optionLabel('riskTolerance', state.risk_tolerance)
    }
  });

  return {
    decisionScore,
    scoreLabel: intel.scoreLabel,
    confidenceScore,
    overallRisk,
    riskTone: riskLevelToTone(overallRisk),
    riskAnalysis,
    totalCost: cost,
    strengths,
    weaknesses,
    alternatives,
    executiveSummary: intel.executiveSummary,
    nextSteps,
    scoreFactors: intel.scoreFactors,
    warnings: intel.warnings,
    recommendationLevel: intel.recommendationLevel,
    recommendationLabel: intel.recommendationLabel,
    intelligence: intel,
    pdfReportData,
    purpose: state.purpose,
    monthlyLabel: formatTryAmount(cost.monthlyPayment),
    totalLabel: formatTryAmount(cost.totalRepayment),
    criticalRisk: riskAnalysis.find((r) => r.level === 'yüksek')?.title || '',
    planTier,
    insightInput,
    insight: buildDecisionInsight(insightInput),
    evdsRiskLayer,
    primaryTitle: primary?.title || `${optionLabel('purpose', state.purpose)} — Dengeli vade`,
    selectedOption: primary?.id || selectedOption || '',
    bddkExamples: buildBddkBandExamples(state)
  };
}

function renderFinansmanResultsV2Html(model) {
  const esc = escapeHtml;
  const cost = model.totalCost || {};
  const estimateNote = cost.isEstimate
    ? `<p class="finansman-v2-estimate-note">${esc(cost.estimateNote)}</p>`
    : '';

  const exampleRate = cost.months && cost.principal && cost.monthlyPayment
    ? '~%42 (örnek band)'
    : 'Profilinize göre';

  const heroHtml = renderResultsHeroLayout({
    vertical: 'finance',
    title: 'Finansman Planı Öneriniz',
    subtitle: 'Analizinize göre en uygun finansman planı belirlendi.',
    recommendation: {
      kicker: 'Önerilen Plan',
      title: model.primaryTitle || 'Dengeli vade senaryosu',
      badge: model.recommendationLabel || 'En Uygun',
      badgeTone: 'success'
    },
    specs: [
      { label: 'Kredi Tutarı', value: formatTryAmount(cost.principal) },
      { label: 'Vade', value: cost.months ? `${cost.months} ay` : '—' },
      { label: 'Faiz Oranı', value: exampleRate },
      { label: 'Aylık Taksit', value: formatTryAmount(cost.monthlyPayment) },
      { label: 'Toplam Geri Ödeme', value: formatTryAmount(cost.totalRepayment) },
      { label: 'Genel Risk', value: model.overallRisk || '—' }
    ],
    score: model.decisionScore,
    scoreLabel: model.scoreLabel || 'Uygunluk Skoru',
    scoreTone: scoreToneFromLabel(model.scoreLabel),
    evdsMountClass: 'finansman-v2-evds-mount ib-results-economic--compact'
  });

  return `
    <section class="finansman-v2-panel" aria-label="Finansman Decision Results V2">
      ${heroHtml}

      <div id="ib-results-detail"></div>

      ${renderScoreFactorsHtml(model.scoreFactors, 'finansman-v2')}

      <div class="finansman-v2-kpis finansman-v2-kpis--secondary">
        <article class="finansman-v2-kpi finansman-v2-kpi--confidence">
          <span>Güven Skoru</span>
          <strong>${esc(String(model.confidenceScore))}<small>/100</small></strong>
          <div class="finansman-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.confidenceScore))}%"></span></div>
        </article>
        <article class="finansman-v2-kpi finansman-v2-kpi--risk">
          <span>Genel Risk</span>
          <strong><span class="finansman-v2-risk finansman-v2-risk--${esc(model.riskTone)}">${esc(model.overallRisk)}</span></strong>
        </article>
        <article class="finansman-v2-kpi finansman-v2-kpi--cost">
          <span>12 ay ödeme yükü</span>
          <strong>${esc(formatTryAmount(cost.yearlyLoad))}</strong>
          <small>Aylık ~${esc(formatTryAmount(cost.monthlyPayment))}</small>
        </article>
      </div>

      ${estimateNote}

      <section class="finansman-v2-bddk" aria-label="BDDK bilgilendirme">
        <h3>BDDK uyumlu bilgilendirme</h3>
        <p class="finansman-v2-bddk-note">Gösterilen oranlar örnek bandıdır; gerçek teklif kredi notu, gelir belgesi ve banka politikasına göre değişir. isteBul banka veya kredi kuruluşu değildir.</p>
        <table class="finansman-v2-rate-table">
          <thead><tr><th>Senaryo</th><th>Örnek yıllık faiz bandı</th><th>${esc(String(model.totalCost?.months || 36))} ay taksit (örnek band)</th></tr></thead>
          <tbody>
            <tr><td>Düşük risk profili</td><td>%38 – %42</td><td>${esc(formatTryAmount(model.bddkExamples?.low || 0))} <small>(tahmini)</small></td></tr>
            <tr><td>Orta risk profili</td><td>%42 – %48</td><td>${esc(formatTryAmount(model.bddkExamples?.mid || 0))} <small>(tahmini)</small></td></tr>
            <tr><td>Yüksek nakit baskısı</td><td>%48+ veya revizyon</td><td>${esc(formatTryAmount(model.bddkExamples?.high || 0))} <small>(tahmini)</small></td></tr>
          </tbody>
        </table>
      </section>

      <section class="finansman-v2-cost-grid" aria-label="Toplam maliyet görünümü">
        <h3>Toplam Maliyet Görünümü</h3>
        <dl class="finansman-v2-cost-dl">
          <div><dt>Talep edilen finansman</dt><dd>${esc(formatTryAmount(cost.principal))}</dd></div>
          <div><dt>Tahmini aylık ödeme</dt><dd>${esc(formatTryAmount(cost.monthlyPayment))}</dd></div>
          <div><dt>Toplam geri ödeme</dt><dd>${esc(formatTryAmount(cost.totalRepayment))}</dd></div>
          <div><dt>Tahmini faiz maliyeti</dt><dd>${esc(formatTryAmount(cost.interestCost))}</dd></div>
          <div><dt>Dosya/masraf tahmini</dt><dd>${esc(formatTryAmount(cost.fileFees))}</dd></div>
          <div><dt>KKDF/BSMV tahmini</dt><dd>${esc(formatTryAmount(cost.kkdfBsmvEstimate))} <small>(tahmini)</small></dd></div>
          <div><dt>Sigorta tahmini</dt><dd>${esc(formatTryAmount(cost.insuranceEstimate))} <small>(tahmini)</small></dd></div>
          <div><dt>Efektif yıllık maliyet</dt><dd>${cost.effectiveAnnualRate != null ? esc(`~%${cost.effectiveAnnualRate}`) : '—'} <small>(tahmini)</small></dd></div>
          <div><dt>İlk 12 ay ödeme yükü</dt><dd>${esc(formatTryAmount(cost.yearlyLoad))}</dd></div>
          <div><dt>Gelire göre aylık yük</dt><dd>${cost.incomeLoadPct != null ? esc(`%${cost.incomeLoadPct}`) : '—'}</dd></div>
          <div><dt>Vade</dt><dd>${esc(String(cost.months || '—'))} ay</dd></div>
        </dl>
      </section>

      ${renderRiskAnalysisHtml(model.riskAnalysis, 'finansman-v2')}

      <div class="finansman-v2-grid">
        <article class="finansman-v2-block finansman-v2-block--pros">
          <h3>Güçlü Yönler</h3>
          <ul>${model.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
        <article class="finansman-v2-block finansman-v2-block--cons">
          <h3>Zayıf Yönler</h3>
          <ul>${model.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
      </div>

      <section class="finansman-v2-alts" aria-label="Alternatifler">
        <h3>Alternatif Senaryolar</h3>
        <p class="finansman-v2-alts-hint">Bir senaryo seçerek hero ve maliyet tablosunu güncelleyin.</p>
        <div class="finansman-v2-alt-grid">
          ${model.alternatives
            .map(
              (a) => `
            <article class="finansman-v2-alt-card ${a.isSelected ? 'is-selected' : ''}" data-finansman-v2-scenario="${esc(a.id || '')}" role="button" tabindex="0" aria-pressed="${a.isSelected ? 'true' : 'false'}">
              <h4>${esc(a.title)}</h4>
              <p class="finansman-v2-alt-desc">${esc(a.description)}</p>
              ${a.why ? `<p class="finansman-v2-alt-why"><strong>Neden:</strong> ${esc(a.why)}</p>` : ''}
              ${a.meta ? `<span class="finansman-v2-alt-meta">${esc(a.meta)}</span>` : ''}
            </article>`
            )
            .join('')}
        </div>
      </section>

      <article class="finansman-v2-block finansman-v2-block--exec" data-finansman-v2-insight-root>
        <h3>AI karar yorumu</h3>
        ${renderInsightBlocksHtml(model.insight, esc, {
          planTier: model.planTier,
          insightInput: model.insightInput
        })}
        <p class="finansman-v2-exec-hint" data-finansman-v2-source></p>
      </article>

      <article class="finansman-v2-block finansman-v2-block--next">
        <h3>Sonraki Adımlar</h3>
        <ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </article>

      ${renderFinansmanActionsBarHtml({ esc })}
    </section>`;
}

function bindFinansmanV2Actions(root, { track, model, onRestart, onDetailedAnalysis, onPartnerCta, onLeadSubmit }) {
  const pdfBtn = root.querySelector('[data-finansman-v2-pdf]');
  const pdfHint = root.querySelector('[data-finansman-v2-pdf-hint]');
  const restartBtn = root.querySelector('[data-finansman-v2-restart]');
  const detailBtn = root.querySelector('[data-finansman-v2-detail]');
  const partnerBtn = root.querySelector('[data-finansman-v2-partner]');
  const leadPanel = root.querySelector('[data-finansman-v2-lead-panel]');
  const leadHint = root.querySelector('[data-finansman-v2-lead-hint]');
  const leadSubmit = root.querySelector('[data-finansman-v2-lead-submit]');
  const feedbackEl = root.querySelector('[data-finansman-v2-action-feedback]');

  const leadEls = { leadPanel, leadHint, feedbackEl };

  pdfBtn?.addEventListener('click', () => {
    safeTrackEvent(track, 'finance_report_print_click', {
      category: 'finansman',
      score: model.decisionScore,
      selected_option: model.selectedOption
    });
    if (pdfHint) {
      pdfHint.hidden = false;
      pdfHint.textContent =
        'Rapor penceresi açıldı. Yazdır diyalogunda “PDF olarak kaydet” seçeneğini kullanabilirsiniz.';
    }
    if (feedbackEl) feedbackEl.hidden = true;
    gatePdfDownload(model.pdfReportData);
  });

  restartBtn?.addEventListener('click', () => {
    if (typeof onRestart === 'function') onRestart();
  });

  detailBtn?.addEventListener('click', async () => {
    if (typeof onDetailedAnalysis === 'function') {
      await onDetailedAnalysis(leadEls);
    }
  });

  partnerBtn?.addEventListener('click', async () => {
    if (typeof onPartnerCta === 'function') {
      await onPartnerCta(leadEls);
    }
  });

  leadSubmit?.addEventListener('click', async () => {
    if (typeof onLeadSubmit !== 'function') return;
    const formData = {
      fullName: root.querySelector('[data-finansman-v2-lead-name]')?.value?.trim() || '',
      phone: root.querySelector('[data-finansman-v2-lead-phone]')?.value?.trim() || '',
      email: root.querySelector('[data-finansman-v2-lead-email]')?.value?.trim() || ''
    };
    await onLeadSubmit(formData, feedbackEl);
  });
}

/**
 * @param {HTMLElement} mountNode
 * @param {object} payload — state, results, track, summary (opsiyonel)
 */
function bindFinansmanScenarioSelection(root, payload) {
  root.querySelectorAll('[data-finansman-v2-scenario]').forEach((card) => {
    const id = card.dataset.finansmanV2Scenario;
    if (!id) return;

    const activate = () => {
      if (id === payload.selectedOption) return;
      payload.onSelectScenario?.(id);
    };

    card.addEventListener('click', activate);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });
}

const FINANSMAN_EVDS_TIMEOUT_MS = 5000;
const FINANSMAN_SUMMARY_TIMEOUT_MS = 10000;

async function hydrateFinansmanResultsV2Extras(root, model, track) {
  try {
    const evdsSnapshot = await withTimeout(fetchEvdsRatesForEngine(), FINANSMAN_EVDS_TIMEOUT_MS, null);
    if (evdsSnapshot?.rates) {
      const refreshed = buildFinansmanResultsV2Payload({
        state: model.state || {},
        results: model.results || [],
        selectedOption: model.selectedOption,
        evdsRates: evdsSnapshot.rates
      });
      model.evdsRiskLayer = refreshed.evdsRiskLayer;
      mountEvdsRiskLayer(root, model.evdsRiskLayer);
    }
    await withTimeout(hydrateResultsEconomicIndicators(root, 'finansman'), FINANSMAN_EVDS_TIMEOUT_MS);
  } catch (error) {
    console.warn('finansman-v2-evds-hydrate-failed', error);
  }

  try {
    const summary = await withTimeout(
      fetchExecutiveSummaryV3(
        'finansman',
        model.intelligence?.context || {},
        model.intelligence || model,
        {
          planTier: model.planTier,
          strengths: model.strengths,
          weaknesses: model.weaknesses,
          marketAssessment: buildEvdsAiMarketSentence(model.evdsRiskLayer),
          costs: model.totalCost
        }
      ),
      FINANSMAN_SUMMARY_TIMEOUT_MS,
      null
    );
    if (!summary) return;

    if (summary.insight) {
      model.insight = summary.insight;
      hydrateInsightBlocks(root.querySelector('[data-finansman-v2-insight-root]'), summary.insight);
    }
    const sourceEl = root.querySelector('[data-finansman-v2-source]');
    if (sourceEl) {
      sourceEl.textContent =
        summary.source === 'ai' ? 'Kaynak: AI destekli yorum' : 'Kaynak: Kural tabanlı karar yorumu';
    }
    model.executiveSummary = summary.text;
    model.pdfReportData.executiveSummary = summary.text;
    if (summary.insight) model.pdfReportData.insightBlocks = summary.insight;
  } catch (error) {
    console.warn('finansman-v2-summary-hydrate-failed', error);
  }
}

export async function mountFinansmanResultsV2(mountNode, payload = {}) {
  if (!mountNode) return null;

  const state = payload.state || {};
  const results = payload.results || [];
  const selectedOption = payload.selectedOption || results[0]?.id || '';
  const track = payload.track;

  mountNode.querySelector('.finansman-v2-root')?.remove();

  syncCanonicalFinansScores(state, results, selectedOption);

  const built = buildFinansmanResultsV2Payload({
    state,
    results,
    selectedOption,
    evdsRates: null
  });
  const model = {
    ...built,
    state,
    results,
    executiveSummary: '',
    summarySourceLabel: ''
  };

  const root = document.createElement('div');
  root.className = 'finansman-v2-root';
  root.innerHTML = renderFinansmanResultsV2Html(model);
  mountNode.prepend(root);
  bindFinansmanScenarioSelection(root, { ...payload, selectedOption });

  safeTrackEvent(track, 'finance_result_v2_view', {
    category: 'finansman',
    score: model.decisionScore,
    confidence: model.confidenceScore,
    risk: model.overallRisk,
    selected_option: model.selectedOption
  });

  bindFinansmanV2Actions(root, {
    track,
    model,
    onRestart: payload.onRestart,
    onDetailedAnalysis: payload.onDetailedAnalysis,
    onPartnerCta: payload.onPartnerCta,
    onLeadSubmit: payload.onLeadSubmit
  });

  void hydrateFinansmanResultsV2Extras(root, model, track);

  void import('../../decision/decision-v3-mount.js')
    .then(({ mountDecisionEngineV3Overlay }) =>
      mountDecisionEngineV3Overlay(mountNode, {
        category: 'finansman',
        formData: state,
        metrics: {
          totalCost: model.totalCost?.totalRepayment ?? model.totalCost?.yearlyLoad ?? null
        },
        extras: {
          primaryResult: results.find((item) => item.id === model.selectedOption) || results[0],
          results,
          totalCost: model.totalCost?.totalRepayment ?? model.totalCost?.yearlyLoad ?? null,
          title: 'Finansman Kararı'
        }
      })
    )
    .catch(() => {});

  void import('../../decision/decision-os-mount.js')
    .then(({ mountDecisionOsOverlay }) =>
      mountDecisionOsOverlay(mountNode, {
        category: 'finansman',
        formData: state,
        metrics: {
          totalCost: model.totalCost?.totalRepayment ?? model.totalCost?.yearlyLoad ?? null
        },
        intelligence: model.intelligence,
        model,
        extras: {
          primaryResult: results.find((item) => item.id === model.selectedOption) || results[0],
          results,
          totalCost: model.totalCost?.totalRepayment ?? model.totalCost?.yearlyLoad ?? null,
          title: 'Finansman Kararı',
          strengths: model.strengths,
          cautions: model.weaknesses,
          alternatives: model.alternatives,
          insight: model.insight,
          executiveSummary: model.executiveSummary
        }
      })
    )
    .catch(() => {});

  return model;
}
