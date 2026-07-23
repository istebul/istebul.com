/**
 * Konut Decision Results V2 — premium karar raporu (Auto V2 ile aynı tasarım dili).
 * Mevcut konut sonuç ekranını bozmaz; üstüne prepend edilir.
 */
import { escapeHtml } from '../../core/security.js';
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
  markInsightSummaryUnavailable,
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
import {
  buildAfadAiActivitySentence,
  fetchAndBuildAfadRiskLayer,
  mountAfadRiskLayer
} from '../results/results-afad-risk-layer.js';
import {
  buildTuikReferenceLayer,
  fetchTuikReferenceSnapshot,
  mountTuikReferenceLayer
} from '../results/results-tuik-reference-layer.js';
import { fetchEvdsRatesForEngine } from '../evds/evds-market-engine.js';
import {
  renderResultsHeroLayout,
  scoreToneFromLabel
} from '../results/results-hero-layout.js';
import { withTimeout } from '../../core/async-utils.js';

const KONUT_SUMMARY_TIMEOUT_MS = 10000;

/**
 * Konut state'inden AFAD snapshot province/district çözümlemesi.
 * @param {object} [state]
 * @returns {{ province: string, district: string }|null}
 */
export function resolveKonutAfadLocation(state = {}) {
  const province = String(state.city || state.province || '').trim();
  const district = String(state.district || '').trim();
  if (!province && !district) return null;
  return { province, district };
}

/**
 * Konut sonuç hero aside — AFAD bilgilendirme katmanı (skor üretmez).
 * @param {HTMLElement|null} root
 * @param {object} [state]
 * @param {typeof fetch} [fetchImpl]
 */
export async function hydrateKonutAfadRiskLayer(root, state = {}, fetchImpl) {
  if (!root) return null;

  const location = resolveKonutAfadLocation(state);
  if (!location) return null;

  const layer = await fetchAndBuildAfadRiskLayer({
    province: location.province,
    district: location.district,
    fetchImpl
  });

  mountAfadRiskLayer(root, layer);
  return layer;
}

/**
 * Konut sonuç hero aside — TÜİK referans katmanı (skor üretmez).
 * @param {HTMLElement|null} root
 * @param {object} [_state]
 * @param {typeof fetch} [fetchImpl]
 */
export async function hydrateKonutTuikReferenceLayer(root, _state = {}, fetchImpl) {
  if (!root || typeof document === 'undefined') return null;

  root.querySelector('[data-tuik-reference-layer]')?.remove();

  const snapshot = await fetchTuikReferenceSnapshot({
    vertical: 'konut',
    fetchImpl
  });
  if (!snapshot) return null;

  const layer = buildTuikReferenceLayer(snapshot, { vertical: 'konut' });
  if (!layer?.hasData) return null;

  const wrap = document.createElement('div');
  if (!mountTuikReferenceLayer(wrap, layer)) return null;

  const card = wrap.firstElementChild;
  if (!card) return null;

  const afadLayer = root.querySelector('[data-afad-risk-layer]');
  const evdsLayer = root.querySelector('[data-evds-risk-layer]');
  const economicMount = root.querySelector('[data-results-economic-mount]');

  if (afadLayer?.parentNode) {
    afadLayer.insertAdjacentElement('afterend', card);
    return layer;
  }

  if (evdsLayer?.parentNode) {
    evdsLayer.insertAdjacentElement('afterend', card);
    return layer;
  }

  if (economicMount?.parentNode) {
    economicMount.insertAdjacentElement('afterend', card);
    return layer;
  }

  root.prepend(card);
  return layer;
}

/**
 * Executive summary fetch context — AFAD aktivite cümlesi (OD-2C-3b, skor üretmez).
 * @param {object} [baseContext]
 * @param {ReturnType<typeof fetchAndBuildAfadRiskLayer>|null} [afadLayer]
 */
export function buildKonutExecutiveSummaryContext(baseContext = {}, afadLayer) {
  return {
    ...baseContext,
    earthquakeActivityAssessment: buildAfadAiActivitySentence(afadLayer)
  };
}

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

function decisionScoreLabel(score) {
  return resolveScoreLabel(score, 'konut');
}

/**
 * Form doluluğuna göre güven skoru.
 */
export function computeConfidenceScore(state = {}) {
  return buildDecisionIntelligenceResult('konut', state, {}).confidenceScore;
}

export function computeConfidenceScoreLegacy(state = {}) {
  return buildConfidenceScore(state, [
    { ok: Boolean(String(state.city || '').trim()), weight: 14 },
    { ok: Boolean(String(state.district || '').trim()), weight: 6 },
    { ok: safeNumber(state.totalBudget) > 0, weight: 14 },
    { ok: Boolean(state.homeType), weight: 10 },
    { ok: Boolean(String(state.roomCount || '').trim()) || Boolean(String(state.squareMeters || '').trim()), weight: 8 },
    { ok: Boolean(state.purchasePurpose), weight: 10 },
    { ok: Boolean(state.useFinancing), weight: 8 },
    { ok: safeNumber(state.monthlyIncome) > 0, weight: 8 },
    { ok: safeNumber(state.monthlyCapacity) > 0, weight: 8 },
    { ok: (state.locationPreferences?.length || 0) > 0, weight: 7 },
    { ok: (state.riskPreferences?.length || 0) > 0, weight: 7 }
  ]);
}

/**
 * V2 karar skoru — mevcut metrics ile harmanlanır.
 */
export function computeDecisionScore(state = {}, metrics = {}) {
  return buildDecisionIntelligenceResult('konut', state, metrics).decisionScore;
}

/**
 * metrics.score ve scoreBand'ı V3 decisionScore ile senkronize eder (canonical kaynak).
 * @param {object} state
 * @param {object} metrics — yerinde güncellenir
 * @param {(score: number) => object} [scoreBandFn]
 */
export function syncCanonicalDecisionScore(state, metrics, scoreBandFn) {
  const decisionScore = computeDecisionScore(state, metrics);
  metrics.score = decisionScore;
  if (typeof scoreBandFn === 'function') {
    metrics.scoreBand = scoreBandFn(decisionScore);
  }
  return decisionScore;
}

function computeDecisionScoreLegacy(state = {}, metrics = {}) {
  const purposeScore = state.purchasePurpose
    ? state.purchasePurpose.includes('Yatırım')
      ? 78
      : state.purchasePurpose.includes('Kiralamak')
        ? 72
        : 84
    : 52;

  const components = {
    budget: safeNumber(metrics.budgetFit) || 65,
    location: safeNumber(metrics.locationFit) || 60,
    homeType: safeNumber(metrics.homeTypeFit) || 70,
    purpose: purposeScore,
    financing: safeNumber(metrics.financingClarity) || 60,
    costPressure: clamp(100 - safeNumber(metrics.costPressure), 25, 95),
    investment: safeNumber(metrics.investmentPotential) || 65,
    riskAdjusted: clamp(100 - safeNumber(metrics.risk?.score), 20, 95)
  };

  const blended = Math.round(
    components.budget * 0.2 +
      components.location * 0.16 +
      components.homeType * 0.1 +
      components.purpose * 0.1 +
      components.financing * 0.12 +
      components.costPressure * 0.1 +
      components.investment * 0.08 +
      components.riskAdjusted * 0.14
  );

  const legacy = safeNumber(metrics.score);
  return clampScore(Math.round(blended * 0.5 + legacy * 0.5));
}

export function buildRiskAnalysis(state = {}, metrics = {}) {
  return buildDecisionIntelligenceResult('konut', state, metrics).riskAnalysis;
}

function buildRiskAnalysisLegacy(state = {}, metrics = {}) {
  const ownership = metrics.ownership || {};
  const budget = safeNumber(state.totalBudget) || safeNumber(ownership.homePrice);
  const monthly = safeNumber(ownership.monthlyPayment);
  const capacity = safeNumber(state.monthlyCapacity) || safeNumber(state.monthlyIncome) * 0.35;
  const dti = safeNumber(metrics.dti);
  const eq = safeNumber(metrics.earthquakeRiskScore);
  const dues = safeNumber(state.duesExpectation || state.dues);

  const budgetPressure = capacity > 0 ? monthly / capacity : dti / 100;
  const budgetLevel =
    budgetPressure > 1.05 || dti > 45 ? 'yüksek' : budgetPressure > 0.85 || dti > 32 ? 'orta' : 'düşük';

  const locationLevel =
    eq > 60 ? 'yüksek' : safeNumber(metrics.locationFit) < 55 ? 'orta' : 'düşük';

  const creditLevel =
    dti > 45 ? 'yüksek' : dti > 32 || state.useFinancing === 'evet' && !safeNumber(state.loanAmount)
      ? 'orta'
      : 'düşük';

  const depreciationLevel =
    safeNumber(state.buildingAge) > 25 || state.homeType?.includes('Eski') ? 'orta' : 'düşük';

  const liquidityLevel =
    safeNumber(metrics.liquidityRisk) > 55 ? 'yüksek' : safeNumber(metrics.liquidityRisk) > 38 ? 'orta' : 'düşük';

  const duesLevel =
    dues > 5000 || (capacity > 0 && dues / capacity > 0.2) ? 'yüksek' : dues > 2500 ? 'orta' : 'düşük';

  return [
    buildRiskItem(
      'budget',
      'Bütçe riski',
      budgetLevel,
      budgetLevel === 'yüksek'
        ? 'Aylık ödeme veya borç/gelir oranı bütçe bandınızı zorlayabilir.'
        : budgetLevel === 'orta'
          ? 'Bütçe ile maliyet dengeli görünüyor; faiz/vade değişimine dikkat edin.'
          : 'Bütçe ile tahmini yük uyumlu görünüyor.',
      budgetLevel === 'yüksek'
        ? 'Peşinatı artırın veya daha düşük bütçeli segmentlere bakın.'
        : '2 alternatif bütçe senaryosu ile aylık yükü doğrulayın.'
    ),
    buildRiskItem(
      'location',
      'Lokasyon riski',
      locationLevel,
      locationLevel === 'yüksek'
        ? 'Seçilen il/bölge için deprem veya lokasyon uyumu hassasiyeti yüksek.'
        : 'Lokasyon tercihleri ile bölge profili genel olarak uyumlu.',
      'Bölge fiyat trendi ve ulaşım altyapısını karşılaştırmalı kontrol edin.'
    ),
    buildRiskItem(
      'credit',
      'Kredi/finansman riski',
      creditLevel,
      creditLevel === 'yüksek'
        ? 'Kredi yükü gelir veya kapasiteye göre baskı oluşturabilir.'
        : 'Finansman yapısı kontrollü görünüyor; yine de banka ön onayı önerilir.',
      'Kredi ön onayı alın; vade ve faiz senaryolarını yan yana simüle edin.'
    ),
    buildRiskItem(
      'depreciation',
      'Değer kaybı riski',
      depreciationLevel,
      depreciationLevel === 'orta'
        ? 'Bina yaşı veya segment nedeniyle yeniden satış değeri dalgalanabilir.'
        : 'Segment ve bina yaşı açısından değer kaybı baskısı sınırlı görünüyor.',
      'Emsal satış fiyatlarını ve bölge talep trendini doğrulayın.'
    ),
    buildRiskItem(
      'liquidity',
      'Likidite/satılabilirlik riski',
      liquidityLevel,
      liquidityLevel === 'yüksek'
        ? 'Dar segment veya uzak lokasyon satış süresini uzatabilir.'
        : 'Piyasa likiditesi bu profil için kabul edilebilir görünüyor.',
      'Satış senaryosu için 3 emsal ilan ile likidite testi yapın.'
    ),
    buildRiskItem(
      'dues',
      'Aidat ve ek maliyet riski',
      duesLevel,
      duesLevel === 'yüksek'
        ? 'Aidat veya ek giderler aylık nakit akışını zorlayabilir.'
        : 'Aidat bandı genel olarak yönetilebilir görünüyor.',
      'Site yönetim planı, ortak alan giderleri ve yıllık masrafları yazılı teyit edin.'
    )
  ];
}

export function buildTotalCostView(state = {}, metrics = {}) {
  const o = metrics.ownership || {};
  const homePrice = safeNumber(o.homePrice) || safeNumber(state.totalBudget);
  const down = safeNumber(o.downPayment) || safeNumber(state.downPayment);
  const loanNeed = safeNumber(o.principal) || Math.max(homePrice - down, 0);
  const monthly = safeNumber(o.monthlyPayment);
  const titleFees = safeNumber(o.titleFees) || Math.round(homePrice * 0.045);
  const duesMonthly =
    safeNumber(state.dues) || safeNumber(state.duesExpectation) || safeNumber(o.duesMonthly);
  const yearlyLoad = monthly * 12 + duesMonthly * 12;
  const firstYear = homePrice * 0.02 + titleFees + yearlyLoad + down * 0.05;

  const isEstimate = !safeNumber(state.totalBudget) || !safeNumber(o.homePrice);

  return {
    isEstimate,
    estimateNote: isEstimate ? 'Tahmini model — kesin teklif değildir.' : '',
    downPayment: down,
    loanNeed,
    monthlyPayment: monthly,
    titleFees,
    duesMonthly,
    yearlyLoad,
    firstYearTotal: Math.round(firstYear),
    realTotal: safeNumber(o.realTotal) || homePrice
  };
}

function buildStrengths(state = {}, metrics = {}) {
  const items = [];
  if (metrics.budgetFit >= 70) items.push(`Bütçe uyumu güçlü (${metrics.budgetFit}/100).`);
  if (metrics.locationFit >= 70) items.push(`Lokasyon tercihleri ile uyum (${metrics.locationFit}/100).`);
  if (metrics.downPaymentStrength >= 65) items.push(`Peşinat gücü destekleyici (${metrics.downPaymentStrength}/100).`);
  if (state.purchasePurpose?.includes('Yatırım') && metrics.investmentPotential >= 65) {
    items.push(`Yatırım potansiyeli profilinize uygun (${metrics.investmentPotential}/100).`);
  }
  if (state.homeType) items.push(`${state.homeType} tipi kullanım amacınızla eşleşiyor.`);
  if (items.length < 3) {
    items.push('Finansman tercihiniz netleştirilmiş; senaryo analizi yapılabilir.');
    items.push('Risk tercihleriniz modele yansıtıldı.');
  }
  return items.slice(0, 5);
}

function buildWeaknesses(attention = [], metrics = {}) {
  const items = [...(attention || [])];
  if (metrics.dti > 40 && !items.some((x) => /gelir|ödeme/i.test(x))) {
    items.push('Aylık ödeme yükü gelir/kapasiteye göre yüksek kalabilir.');
  }
  if (metrics.earthquakeRiskScore > 55) {
    items.push('Deprem/zemin riski için ek teknik kontrol önerilir.');
  }
  if (!items.length) items.push('Tapu, iskan ve ekspertiz evrakları henüz doğrulanmadı.');
  return items.slice(0, 5);
}

export function buildAlternatives(scenarios = []) {
  const fromScenarios = (scenarios || []).slice(0, 3).map((s) => ({
    title: s.title,
    description: [s.monthlyEffect, s.riskEffect, s.totalEffect].filter(Boolean).join(' · '),
    meta: s.score ? `${s.score}/100` : ''
  }));

  if (fromScenarios.length >= 3) return fromScenarios;

  const defaults = [
    {
      title: 'Daha düşük bütçeli alternatif',
      description: 'Toplam maliyeti düşürerek likidite riskini azaltır; alan veya lokasyon ödünü olabilir.',
      meta: 'Bütçe odaklı'
    },
    {
      title: 'Daha güvenli lokasyon/segment alternatifi',
      description: 'Deprem ve ulaşım riskini düşürmeye odaklanır; fiyat bandı değişebilir.',
      meta: 'Risk odaklı'
    },
    {
      title: 'Daha düşük kredi riski alternatifi',
      description: 'Peşinatı artırarak aylık yükü ve borç/gelir baskısını düşürür.',
      meta: 'Finansman odaklı'
    }
  ];

  return [...fromScenarios, ...defaults].slice(0, 3);
}

function normalizeAlternatives(alternatives = [], scenarios = []) {
  return (alternatives || []).map((alt, index) => {
    const scenario = scenarios[index] || {};
    const fromEffects = [scenario.monthlyEffect, scenario.riskEffect, scenario.totalEffect]
      .filter(Boolean)
      .join(' · ');
    const description =
      String(alt.description || '').trim() ||
      fromEffects ||
      'Alternatif senaryo — profilinize göre değerlendirin.';
    return {
      ...alt,
      description,
      meta: alt.meta || (scenario.score != null ? `${scenario.score}/100` : alt.meta || '')
    };
  });
}

export function renderKonutWarningsHtml(warnings = [], esc = escapeHtml) {
  const items = (warnings || []).filter(Boolean);
  if (!items.length) return '';
  return `
    <section class="konut-v2-warnings" aria-label="Risk uyarıları">
      <h3>Risk Uyarıları</h3>
      <ul class="konut-v2-warnings__list">
        ${items.map((w) => `<li>${esc(w)}</li>`).join('')}
      </ul>
    </section>`;
}

/**
 * Partner CTA metni — satın alma profilinde fırsat, diğerlerinde danışman/partner.
 */
export function resolveKonutPartnerCtaLabel(state = {}) {
  const purpose = String(state.purchasePurpose || '');
  if (purpose.includes('Yatırım') || purpose.includes('Kiralamak')) {
    return 'Danışman/partner teklifi al';
  }
  return 'Bana uygun konut fırsatlarını göster';
}

/**
 * V2 sonuç aksiyon çubuğu (legacy .housing-result-actions karşılığı).
 */
export function renderKonutActionsBarHtml({ userId = null, state = {}, esc = escapeHtml } = {}) {
  const partnerLabel = resolveKonutPartnerCtaLabel(state);
  const loginHint = userId
    ? ''
    : `<p class="konut-v2-login-hint"><a href="/profil/?returnTo=/konut/">Giriş yapın</a> — raporunuzu profilinizde saklayın.</p>`;

  return `
    <div class="konut-v2-actions" aria-label="Sonuç aksiyonları">
      <button type="button" class="btn secondary konut-v2-pdf" data-konut-v2-pdf>
        PDF olarak kaydet
      </button>
      <button type="button" class="btn secondary konut-v2-restart" data-konut-v2-restart>
        Tekrar analiz yap
      </button>
      <button type="button" class="btn secondary konut-v2-partner" data-konut-v2-partner>
        ${esc(partnerLabel)}
      </button>
      ${loginHint}
      <p class="konut-v2-action-feedback" data-konut-v2-action-feedback hidden></p>
      <p class="konut-v2-pdf-hint" data-konut-v2-pdf-hint hidden></p>
    </div>`;
}

function buildNextSteps(state = {}, metrics = {}, riskAnalysis = []) {
  const highRisks = riskAnalysis.filter((r) => r.level === 'yüksek').map((r) => r.key);
  const steps = [
    'Ekspertiz kontrolü planlayın (yapısal durum, nem, tesisat).',
    'Tapu ve iskan durumunu resmi evrakla doğrulayın.',
    'Kredi ön onayı için 2–3 kurumdan karşılaştırmalı teklif alın.',
    'Bölge fiyat karşılaştırması yapın (en az 3 emsal).',
    'Aidat, site giderleri ve yıllık bakım kalemlerini yazılı teyit edin.',
    'Pazarlık aralığını belirleyin (bütçe bandının %3–7 altı hedef).'
  ];
  if (highRisks.includes('location')) {
    steps.unshift('Seçilen il/ilçe için zemin ve deprem raporunu kontrol edin.');
  }
  if (state.purchasePurpose?.includes('Kiralamak')) {
    return [
      'Kira sözleşmesi ve yıllık toplam yaşam maliyetini karşılaştırın.',
      'Depozito ve aidat kalemlerini netleştirin.',
      'Bölge kira trendini 3 benzer daire ile doğrulayın.'
    ];
  }
  return steps.slice(0, 6);
}

/**
 * Tam result payload (PDF ve ileride API için).
 */
export function buildKonutResultsV2Payload({
  state = {},
  metrics = {},
  scenarios = [],
  attention = [],
  evdsRates = null
}) {
  const intel = buildDecisionIntelligenceResult('konut', state, metrics, {
    scenarios,
    attention
  });
  const evdsRiskLayer = buildEvdsRiskLayer('konut', evdsRates || {});
  const decisionScore = intel.decisionScore;
  const confidenceScore = intel.confidenceScore;
  const riskAnalysis = intel.riskAnalysis;
  const totalCost = buildTotalCostView(state, metrics);
  const strengths = buildStrengths(state, metrics);
  const weaknesses = buildWeaknesses(attention, metrics);
  const alternatives = normalizeAlternatives(
    intel.alternatives.length ? intel.alternatives : buildAlternatives(scenarios),
    scenarios
  );
  const nextSteps = intel.nextSteps;
  const overallRisk = intel.overallRisk;

  const locationLabel = [state.city, state.district].filter(Boolean).join(' / ') || 'Seçilen bölge';
  const budgetLabel = safeNumber(state.totalBudget)
    ? formatTryAmount(state.totalBudget)
    : 'Belirtilmedi';

  const { planTier } = getResultsPlanContext();
  const insightInput = buildInsightInputFromIntelligence('konut', intel.context || {}, intel, {
    planTier,
    strengths,
    weaknesses,
    marketAssessment: buildEvdsAiMarketSentence(evdsRiskLayer),
    costs: {
      budget: state.totalBudget,
      monthlyPayment: totalCost.monthlyPayment,
      duesMonthly: totalCost.duesMonthly,
      dti: metrics.dti
    }
  });

  const pdfReportData = buildPdfReportData({
    category: 'konut',
    planTier,
    location: locationLabel,
    decisionScore,
    scoreLabel: intel.scoreLabel,
    confidenceScore,
    overallRisk,
    totalCost,
    riskAnalysis,
    strengths,
    weaknesses,
    alternatives,
    nextSteps,
    scoreFactors: intel.scoreFactors,
    warnings: intel.warnings,
    recommendationLevel: intel.recommendationLevel,
    profile: {
      purpose: state.purchasePurpose,
      homeType: state.homeType,
      roomCount: state.roomCount,
      financing: state.useFinancing
    }
  });

  return {
    decisionScore,
    scoreLabel: intel.scoreLabel,
    confidenceScore,
    overallRisk,
    riskTone: riskLevelToTone(overallRisk),
    riskAnalysis,
    totalCost,
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
    locationLabel,
    budgetLabel,
    homeType: state.homeType || '—',
    purpose: state.purchasePurpose || '—',
    primaryTitle: `${state.homeType || 'Konut'} · ${locationLabel}`,
    primaryImageUrl: '/assets/images/demo/kadikoy-daire.svg',
    planTier,
    insightInput,
    insight: buildDecisionInsight(insightInput),
    evdsRiskLayer
  };
}

function isKonutRentalPurpose(purpose = '') {
  return String(purpose || '').includes('Kiralamak');
}

function renderKonutResultsV2Html(model) {
  const esc = escapeHtml;
  const cost = model.totalCost || {};
  const costNote = cost.isEstimate
    ? `<p class="konut-v2-estimate-note">${esc(cost.estimateNote || 'Tahmini model')}</p>`
    : '';
  const isRental = isKonutRentalPurpose(model.purpose);

  const heroHtml = renderResultsHeroLayout({
    vertical: 'housing',
    title: isRental ? 'Konut Kiralama Öneriniz' : 'Konut Alım Öneriniz',
    subtitle: isRental
      ? 'Profilinize göre en uygun kiralama senaryosu belirlendi.'
      : 'Profilinize göre en uygun konut senaryosu belirlendi.',
    recommendation: {
      kicker: isRental ? 'Önerilen Kiralık' : 'Önerilen Konut',
      title: model.primaryTitle || `${model.homeType || 'Konut'} · ${model.locationLabel || 'Seçilen bölge'}`,
      subtitle: model.purpose !== '—' ? model.purpose : '',
      badge: model.recommendationLabel || 'En Uygun',
      badgeTone: 'success',
      imageUrl: model.primaryImageUrl || '/assets/images/demo/kadikoy-daire.svg',
      imageAlt: model.primaryTitle || 'Konut önerisi'
    },
    specs: isRental
      ? [
          { label: 'Aylık kira bütçesi', value: model.budgetLabel || '—' },
          { label: 'Konut tipi', value: model.homeType || '—' },
          { label: 'Lokasyon', value: model.locationLabel || '—' },
          { label: 'Aidat (aylık tahmini)', value: formatTryAmount(cost.duesMonthly) },
          { label: 'İlk yıl toplam yük', value: formatTryAmount(cost.yearlyLoad) },
          { label: 'Genel risk', value: model.overallRisk || '—' }
        ]
      : [
          { label: 'Bütçe', value: model.budgetLabel || '—' },
          { label: 'Aylık ödeme', value: formatTryAmount(cost.monthlyPayment) },
          { label: 'Peşinat', value: formatTryAmount(cost.downPayment) },
          { label: 'Kredi ihtiyacı', value: formatTryAmount(cost.loanNeed) },
          { label: 'İlk yıl toplam', value: formatTryAmount(cost.firstYearTotal) },
          { label: 'Genel risk', value: model.overallRisk || '—' }
        ],
    score: model.decisionScore,
    scoreLabel: model.scoreLabel || 'Uygunluk Skoru',
    scoreTone: scoreToneFromLabel(model.scoreLabel),
    evdsMountClass: 'konut-v2-evds-mount ib-results-economic--home'
  });

  const heroBadgesHtml = `
    <div class="konut-v2-hero-badges" aria-label="Skor özeti">
      <span class="konut-v2-hero-badge konut-v2-hero-badge--score">
        Karar Skoru <strong>${esc(String(model.decisionScore))}/100</strong>
      </span>
      <span class="konut-v2-hero-badge konut-v2-hero-badge--confidence">
        Güven <strong>${esc(String(model.confidenceScore))}/100</strong>
      </span>
    </div>`;

  return `
    <section class="konut-v2-panel" aria-label="Konut karar raporu özeti">
      <div class="konut-v2-hero-wrap">
        ${heroHtml}
        ${heroBadgesHtml}
      </div>

      ${renderKonutWarningsHtml(model.warnings, esc)}

      <div id="ib-results-detail"></div>

      ${
        model.scoreFactors?.length
          ? `<details class="konut-v2-factors-details">
        <summary>Skor faktörleri (açıklanabilir analiz)</summary>
        ${renderScoreFactorsHtml(model.scoreFactors, 'konut-v2')}
      </details>`
          : ''
      }

      <div class="konut-v2-kpis konut-v2-kpis--secondary">
        <article class="konut-v2-kpi konut-v2-kpi--confidence">
          <span>Güven Skoru</span>
          <strong>${esc(String(model.confidenceScore))}<small>/100</small></strong>
          <div class="konut-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.confidenceScore))}%"></span></div>
        </article>
        <article class="konut-v2-kpi konut-v2-kpi--risk">
          <span>Genel Risk</span>
          <strong><span class="konut-v2-risk konut-v2-risk--${esc(model.riskTone)}">${esc(model.overallRisk)}</span></strong>
        </article>
        <article class="konut-v2-kpi konut-v2-kpi--cost">
          <span>İlk yıl toplam (tahmini)</span>
          <strong>${esc(formatTryAmount(cost.firstYearTotal))}</strong>
          <small>12 ay yük: ${esc(formatTryAmount(cost.yearlyLoad))}</small>
        </article>
      </div>

      ${costNote}

      <section class="konut-v2-cost-grid" aria-label="Toplam maliyet görünümü">
        <h3>Toplam Maliyet Görünümü</h3>
        <dl class="konut-v2-cost-dl">
          <div><dt>Peşinat</dt><dd>${esc(formatTryAmount(cost.downPayment))}</dd></div>
          <div><dt>Kredi ihtiyacı</dt><dd>${esc(formatTryAmount(cost.loanNeed))}</dd></div>
          <div><dt>Aylık ödeme (tahmini)</dt><dd>${esc(formatTryAmount(cost.monthlyPayment))}</dd></div>
          <div><dt>Tapu/masraf (tahmini)</dt><dd>${esc(formatTryAmount(cost.titleFees))}</dd></div>
          <div><dt>Aidat (aylık tahmini)</dt><dd>${esc(formatTryAmount(cost.duesMonthly))}</dd></div>
          <div><dt>12 aylık toplam yük</dt><dd>${esc(formatTryAmount(cost.yearlyLoad))}</dd></div>
          <div><dt>İlk yıl toplam maliyet</dt><dd>${esc(formatTryAmount(cost.firstYearTotal))}</dd></div>
          <div><dt>Gerçek toplam (model)</dt><dd>${esc(formatTryAmount(cost.realTotal))}</dd></div>
        </dl>
      </section>

      ${renderRiskAnalysisHtml(model.riskAnalysis, 'konut-v2')}

      <div class="konut-v2-grid">
        <article class="konut-v2-block konut-v2-block--pros">
          <h3>Güçlü Yönler</h3>
          <ul>${model.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
        <article class="konut-v2-block konut-v2-block--cons">
          <h3>Zayıf Yönler</h3>
          <ul>${model.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
      </div>

      <section class="konut-v2-alts" aria-label="Alternatifler">
        <h3>Alternatifler</h3>
        <div class="konut-v2-alt-grid">
          ${model.alternatives
            .map(
              (a) => `
            <article class="konut-v2-alt-card">
              <h4>${esc(a.title)}</h4>
              <p>${esc(a.description)}</p>
              ${a.meta ? `<span class="konut-v2-alt-meta">${esc(a.meta)}</span>` : ''}
            </article>`
            )
            .join('')}
        </div>
      </section>

      <article class="konut-v2-block konut-v2-block--exec" data-konut-v2-insight-root>
        <h3>Yapay zeka karar yorumu</h3>
        <p class="konut-v2-exec-text" data-konut-v2-exec-text>${esc(model.executiveSummary || 'Yorum hazırlanıyor…')}</p>
        ${renderInsightBlocksHtml(model.insight, esc, {
          planTier: model.planTier,
          insightInput: model.insightInput
        })}
        <p class="konut-v2-exec-hint" data-konut-v2-source>${esc(model.summarySourceLabel || '')}</p>
      </article>

      <article class="konut-v2-block konut-v2-block--next">
        <h3>Sonraki Adımlar</h3>
        <ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </article>

      ${renderKonutActionsBarHtml({ userId: model.userId, state: model.state || {}, esc })}
    </section>`;
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.mountNode
 * @param {object} opts.state
 * @param {object} opts.metrics
 * @param {Array} [opts.scenarios]
 * @param {string[]} [opts.attention]
 * @param {Function} [opts.track]
 * @param {string|null} [opts.userId]
 * @param {Function} [opts.onRestart]
 * @param {Function} [opts.onPartnerCta]
 */
export async function mountKonutResultsV2({
  mountNode,
  state,
  metrics,
  scenarios = [],
  attention = [],
  track,
  userId = null,
  onRestart,
  onPartnerCta
}) {
  if (!mountNode || !metrics) return null;

  mountNode.querySelector('.konut-v2-root')?.remove();

  const evdsSnapshot = await fetchEvdsRatesForEngine();
  const payload = buildKonutResultsV2Payload({
    state,
    metrics,
    scenarios,
    attention,
    evdsRates: evdsSnapshot?.rates || null
  });
  const model = {
    ...payload,
    state,
    userId,
    executiveSummary: '',
    summarySourceLabel: 'Kaynak: hazırlanıyor'
  };

  const root = document.createElement('div');
  root.className = 'konut-v2-root';
  root.innerHTML = renderKonutResultsV2Html(model);
  mountNode.prepend(root);
  await hydrateResultsEconomicIndicators(root, 'konut');
  mountEvdsRiskLayer(root, model.evdsRiskLayer);
  const afadLayer = await hydrateKonutAfadRiskLayer(root, state);
  await hydrateKonutTuikReferenceLayer(root, state);

  safeTrackEvent(track, 'decision_result_v2_view', {
    category: 'konut',
    score: model.decisionScore,
    confidence: model.confidenceScore,
    risk: model.overallRisk
  });

  const pdfBtn = root.querySelector('[data-konut-v2-pdf]');
  const pdfHint = root.querySelector('[data-konut-v2-pdf-hint]');
  const restartBtn = root.querySelector('[data-konut-v2-restart]');
  const partnerBtn = root.querySelector('[data-konut-v2-partner]');
  const actionFeedback = root.querySelector('[data-konut-v2-action-feedback]');

  pdfBtn?.addEventListener('click', () => {
    safeTrackEvent(track, 'decision_report_print_click', {
      category: 'konut',
      score: model.decisionScore
    });

    if (pdfHint) {
      pdfHint.hidden = false;
      pdfHint.textContent =
        'Rapor penceresi açıldı. Yazdır diyalogunda “PDF olarak kaydet” seçeneğini kullanabilirsiniz.';
    }
    if (actionFeedback) actionFeedback.hidden = true;
    gatePdfDownload(model.pdfReportData);
  });

  restartBtn?.addEventListener('click', () => {
    if (typeof onRestart === 'function') {
      onRestart();
      return;
    }
    document.getElementById('housing-restart')?.click();
  });

  partnerBtn?.addEventListener('click', async () => {
    if (typeof onPartnerCta === 'function') {
      await onPartnerCta(actionFeedback);
      return;
    }
    document.getElementById('housing-partner-cta')?.click();
  });

  try {
    const summary = await withTimeout(
      fetchExecutiveSummaryV3(
        'konut',
        buildKonutExecutiveSummaryContext(model.intelligence?.context || {}, afadLayer),
        model.intelligence || {
          decisionScore: model.decisionScore,
          confidenceScore: model.confidenceScore,
          scoreFactors: model.scoreFactors,
          riskAnalysis: model.riskAnalysis,
          recommendationLevel: model.recommendationLevel,
          recommendationLabel: model.recommendationLabel,
          overallRisk: model.overallRisk,
          warnings: model.warnings
        },
        {
          planTier: model.planTier,
          strengths: model.strengths,
          weaknesses: model.weaknesses,
          marketAssessment: buildEvdsAiMarketSentence(model.evdsRiskLayer),
          costs: model.totalCost,
          timeoutMs: KONUT_SUMMARY_TIMEOUT_MS
        }
      ),
      KONUT_SUMMARY_TIMEOUT_MS,
      null
    );

    if (!summary) {
      markInsightSummaryUnavailable(root.querySelector('[data-konut-v2-insight-root]'), {
        execTextSelector: '[data-konut-v2-exec-text]',
        sourceSelector: '[data-konut-v2-source]',
        forceExecText: true
      });
      return model;
    }

    if (summary.insight) {
      model.insight = summary.insight;
      hydrateInsightBlocks(root.querySelector('[data-konut-v2-insight-root]'), summary.insight);
    }
    const execTextEl = root.querySelector('[data-konut-v2-exec-text]');
    if (execTextEl && summary.text) {
      execTextEl.textContent = summary.text;
    }
    const sourceEl = root.querySelector('[data-konut-v2-source]');
    if (sourceEl) {
      sourceEl.textContent =
        summary.source === 'ai' ? 'Kaynak: AI destekli yorum' : 'Kaynak: Kural tabanlı karar yorumu';
    }
    model.executiveSummary = summary.text;
    model.pdfReportData.executiveSummary = summary.text;
    if (summary.insight) model.pdfReportData.insightBlocks = summary.insight;
  } catch (error) {
    console.warn('konut-v2-summary-hydrate-failed', error);
  }

  void import('../../decision/decision-v3-mount.js')
    .then(({ mountDecisionEngineV3Overlay }) =>
      mountDecisionEngineV3Overlay(mountNode, {
        category: 'konut',
        formData: state,
        metrics,
        extras: {
          totalCost:
            model.totalCost?.firstYearTotal ??
            model.totalCost?.realTotal ??
            metrics.totalCost ??
            null,
          title: 'Konut Kararı'
        }
      })
    )
    .catch(() => {});

  void import('../../decision/decision-os-mount.js')
    .then(({ mountDecisionOsOverlay }) =>
      mountDecisionOsOverlay(mountNode, {
        category: 'konut',
        formData: state,
        metrics,
        intelligence: model.intelligence,
        model,
        extras: {
          totalCost:
            model.totalCost?.firstYearTotal ??
            model.totalCost?.realTotal ??
            metrics.totalCost ??
            null,
          title: 'Konut Kararı',
          strengths: model.strengths,
          cautions: model.weaknesses,
          alternatives: model.alternatives,
          insight: model.insight,
          executiveSummary: model.executiveSummary,
          evdsRiskLayer: model.evdsRiskLayer
        }
      })
    )
    .catch(() => {});

  return model;
}
