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
import {
  buildDecisionIntelligenceResult,
  fetchExecutiveSummaryV3,
  renderScoreFactorsHtml
} from '../results/decision-intelligence-engine.js';

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

export function buildTotalCostView(state = {}, primaryResult = null) {
  const principal = amountMid(state);
  const months = termMonths(state);
  const monthly =
    primaryResult?.metrics?.monthlyPayment ?? estimatePayment(principal, months);
  const totalRepay = primaryResult?.metrics?.totalRepay ?? monthly * months;
  const interestCost = Math.max(totalRepay - principal, 0);
  const fileFees = Math.round(principal * 0.015);
  const yearlyLoad = monthly * 12;
  const income = safeNumber(state.monthly_income);
  const incomeLoadPct = income > 0 ? Math.round((monthly / income) * 100) : null;

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

export function buildAlternatives(state = {}, results = []) {
  const principal = amountMid(state);
  const baseMonths = termMonths(state);
  const cap = capacityMid(state);

  const shortMonths = Math.max(12, baseMonths - 12);
  const longMonths = Math.min(60, baseMonths + 12);
  const shortPay = estimatePayment(principal, shortMonths, 0.44);
  const longPay = estimatePayment(principal, longMonths, 0.41);
  const lowPrincipalPay = estimatePayment(principal * 0.85, baseMonths, 0.43);
  const shortTotal = shortPay * shortMonths;
  const longTotal = longPay * longMonths;
  const lowTotal = lowPrincipalPay * baseMonths;

  const fromResults = (results || [])
    .slice(1, 4)
    .map((r) => ({
      title: r.title,
      description: r.description || r.why || '',
      meta: `${r.score}/100`
    }));

  const defaults = [
    {
      title: 'Daha kısa vade alternatifi',
      description: `${shortMonths} ay · aylık ~${formatTry(shortPay)} · toplam ~${formatTry(shortTotal)}`,
      meta: 'Toplam faiz düşebilir'
    },
    {
      title: 'Daha düşük aylık ödeme alternatifi',
      description: `${longMonths} ay · aylık ~${formatTry(longPay)} · kapasite: ${longPay <= cap ? 'uygun' : 'revizyon gerekir'}`,
      meta: 'Nakit akışı rahatlatır'
    },
    {
      title: 'Daha düşük toplam maliyet alternatifi',
      description: `Tutar %15 düşük · aylık ~${formatTry(lowPrincipalPay)} · toplam ~${formatTry(lowTotal)}`,
      meta: 'Anapara azaltma'
    }
  ];

  return [...fromResults, ...defaults].slice(0, 3);
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

function buildDeterministicExecutiveSummary(ctx) {
  const tone =
    ctx.decisionScore >= 70 && ctx.overallRisk !== 'Yüksek'
      ? 'mantıklı'
      : ctx.decisionScore >= 55
        ? 'koşullu olarak değerlendirilebilir'
        : 'riskli';

  return [
    `${optionLabel('purpose', ctx.purpose)} finansmanı için profiliniz ${tone} görünüyor; karar skoru ${ctx.decisionScore}/100 (${ctx.scoreLabel}).`,
    `Tahmini aylık ödeme ${ctx.monthlyLabel}, toplam geri ödeme yaklaşık ${ctx.totalLabel}; güven skoru ${ctx.confidenceScore}/100.`,
    ctx.overallRisk === 'Yüksek' || ctx.decisionScore < 55
      ? 'Bu aşamada finansmanı ertelemek veya tutar/vade revizyonu yapmak daha güvenli olabilir.'
      : 'Şartlar uygunsa banka ön onayı ve yazılı teklif sonrası ilerlenebilir.',
    ctx.criticalRisk
      ? `En kritik risk: ${ctx.criticalRisk}.`
      : 'En kritik kontrol: EYM ve aylık ödeme/gelir oranı.',
    'Mutlaka kontrol edin: masraf kalemleri, sigorta zorunlulukları, erken kapama koşulları ve kampanya süresi.',
    'Bu özet bilgilendirme amaçlıdır; bağlayıcı kredi onayı veya finansal tavsiye değildir.'
  ].join(' ');
}

async function buildAiExecutiveSummary(ctx) {
  const fallback = buildDeterministicExecutiveSummary(ctx);
  const prompt = [
    'Profesyonel finans danismani gibi Turkce 4-6 cumle yaz.',
    'Sorular: Bu finansman mantikli mi? Hangi sartlarda alinmali? Ne zaman ertelenmeli? En kritik risk? Ne kontrol edilmeli?',
    'Kesin tavsiye verme; tahmini analiz.',
    `Amaç: ${optionLabel('purpose', ctx.purpose)}`,
    `Karar: ${ctx.decisionScore}/100`,
    `Risk: ${ctx.overallRisk}`,
    `Aylik: ${ctx.monthlyLabel}`,
    `Guclu: ${(ctx.strengths || []).slice(0, 2).join('; ')}`,
    `Zayif: ${(ctx.weaknesses || []).slice(0, 2).join('; ')}`
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context: { category: 'finansman-decision-results-v2' } }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return { text: fallback, source: 'fallback' };
    const data = await res.json().catch(() => ({}));
    const text = String(data?.text || data?.output || '').trim();
    if (!text) return { text: fallback, source: 'fallback' };
    return { text: text.slice(0, 950), source: 'ai' };
  } catch {
    clearTimeout(timeout);
    return { text: fallback, source: 'fallback' };
  }
}

/**
 * Tam result payload.
 */
export function buildFinansmanResultsV2Payload({ state = {}, results = [] }) {
  const primary = results[0] || null;
  const cost = buildTotalCostView(state, primary);
  const intel = buildDecisionIntelligenceResult('finansman', state, { monthlyPayment: cost.monthlyPayment }, {
    primaryResult: primary,
    results
  });
  const riskAnalysis = intel.riskAnalysis;
  const decisionScore = intel.decisionScore;
  const confidenceScore = intel.confidenceScore;
  const overallRisk = intel.overallRisk;

  const strengths = buildStrengths(state, primary, cost);
  const weaknesses = buildWeaknesses(state, primary, cost);
  const alternatives = intel.alternatives;
  const nextSteps = intel.nextSteps;
  const highRisk = riskAnalysis.find((r) => r.level === 'yüksek');
  const criticalRisk = highRisk?.title || '';

  const pdfReportData = buildPdfReportData({
    category: 'finansman',
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
    criticalRisk: riskAnalysis.find((r) => r.level === 'yüksek')?.title || ''
  };
}

function renderFinansmanResultsV2Html(model) {
  const esc = escapeHtml;
  const cost = model.totalCost || {};
  const estimateNote = cost.isEstimate
    ? `<p class="finansman-v2-estimate-note">${esc(cost.estimateNote)}</p>`
    : '';

  return `
    <section class="finansman-v2-panel" aria-label="Finansman Decision Results V2">
      <header class="finansman-v2-hero">
        <p class="finansman-v2-kicker">AI destekli finansman karar analizi</p>
        <h2 class="finansman-v2-title">Finansman karar raporu</h2>
        <p class="finansman-v2-band">${esc(model.scoreLabel)} · ${esc(String(model.decisionScore))}/100</p>
        ${model.recommendationLabel ? `<p class="finansman-v2-rec-level">${esc(model.recommendationLabel)}</p>` : ''}
      </header>

      ${renderScoreFactorsHtml(model.scoreFactors, 'finansman-v2')}

      <div class="finansman-v2-kpis">
        <article class="finansman-v2-kpi finansman-v2-kpi--score">
          <span>Finansman Karar Skoru</span>
          <strong>${esc(String(model.decisionScore))}<small>/100</small></strong>
          <div class="finansman-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.decisionScore))}%"></span></div>
        </article>
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

      <section class="finansman-v2-cost-grid" aria-label="Toplam maliyet görünümü">
        <h3>Toplam Maliyet Görünümü</h3>
        <dl class="finansman-v2-cost-dl">
          <div><dt>Talep edilen finansman</dt><dd>${esc(formatTryAmount(cost.principal))}</dd></div>
          <div><dt>Tahmini aylık ödeme</dt><dd>${esc(formatTryAmount(cost.monthlyPayment))}</dd></div>
          <div><dt>Toplam geri ödeme</dt><dd>${esc(formatTryAmount(cost.totalRepayment))}</dd></div>
          <div><dt>Tahmini faiz maliyeti</dt><dd>${esc(formatTryAmount(cost.interestCost))}</dd></div>
          <div><dt>Dosya/masraf tahmini</dt><dd>${esc(formatTryAmount(cost.fileFees))}</dd></div>
          <div><dt>İlk 12 ay ödeme yükü</dt><dd>${esc(formatTryAmount(cost.yearlyLoad))}</dd></div>
          <div><dt>Gelire göre aylık yük</dt><dd>${cost.incomeLoadPct != null ? esc(`%${cost.incomeLoadPct}`) : '—'}</dd></div>
          <div><dt>Vade</dt><dd>${esc(String(cost.months || '—'))} ay</dd></div>
        </dl>
      </section>

      <section class="finansman-v2-risks" aria-label="Risk analizi">
        <h3>Risk Analizi</h3>
        <div class="finansman-v2-risk-grid">
          ${model.riskAnalysis
            .map(
              (r) => `
            <article class="finansman-v2-risk-card">
              <div class="finansman-v2-risk-card-head">
                <h4>${esc(r.title)}</h4>
                <span class="finansman-v2-risk finansman-v2-risk--${esc(riskLevelToTone(r.level))}">${esc(r.level)}</span>
              </div>
              <p>${esc(r.description)}</p>
              <p class="finansman-v2-risk-rec"><strong>Öneri:</strong> ${esc(r.recommendation)}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>

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
        <h3>Alternatifler</h3>
        <div class="finansman-v2-alt-grid">
          ${model.alternatives
            .map(
              (a) => `
            <article class="finansman-v2-alt-card">
              <h4>${esc(a.title)}</h4>
              <p>${esc(a.description)}</p>
              ${a.meta ? `<span class="finansman-v2-alt-meta">${esc(a.meta)}</span>` : ''}
            </article>`
            )
            .join('')}
        </div>
      </section>

      <article class="finansman-v2-block finansman-v2-block--exec">
        <h3>AI Executive Summary</h3>
        <p class="finansman-v2-exec" data-finansman-v2-exec>${esc(model.executiveSummary || 'Özet hazırlanıyor…')}</p>
        <p class="finansman-v2-exec-hint" data-finansman-v2-source></p>
      </article>

      <article class="finansman-v2-block finansman-v2-block--next">
        <h3>Sonraki Adımlar</h3>
        <ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </article>

      <div class="finansman-v2-actions">
        <button type="button" class="btn secondary finansman-v2-pdf" data-finansman-v2-pdf>
          Finansman karar raporunu indir
        </button>
        <p class="finansman-v2-pdf-hint" data-finansman-v2-pdf-hint hidden></p>
      </div>
    </section>`;
}

/**
 * @param {HTMLElement} mountNode
 * @param {object} payload — state, results, track, summary (opsiyonel)
 */
export async function mountFinansmanResultsV2(mountNode, payload = {}) {
  if (!mountNode) return null;

  const state = payload.state || {};
  const results = payload.results || [];
  const track = payload.track;

  mountNode.querySelector('.finansman-v2-root')?.remove();

  const built = buildFinansmanResultsV2Payload({ state, results });
  const model = {
    ...built,
    executiveSummary: '',
    summarySourceLabel: ''
  };

  const root = document.createElement('div');
  root.className = 'finansman-v2-root';
  root.innerHTML = renderFinansmanResultsV2Html(model);
  mountNode.prepend(root);

  safeTrackEvent(track, 'finance_result_v2_view', {
    category: 'finansman',
    score: model.decisionScore,
    confidence: model.confidenceScore,
    risk: model.overallRisk
  });

  root.querySelector('[data-finansman-v2-pdf]')?.addEventListener('click', () => {
    safeTrackEvent(track, 'finance_report_print_click', {
      category: 'finansman',
      score: model.decisionScore
    });
    const hint = root.querySelector('[data-finansman-v2-pdf-hint]');
    if (hint) {
      hint.hidden = false;
      hint.textContent =
        'Rapor penceresi açıldı. Yazdır diyalogunda “PDF olarak kaydet” seçeneğini kullanabilirsiniz.';
    }
    gatePdfDownload(model.pdfReportData);
  });

  const summary = await fetchExecutiveSummaryV3('finansman', model.intelligence?.context || {}, model.intelligence || model);

  const execEl = root.querySelector('[data-finansman-v2-exec]');
  if (execEl) execEl.textContent = summary.text;
  const sourceEl = root.querySelector('[data-finansman-v2-source]');
  if (sourceEl) {
    sourceEl.textContent = `Kaynak: ${summary.source === 'ai' ? 'AI destekli' : 'Kural tabanlı danışman'}`;
  }
  model.executiveSummary = summary.text;
  model.pdfReportData.executiveSummary = summary.text;

  return model;
}
