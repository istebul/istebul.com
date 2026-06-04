/**
 * Tatil Decision Results V2 — Konut/Finansman V2 ile aynı premium dil.
 */
import { escapeHtml } from '../../core/security.js';
import { STEP_OPTIONS } from '../../tatil/tatil-config.js';
import { baseScore as tatilBaseScore } from '../../tatil/tatil-engine.js';
import { formatTry } from '../../tatil/tatil-utils.js';
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
  renderScoreFactorsHtml
} from '../results/decision-intelligence-engine.js';
import {
  renderResultsHeroLayout,
  scoreToneFromLabel
} from '../results/results-hero-layout.js';
import { hydrateResultsEconomicIndicators } from '../results/results-economic-indicators.js';

const PLAN_MID = {
  ekonomik: 40_000,
  dengeli: 100_000,
  premium: 200_000,
  ultra: 390_000
};

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
  return STEP_OPTIONS[mapKey]?.find((o) => o.value === value)?.label || value || '';
}

function budgetTarget(state) {
  if (state.budget_range === 'manuel') {
    return safeNumber(state.budget_total || state.budget_manual || state.budget_per_person);
  }
  return PLAN_MID[state.budget_range] || 100_000;
}

function travelersCount(state) {
  const n = safeNumber(state.travelers_count);
  if (n > 0) return n;
  if (state.people_type === 'cocuklu-aile') return 4;
  if (state.people_type === 'cift') return 2;
  if (state.people_type === 'tek') return 1;
  return 2;
}

function lineAmount(lines, key) {
  const row = (lines || []).find((l) => l.key === key);
  return safeNumber(row?.value);
}

function riskToleranceProxy(state) {
  if (state.date_flexibility === 'undecided') return 'agresif';
  if (state.comfort_expectation === 'luks' || state.budget_range === 'ultra') return 'agresif';
  if (state.date_flexibility === 'net' && state.comfort_expectation === 'temel') return 'muhafazakar';
  return 'dengeli';
}

export function decisionScoreLabel(score) {
  return resolveScoreLabel(score, 'tatil');
}

function overallRiskFromAnalysis(riskAnalysis) {
  const highs = riskAnalysis.filter((r) => r.level === 'yüksek').length;
  if (highs >= 2) return 'Yüksek';
  if (highs === 1 || riskAnalysis.some((r) => r.level === 'orta')) return 'Orta';
  return 'Düşük';
}

export function computeConfidenceScore(state = {}) {
  return buildDecisionIntelligenceResult('tatil', state, {}).confidenceScore;
}

function computeConfidenceScoreLegacy(state = {}) {
  return buildConfidenceScore(state, [
    { ok: Boolean(state.budget_range) || safeNumber(state.budget_manual) > 0, weight: 14 },
    { ok: Boolean(state.people_type) || safeNumber(state.travelers_count) > 0, weight: 12 },
    {
      ok: Boolean(state.date_start && state.date_end) || Boolean(state.date_period_note),
      weight: 12
    },
    { ok: Boolean(state.vacation_type || state.vacation_goal), weight: 12 },
    { ok: Boolean(state.transport_preference), weight: 10 },
    { ok: Boolean(state.comfort_expectation), weight: 10 },
    {
      ok:
        state.people_type !== 'cocuklu-aile' ||
        (safeNumber(state.children_count) > 0 || Boolean(state.children_ages)),
      weight: 10
    },
    { ok: (state.expectations?.length || 0) >= 1, weight: 8 },
    { ok: Boolean(state.date_flexibility), weight: 8 },
    { ok: Boolean(state.user_note), weight: 4 }
  ]);
}

export function computeDecisionScore(state = {}, primaryResult = null) {
  return buildDecisionIntelligenceResult('tatil', state, {}, { primaryResult }).decisionScore;
}

function computeDecisionScoreLegacy(state = {}, primaryResult = null) {
  const target = budgetTarget(state);
  const realTotal = safeNumber(primaryResult?.costs?.realTotal) || target * 1.05;
  const budgetFit =
    target > 0 ? clamp(100 - Math.abs(realTotal - target) / target * 85, 18, 98) : 62;

  const peopleFit =
    state.people_type === 'cocuklu-aile' && ['cocuk-dostu', 'deniz-resort'].includes(state.vacation_type)
      ? 88
      : state.people_type
        ? 76
        : 58;

  const dateFit =
    state.date_flexibility === 'net' && state.date_start
      ? 84
      : state.date_flexibility === 'undecided'
        ? 58
        : 72;

  const comfortFit =
    state.comfort_expectation === 'luks' && ['premium', 'ultra'].includes(state.budget_range)
      ? 86
      : state.comfort_expectation === 'temel' && state.budget_range === 'ekonomik'
        ? 82
        : 74;

  const transportFit =
    state.transport_preference === 'ucak' && state.vacation_goal === 'yurtdisi'
      ? 70
      : state.transport_preference
        ? 78
        : 60;

  const flexFit =
    state.date_flexibility === '1-week' || state.date_flexibility === '1-2-days' ? 80 : 70;

  const riskTol = riskToleranceProxy(state);
  const riskFit =
    riskTol === 'muhafazakar' ? 86 : riskTol === 'agresif' ? 64 : 75;

  const nights = safeNumber(state.trip_nights);
  const nightsFit = nights >= 5 && nights <= 14 ? 80 : nights > 0 ? 72 : 65;

  const blended = Math.round(
    budgetFit * 0.22 +
      peopleFit * 0.16 +
      dateFit * 0.14 +
      comfortFit * 0.12 +
      transportFit * 0.1 +
      flexFit * 0.08 +
      riskFit * 0.1 +
      nightsFit * 0.08
  );

  const legacy = safeNumber(primaryResult?.score) || tatilBaseScore(state);
  return clampScore(Math.round(blended * 0.55 + legacy * 0.45));
}

export function buildTotalCostView(state = {}, primaryResult = null) {
  const lines = primaryResult?.costs?.lines || [];
  const travelers = travelersCount(state);
  const accommodation = lineAmount(lines, 'accommodation') || Math.round(budgetTarget(state) * 0.38);
  const transport =
    lineAmount(lines, 'transport') + lineAmount(lines, 'transfer') ||
    Math.round(budgetTarget(state) * 0.27);
  const food = lineAmount(lines, 'food') || Math.round(budgetTarget(state) * 0.14);
  const activities =
    lineAmount(lines, 'extras') + lineAmount(lines, 'children') ||
    Math.round(budgetTarget(state) * 0.12);
  const realTotal =
    safeNumber(primaryResult?.costs?.realTotal) || accommodation + transport + food + activities;
  const reserve = Math.round(realTotal * 0.12);
  const totalBudget = realTotal + reserve;
  const perPerson = Math.round(totalBudget / Math.max(travelers, 1));
  const target = budgetTarget(state);
  const budgetFitPct = target > 0 ? Math.round((totalBudget / target) * 100) : null;

  const isEstimate =
    !state.budget_range ||
    (!state.date_start && !state.date_period_note) ||
    !state.transport_preference ||
    !primaryResult?.costs;

  return {
    isEstimate,
    estimateNote: isEstimate
      ? 'Tahmini model — partner teklifi ve güncel fiyatlarla doğrulanmalıdır.'
      : '',
    accommodation,
    transport,
    food,
    activities,
    reserve,
    perPerson,
    totalBudget,
    budgetFitPct,
    travelers,
    nights: safeNumber(state.trip_nights) || primaryResult?.costs?.nights || null
  };
}

export function buildRiskAnalysis(state = {}, primaryResult = null) {
  return buildDecisionIntelligenceResult('tatil', state, {}, { primaryResult }).riskAnalysis;
}

function buildRiskAnalysisLegacy(state = {}, primaryResult = null) {
  const cost = buildTotalCostView(state, primaryResult);
  const target = budgetTarget(state);
  const overBudget = target > 0 && cost.totalBudget > target * 1.12;

  const budgetLevel = overBudget ? 'yüksek' : cost.budgetFitPct && cost.budgetFitPct > 105 ? 'orta' : 'düşük';

  const seasonLevel =
    state.date_flexibility === 'undecided'
      ? 'yüksek'
      : state.date_flexibility === 'net' && state.date_start
        ? 'düşük'
        : 'orta';

  const childLevel =
    state.people_type === 'cocuklu-aile' &&
    !['cocuk-dostu', 'deniz-resort'].includes(state.vacation_type || '')
      ? 'yüksek'
      : state.people_type === 'cocuklu-aile'
        ? 'düşük'
        : 'orta';

  const transportLevel =
    state.transport_preference === 'ucak' && !state.date_start
      ? 'yüksek'
      : state.transport_preference === 'otobus'
        ? 'düşük'
        : 'orta';

  const comfortLevel =
    state.comfort_expectation === 'luks' && ['ekonomik', 'dengeli'].includes(state.budget_range)
      ? 'yüksek'
      : state.comfort_expectation === 'temel'
        ? 'düşük'
        : 'orta';

  const cancelLevel =
    state.date_flexibility === 'undecided'
      ? 'yüksek'
      : state.date_flexibility === 'net'
        ? 'düşük'
        : 'orta';

  return [
    buildRiskItem(
      'budget',
      'Bütçe aşımı riski',
      budgetLevel,
      overBudget
        ? 'Toplam tatil bütçesi (rezerv dahil) hedef bandınızı aşabilir.'
        : 'Bütçe bandı ile model uyumlu görünüyor.',
      'Toplam bütçeye %10–15 rezerv ekleyin; kampanya fiyatlarını ayrı satırda takip edin.'
    ),
    buildRiskItem(
      'season',
      'Tarih/sezon riski',
      seasonLevel,
      seasonLevel === 'yüksek'
        ? 'Tarih net değil; yoğun sezon ve fiyat dalgalanması riski yüksek.'
        : 'Tarih profiliniz sezon riskini sınırlıyor.',
      'Tarih ve sezon yoğunluğunu kontrol edin; esnek günlerde alternatif dönem arayın.'
    ),
    buildRiskItem(
      'family',
      'Çocuklu aile uygunluğu riski',
      childLevel,
      childLevel === 'yüksek'
        ? 'Çocuklu aile profili ile seçilen tatil tipi tam örtüşmüyor olabilir.'
        : 'Aile profili ile konaklama/aktivite uyumu iyi görünüyor.',
      'Çocuklu aile için uygunluk, oda tipi ve aktivite programını doğrulayın.'
    ),
    buildRiskItem(
      'transport',
      'Ulaşım riski',
      transportLevel,
      transportLevel === 'yüksek'
        ? 'Uçuş tercihi var ancak tarih/rota net değil; maliyet oynaklığı artabilir.'
        : 'Ulaşım tercihi profilinizle uyumlu modelleniyor.',
      'Ulaşım alternatiflerini (uçuş, transfer, araç) yan yana maliyetlendirin.'
    ),
    buildRiskItem(
      'lodging',
      'Konaklama kalitesi riski',
      comfortLevel,
      comfortLevel === 'yüksek'
        ? 'Konfor beklentisi bütçe bandının üzerinde; kalite/fiyat dengesi zorlanabilir.'
        : 'Konaklama konforu ile bütçe dengeli görünüyor.',
      'Konaklama yorumlarını ve oda tipini karşılaştırın.'
    ),
    buildRiskItem(
      'cancel',
      'İptal/esneklik riski',
      cancelLevel,
      cancelLevel === 'yüksek'
        ? 'Tarih esnekliği düşük veya belirsiz; iptal/erteleme maliyeti artabilir.'
        : 'Esneklik profiliniz plan revizyonuna izin veriyor.',
      'İptal koşullarını, iade sürelerini ve sigorta seçeneklerini inceleyin.'
    )
  ];
}

function buildStrengths(state, primary, cost) {
  const items = [];
  if (cost.budgetFitPct && cost.budgetFitPct <= 105) {
    items.push('Toplam tatil bütçesi hedef bandınızla uyumlu modelleniyor.');
  }
  if (state.date_flexibility === 'net' && state.date_start) {
    items.push('Net tarih profili sezon ve fiyat planlamasını kolaylaştırır.');
  }
  if (state.people_type === 'cocuklu-aile' && state.children_ages) {
    items.push(`Çocuk yaş profili (${state.children_ages}) planlamaya dahil edildi.`);
  }
  if (state.expectations?.length >= 3) {
    items.push('Beklentileriniz net; konaklama ve rota seçimi daha isabetli olabilir.');
  }
  if (state.comfort_expectation === 'dengeli' || state.comfort_expectation === 'premium') {
    items.push('Konfor beklentisi bütçe bandıyla dengeli görünüyor.');
  }
  if (primary?.pros?.length) {
    items.push(primary.pros[0]);
  }
  if (items.length < 3) {
    items.push(`${optionLabel('goal', state.vacation_goal) || 'Tatil'} hedefi için yapılandırılmış senaryo.`);
    items.push('Alternatif rota ve tarih senaryoları karşılaştırmaya hazır.');
  }
  return items.slice(0, 5);
}

function buildWeaknesses(state, primary, cost) {
  const items = [];
  if (cost.isEstimate) items.push('Bazı kalemler tahmini model ile hesaplandı; partner teklifi şart.');
  if (cost.budgetFitPct && cost.budgetFitPct > 110) {
    items.push(`Toplam bütçe hedefin yaklaşık %${cost.budgetFitPct} seviyesinde — revizyon gerekebilir.`);
  }
  if (state.date_flexibility === 'undecided') {
    items.push('Tarih belirsizliği sezon riskini ve iptal maliyetini artırır.');
  }
  (primary?.cautions || []).slice(0, 2).forEach((c) => items.push(c));
  if (!state.transport_preference) {
    items.push('Ulaşım tercihi eksik; maliyet modeli varsayılan senaryoya dayanıyor.');
  }
  if (!items.length) items.push('Kampanya ve doluluk fiyatları sezona göre değişebilir.');
  return items.slice(0, 5);
}

export function buildAlternatives(state = {}, results = []) {
  const cost = buildTotalCostView(state, results[0]);
  const target = budgetTarget(state);
  const economicTotal = Math.round(cost.totalBudget * 0.82);
  const comfortTotal = Math.round(cost.totalBudget * 1.18);
  const lowRiskNote =
    state.date_flexibility === 'undecided'
      ? 'Net tarih + 1 hafta esneklik'
      : 'Yoğun sezon dışı ±7 gün kaydırma';

  const fromResults = (results || [])
    .slice(1, 3)
    .map((r) => ({
      title: r.title,
      description: r.description || r.why || '',
      meta: `${r.score}/100`
    }));

  const defaults = [
    {
      title: 'Daha ekonomik tatil alternatifi',
      description: `Toplam ~${formatTry(economicTotal)} · konaklama/aktivite sadeleştirme`,
      meta: 'Bütçe baskısını azaltır'
    },
    {
      title: 'Daha konforlu tatil alternatifi',
      description: `Toplam ~${formatTry(comfortTotal)} · premium konaklama + transfer`,
      meta: 'Konfor odaklı'
    },
    {
      title: 'Daha düşük riskli tarih/rota alternatifi',
      description: `${lowRiskNote} · hedef bütçe ~${formatTry(target)}`,
      meta: 'Sezon/iptal riskini düşürür'
    }
  ];

  return [...fromResults, ...defaults].slice(0, 3);
}

function buildNextSteps(state, riskAnalysis) {
  const high = riskAnalysis.filter((r) => r.level === 'yüksek');
  const steps = [
    'Tarih ve sezon yoğunluğunu kontrol edin.',
    'Konaklama yorumlarını ve oda tipini karşılaştırın.',
    'İptal koşullarını ve iade sürelerini inceleyin.',
    'Ulaşım alternatiflerini (uçuş, transfer, araç) maliyetlendirin.',
    'Çocuklu aile için aktivite ve oda uygunluğunu doğrulayın.',
    'Toplam bütçeye %10–15 rezerv payı ekleyin.'
  ];
  if (high.some((r) => r.key === 'budget')) {
    steps.unshift('Önce bütçe bandını revize edin veya konaklama standardını bir kademe düşürün.');
  }
  return steps.slice(0, 6);
}

/**
 * Tam result payload.
 */
export function buildTatilResultsV2Payload({ state = {}, results = [] }) {
  const primary = results[0] || null;
  const cost = buildTotalCostView(state, primary);
  const intel = buildDecisionIntelligenceResult('tatil', state, {}, { primaryResult: primary, results });
  const riskAnalysis = intel.riskAnalysis;
  const decisionScore = intel.decisionScore;
  const confidenceScore = intel.confidenceScore;
  const overallRisk = intel.overallRisk;
  const strengths = buildStrengths(state, primary, cost);
  const weaknesses = buildWeaknesses(state, primary, cost);
  const alternatives = intel.alternatives;
  const nextSteps = intel.nextSteps;
  const criticalRisk = riskAnalysis.find((r) => r.level === 'yüksek')?.title || '';

  const { planTier } = getResultsPlanContext();
  const insightInput = buildInsightInputFromIntelligence('tatil', intel.context || {}, intel, {
    planTier,
    strengths,
    weaknesses,
    costs: { totalBudget: cost.totalBudget, realTotal: cost.realTotal }
  });

  const pdfReportData = buildPdfReportData({
    category: 'tatil',
    planTier,
    goal: optionLabel('goal', state.vacation_goal),
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
      people: optionLabel('people', state.people_type),
      type: optionLabel('type', state.vacation_type),
      transport: optionLabel('transport', state.transport_preference),
      comfort: optionLabel('comfort', state.comfort_expectation),
      flexibility: state.date_flexibility
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
    goalLabel: optionLabel('goal', state.vacation_goal),
    totalLabel: formatTryAmount(cost.totalBudget),
    criticalRisk: riskAnalysis.find((r) => r.level === 'yüksek')?.title || '',
    planTier,
    insightInput,
    insight: buildDecisionInsight(insightInput)
  };
}

function renderTatilResultsV2Html(model) {
  const esc = escapeHtml;
  const cost = model.totalCost || {};
  const estimateNote = cost.isEstimate
    ? `<p class="tatil-v2-estimate-note">${esc(cost.estimateNote)}</p>`
    : '';

  const heroHtml = renderResultsHeroLayout({
    vertical: 'travel',
    title: 'Tatil Planı Öneriniz',
    subtitle: 'Profilinize göre en uygun tatil senaryosu belirlendi.',
    recommendation: {
      kicker: 'Önerilen rota',
      title: model.goalLabel || 'Tatil paketi',
      badge: model.recommendationLabel || 'En uygun',
      badgeTone: 'success'
    },
    specs: [
      { label: 'Toplam bütçe', value: formatTryAmount(cost.totalBudget) },
      { label: 'Kişi başı', value: formatTryAmount(cost.perPerson) },
      { label: 'Konaklama', value: formatTryAmount(cost.accommodation) },
      { label: 'Ulaşım', value: formatTryAmount(cost.transport) },
      { label: 'Aktivite/rezerv', value: formatTryAmount((cost.activities || 0) + (cost.reserve || 0)) },
      { label: 'Genel risk', value: model.overallRisk || '—' }
    ],
    score: model.decisionScore,
    scoreLabel: model.scoreLabel || 'Tatil karar skoru',
    scoreTone: scoreToneFromLabel(model.scoreLabel),
    evdsMountClass: 'tatil-v2-evds-mount ib-results-economic--compact'
  });

  return `
    <section class="tatil-v2-panel" aria-label="Tatil Decision Results V2">
      ${heroHtml}

      <div id="ib-results-detail"></div>

      ${renderScoreFactorsHtml(model.scoreFactors, 'tatil-v2')}

      <div class="tatil-v2-kpis tatil-v2-kpis--secondary">
        <article class="tatil-v2-kpi tatil-v2-kpi--confidence">
          <span>Güven Skoru</span>
          <strong>${esc(String(model.confidenceScore))}<small>/100</small></strong>
          <div class="tatil-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.confidenceScore))}%"></span></div>
        </article>
        <article class="tatil-v2-kpi tatil-v2-kpi--risk">
          <span>Genel Risk</span>
          <strong><span class="tatil-v2-risk tatil-v2-risk--${esc(model.riskTone)}">${esc(model.overallRisk)}</span></strong>
        </article>
        <article class="tatil-v2-kpi tatil-v2-kpi--cost">
          <span>Bütçe uyumu</span>
          <strong>${cost.budgetFitPct != null ? esc(`%${cost.budgetFitPct}`) : '—'}</strong>
          <small>Toplam ${esc(formatTryAmount(cost.totalBudget))}</small>
        </article>
      </div>

      ${estimateNote}

      <section class="tatil-v2-cost-grid" aria-label="Toplam maliyet görünümü">
        <h3>Toplam Maliyet Görünümü</h3>
        <dl class="tatil-v2-cost-dl">
          <div><dt>Konaklama tahmini</dt><dd>${esc(formatTryAmount(cost.accommodation))}</dd></div>
          <div><dt>Ulaşım tahmini</dt><dd>${esc(formatTryAmount(cost.transport))}</dd></div>
          <div><dt>Yeme-içme tahmini</dt><dd>${esc(formatTryAmount(cost.food))}</dd></div>
          <div><dt>Aktivite tahmini</dt><dd>${esc(formatTryAmount(cost.activities))}</dd></div>
          <div><dt>Ekstra/rezerv bütçe</dt><dd>${esc(formatTryAmount(cost.reserve))}</dd></div>
          <div><dt>Kişi başı maliyet</dt><dd>${esc(formatTryAmount(cost.perPerson))}</dd></div>
          <div><dt>Toplam tatil bütçesi</dt><dd>${esc(formatTryAmount(cost.totalBudget))}</dd></div>
          <div><dt>Bütçe uyum oranı</dt><dd>${cost.budgetFitPct != null ? esc(`%${cost.budgetFitPct}`) : '—'}</dd></div>
        </dl>
      </section>

      <section class="tatil-v2-risks" aria-label="Risk analizi">
        <h3>Risk Analizi</h3>
        <div class="tatil-v2-risk-grid">
          ${model.riskAnalysis
            .map(
              (r) => `
            <article class="tatil-v2-risk-card">
              <div class="tatil-v2-risk-card-head">
                <h4>${esc(r.title)}</h4>
                <span class="tatil-v2-risk tatil-v2-risk--${esc(riskLevelToTone(r.level))}">${esc(r.level)}</span>
              </div>
              <p>${esc(r.description)}</p>
              <p class="tatil-v2-risk-rec"><strong>Öneri:</strong> ${esc(r.recommendation)}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>

      <div class="tatil-v2-grid">
        <article class="tatil-v2-block tatil-v2-block--pros">
          <h3>Güçlü Yönler</h3>
          <ul>${model.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
        <article class="tatil-v2-block tatil-v2-block--cons">
          <h3>Zayıf Yönler</h3>
          <ul>${model.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
      </div>

      <section class="tatil-v2-alts" aria-label="Alternatifler">
        <h3>Alternatifler</h3>
        <div class="tatil-v2-alt-grid">
          ${model.alternatives
            .map(
              (a) => `
            <article class="tatil-v2-alt-card">
              <h4>${esc(a.title)}</h4>
              <p>${esc(a.description)}</p>
              ${a.meta ? `<span class="tatil-v2-alt-meta">${esc(a.meta)}</span>` : ''}
            </article>`
            )
            .join('')}
        </div>
      </section>

      <article class="tatil-v2-block tatil-v2-block--exec" data-tatil-v2-insight-root>
        <h3>AI karar yorumu</h3>
        ${renderInsightBlocksHtml(model.insight, esc, {
          planTier: model.planTier,
          insightInput: model.insightInput
        })}
        <p class="tatil-v2-exec-hint" data-tatil-v2-source></p>
      </article>

      <article class="tatil-v2-block tatil-v2-block--next">
        <h3>Sonraki Adımlar</h3>
        <ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </article>

      <div class="tatil-v2-actions">
        <button type="button" class="btn secondary tatil-v2-pdf" data-tatil-v2-pdf>
          Tatil karar raporunu indir
        </button>
        <p class="tatil-v2-pdf-hint" data-tatil-v2-pdf-hint hidden></p>
      </div>
    </section>`;
}

/**
 * @param {HTMLElement} mountNode
 * @param {object} payload — state, results, track
 */
export async function mountTatilResultsV2(mountNode, payload = {}) {
  if (!mountNode) return null;

  const state = payload.state || {};
  const results = payload.results || [];
  const track = payload.track;

  mountNode.querySelector('.tatil-v2-root')?.remove();

  const built = buildTatilResultsV2Payload({ state, results });
  const model = {
    ...built,
    executiveSummary: '',
    summarySourceLabel: ''
  };

  const root = document.createElement('div');
  root.className = 'tatil-v2-root';
  root.innerHTML = renderTatilResultsV2Html(model);
  mountNode.prepend(root);

  await hydrateResultsEconomicIndicators(root, 'tatil');

  safeTrackEvent(track, 'travel_result_v2_view', {
    category: 'tatil',
    score: model.decisionScore,
    confidence: model.confidenceScore,
    risk: model.overallRisk
  });

  root.querySelector('[data-tatil-v2-pdf]')?.addEventListener('click', () => {
    safeTrackEvent(track, 'travel_report_print_click', {
      category: 'tatil',
      score: model.decisionScore
    });
    const hint = root.querySelector('[data-tatil-v2-pdf-hint]');
    if (hint) {
      hint.hidden = false;
      hint.textContent =
        'Rapor penceresi açıldı. Yazdır diyalogunda “PDF olarak kaydet” seçeneğini kullanabilirsiniz.';
    }
    gatePdfDownload(model.pdfReportData);
  });

  const summary = await fetchExecutiveSummaryV3('tatil', model.intelligence?.context || {}, model.intelligence || model, {
    planTier: model.planTier,
    strengths: model.strengths,
    weaknesses: model.weaknesses,
    costs: model.totalCost
  });

  if (summary.insight) {
    model.insight = summary.insight;
    hydrateInsightBlocks(root.querySelector('[data-tatil-v2-insight-root]'), summary.insight);
  }
  const sourceEl = root.querySelector('[data-tatil-v2-source]');
  if (sourceEl) {
    sourceEl.textContent =
      summary.source === 'ai' ? 'Kaynak: AI destekli yorum' : 'Kaynak: Kural tabanlı karar yorumu';
  }
  model.executiveSummary = summary.text;
  model.pdfReportData.executiveSummary = summary.text;
  if (summary.insight) model.pdfReportData.insightBlocks = summary.insight;

  return model;
}
