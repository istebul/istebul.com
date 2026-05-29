/**
 * Konut Decision Results V2 — premium karar raporu (Auto V2 ile aynı tasarım dili).
 * Mevcut konut sonuç ekranını bozmaz; üstüne prepend edilir.
 */
import { escapeHtml } from '../../core/security.js';

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
  const s = safeNumber(score);
  if (s >= 85) return 'Çok uygun';
  if (s >= 70) return 'Uygun';
  if (s >= 55) return 'Dikkatli değerlendir';
  return 'Riskli karar';
}

function riskTone(level) {
  const l = String(level || '').toLowerCase();
  if (l.includes('yüksek')) return 'high';
  if (l.includes('düşük')) return 'low';
  return 'mid';
}

/**
 * Form doluluğuna göre güven skoru.
 */
export function computeConfidenceScore(state = {}) {
  const checks = [
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
  ];
  const max = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const ratio = max ? got / max : 0.5;
  return clamp(Math.round(52 + ratio * 46), 32, 98);
}

/**
 * V2 karar skoru — mevcut metrics ile harmanlanır.
 */
export function computeDecisionScore(state = {}, metrics = {}) {
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
  return clamp(Math.round(blended * 0.5 + legacy * 0.5), 0, 100);
}

export function buildRiskAnalysis(state = {}, metrics = {}) {
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

  const mk = (key, title, level, description, recommendation) => ({
    key,
    title,
    level,
    description,
    recommendation
  });

  return [
    mk(
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
    mk(
      'location',
      'Lokasyon riski',
      locationLevel,
      locationLevel === 'yüksek'
        ? 'Seçilen il/bölge için deprem veya lokasyon uyumu hassasiyeti yüksek.'
        : 'Lokasyon tercihleri ile bölge profili genel olarak uyumlu.',
      'Bölge fiyat trendi ve ulaşım altyapısını karşılaştırmalı kontrol edin.'
    ),
    mk(
      'credit',
      'Kredi/finansman riski',
      creditLevel,
      creditLevel === 'yüksek'
        ? 'Kredi yükü gelir veya kapasiteye göre baskı oluşturabilir.'
        : 'Finansman yapısı kontrollü görünüyor; yine de banka ön onayı önerilir.',
      'Kredi ön onayı alın; vade ve faiz senaryolarını yan yana simüle edin.'
    ),
    mk(
      'depreciation',
      'Değer kaybı riski',
      depreciationLevel,
      depreciationLevel === 'orta'
        ? 'Bina yaşı veya segment nedeniyle yeniden satış değeri dalgalanabilir.'
        : 'Segment ve bina yaşı açısından değer kaybı baskısı sınırlı görünüyor.',
      'Emsal satış fiyatlarını ve bölge talep trendini doğrulayın.'
    ),
    mk(
      'liquidity',
      'Likidite/satılabilirlik riski',
      liquidityLevel,
      liquidityLevel === 'yüksek'
        ? 'Dar segment veya uzak lokasyon satış süresini uzatabilir.'
        : 'Piyasa likiditesi bu profil için kabul edilebilir görünüyor.',
      'Satış senaryosu için 3 emsal ilan ile likidite testi yapın.'
    ),
    mk(
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
  const duesMonthly = safeNumber(state.duesExpectation || state.dues);
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

function buildDeterministicExecutiveSummary(ctx) {
  const tone =
    ctx.decisionScore >= 70 && ctx.overallRisk !== 'Yüksek'
      ? 'mantıklı'
      : ctx.decisionScore >= 55
        ? 'koşullu olarak değerlendirilebilir'
        : 'riskli';

  return [
    `${ctx.locationLabel} için konut kararınız, bütçe (${ctx.budgetLabel}), ${ctx.homeType || 'konut tipi'} ve ${ctx.purpose || 'kullanım amacı'} birlikte değerlendirildiğinde ${tone} görünmektedir.`,
    `Karar skorunuz ${ctx.decisionScore}/100 (${ctx.scoreLabel}); güven skorunuz ${ctx.confidenceScore}/100. Genel risk seviyesi: ${ctx.overallRisk}.`,
    ctx.strengths?.[0] ? `Güçlü yön: ${ctx.strengths[0]}` : 'Lokasyon ve bütçe uyumu kararın ana dayanağıdır.',
    ctx.weaknesses?.[0] ? `Kritik dikkat noktası: ${ctx.weaknesses[0]}` : 'Tapu, ekspertiz ve finansman koşulları nihai kararı belirler.',
    ctx.decisionScore < 55 || ctx.overallRisk === 'Yüksek'
      ? 'Bu aşamada beklemek veya alternatif segment/lokasyon senaryolarını karşılaştırmak daha güvenli olabilir.'
      : 'Şartlar uygunsa ekspertiz ve kredi ön onayı sonrası teklif aşamasına geçilebilir.',
    'Bu özet bilgilendirme amaçlıdır; bağlayıcı değerlendirme veya satın alma taahhüdü değildir.'
  ].join(' ');
}

async function buildAiExecutiveSummary(ctx) {
  const fallback = buildDeterministicExecutiveSummary(ctx);
  const prompt = [
    'Profesyonel konut/karar danismani gibi Turkce 4-6 cumle yaz.',
    'Sorular: Bu konut karari mantikli mi? Hangi sartlarda alinmali? Ne zaman beklenmeli? En kritik dikkat noktasi ne?',
    'Kesin tavsiye verme; tahmini analiz dili.',
    `Lokasyon: ${ctx.locationLabel}`,
    `Butce: ${ctx.budgetLabel}`,
    `Karar skoru: ${ctx.decisionScore}/100`,
    `Guven: ${ctx.confidenceScore}/100`,
    `Risk: ${ctx.overallRisk}`,
    `Guclu: ${(ctx.strengths || []).slice(0, 2).join('; ')}`,
    `Zayif: ${(ctx.weaknesses || []).slice(0, 2).join('; ')}`
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context: { category: 'konut-decision-results-v2' } }),
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
 * Tam result payload (PDF ve ileride API için).
 */
export function buildKonutResultsV2Payload({
  state = {},
  metrics = {},
  scenarios = [],
  attention = []
}) {
  const decisionScore = computeDecisionScore(state, metrics);
  const confidenceScore = computeConfidenceScore(state);
  const riskAnalysis = buildRiskAnalysis(state, metrics);
  const totalCost = buildTotalCostView(state, metrics);
  const strengths = buildStrengths(state, metrics);
  const weaknesses = buildWeaknesses(attention, metrics);
  const alternatives = buildAlternatives(scenarios);
  const nextSteps = buildNextSteps(state, metrics, riskAnalysis);
  const overallRisk = metrics.risk?.label || 'Orta';

  const locationLabel = [state.city, state.district].filter(Boolean).join(' / ') || 'Seçilen bölge';
  const budgetLabel = safeNumber(state.totalBudget)
    ? formatTryAmount(state.totalBudget)
    : 'Belirtilmedi';

  const pdfReportData = {
    category: 'konut',
    generatedAt: new Date().toISOString(),
    location: locationLabel,
    decisionScore,
    scoreLabel: decisionScoreLabel(decisionScore),
    confidenceScore,
    overallRisk,
    totalCost,
    riskAnalysis,
    strengths,
    weaknesses,
    alternatives,
    nextSteps,
    profile: {
      purpose: state.purchasePurpose,
      homeType: state.homeType,
      roomCount: state.roomCount,
      financing: state.useFinancing
    }
  };

  return {
    decisionScore,
    scoreLabel: decisionScoreLabel(decisionScore),
    confidenceScore,
    overallRisk,
    riskTone: riskTone(overallRisk),
    riskAnalysis,
    totalCost,
    strengths,
    weaknesses,
    alternatives,
    executiveSummary: '',
    nextSteps,
    pdfReportData,
    locationLabel,
    budgetLabel,
    homeType: state.homeType || '—',
    purpose: state.purchasePurpose || '—'
  };
}

function renderKonutResultsV2Html(model) {
  const esc = escapeHtml;
  const cost = model.totalCost || {};
  const costNote = cost.isEstimate
    ? `<p class="konut-v2-estimate-note">${esc(cost.estimateNote || 'Tahmini model')}</p>`
    : '';

  return `
    <section class="konut-v2-panel" aria-label="Konut Decision Results V2">
      <header class="konut-v2-hero">
        <p class="konut-v2-kicker">AI destekli konut karar analizi</p>
        <h2 class="konut-v2-title">Konut karar raporu</h2>
        <p class="konut-v2-band">${esc(model.scoreLabel)} · ${esc(String(model.decisionScore))}/100</p>
      </header>

      <div class="konut-v2-kpis">
        <article class="konut-v2-kpi konut-v2-kpi--score">
          <span>Karar Skoru</span>
          <strong>${esc(String(model.decisionScore))}<small>/100</small></strong>
          <div class="konut-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.decisionScore))}%"></span></div>
        </article>
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

      <section class="konut-v2-risks" aria-label="Risk analizi">
        <h3>Risk Analizi</h3>
        <div class="konut-v2-risk-grid">
          ${model.riskAnalysis
            .map(
              (r) => `
            <article class="konut-v2-risk-card">
              <div class="konut-v2-risk-card-head">
                <h4>${esc(r.title)}</h4>
                <span class="konut-v2-risk konut-v2-risk--${esc(riskTone(r.level))}">${esc(r.level)}</span>
              </div>
              <p>${esc(r.description)}</p>
              <p class="konut-v2-risk-rec"><strong>Öneri:</strong> ${esc(r.recommendation)}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>

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

      <article class="konut-v2-block konut-v2-block--exec">
        <h3>AI Executive Summary</h3>
        <p class="konut-v2-exec" data-konut-v2-exec>${esc(model.executiveSummary || 'Özet hazırlanıyor…')}</p>
        <p class="konut-v2-exec-hint" data-konut-v2-source>${esc(model.summarySourceLabel || '')}</p>
      </article>

      <article class="konut-v2-block konut-v2-block--next">
        <h3>Sonraki Adımlar</h3>
        <ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </article>

      <div class="konut-v2-actions">
        <button type="button" class="btn secondary konut-v2-pdf" data-konut-v2-pdf>
          Konut karar raporunu indir
        </button>
        <p class="konut-v2-pdf-hint" data-konut-v2-pdf-hint hidden></p>
      </div>
    </section>`;
}

function buildPrintHtml(model) {
  const esc = escapeHtml;
  const cost = model.totalCost || {};
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>isteBul Konut Karar Raporu</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;color:#0f172a;line-height:1.55}
h1{font-size:1.35rem} .meta{color:#64748b;font-size:.9rem}
@media print{body{margin:12mm}}
</style></head><body>
<h1>isteBul — Konut Karar Raporu</h1>
<p class="meta">AI destekli konut karar analizi · ${esc(new Date().toLocaleString('tr-TR'))}</p>
<p><strong>Karar:</strong> ${esc(String(model.decisionScore))}/100 (${esc(model.scoreLabel)}) · <strong>Güven:</strong> ${esc(String(model.confidenceScore))}/100</p>
<p><strong>Lokasyon:</strong> ${esc(model.locationLabel)}</p>
<h2>Maliyet özeti</h2>
<ul>
<li>Peşinat: ${esc(formatTryAmount(cost.downPayment))}</li>
<li>Kredi: ${esc(formatTryAmount(cost.loanNeed))}</li>
<li>Aylık ödeme: ${esc(formatTryAmount(cost.monthlyPayment))}</li>
<li>İlk yıl toplam: ${esc(formatTryAmount(cost.firstYearTotal))}</li>
</ul>
<h2>AI Executive Summary</h2>
<p>${esc(model.executiveSummary || '')}</p>
<h2>Sonraki adımlar</h2>
<ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
</body></html>`;
}

function printKonutReport(model) {
  const html = buildPrintHtml(model);
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Konut karar raporu');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow?.focus();
  setTimeout(() => {
    try {
      frame.contentWindow?.print();
    } finally {
      setTimeout(() => frame.remove(), 800);
    }
  }, 250);
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.mountNode
 * @param {object} opts.state
 * @param {object} opts.metrics
 * @param {Array} [opts.scenarios]
 * @param {string[]} [opts.attention]
 * @param {Function} [opts.track]
 */
export async function mountKonutResultsV2({
  mountNode,
  state,
  metrics,
  scenarios = [],
  attention = [],
  track
}) {
  if (!mountNode || !metrics) return null;

  mountNode.querySelector('.konut-v2-root')?.remove();

  const payload = buildKonutResultsV2Payload({ state, metrics, scenarios, attention });
  const model = {
    ...payload,
    executiveSummary: '',
    summarySourceLabel: 'Kaynak: hazırlanıyor'
  };

  const root = document.createElement('div');
  root.className = 'konut-v2-root';
  root.innerHTML = renderKonutResultsV2Html(model);
  mountNode.prepend(root);

  try {
    track?.('decision_result_v2_view', {
      category: 'konut',
      score: model.decisionScore,
      confidence: model.confidenceScore,
      risk: model.overallRisk
    });
  } catch {}

  const pdfBtn = root.querySelector('[data-konut-v2-pdf]');
  const pdfHint = root.querySelector('[data-konut-v2-pdf-hint]');

  pdfBtn?.addEventListener('click', () => {
    try {
      track?.('decision_report_print_click', {
        category: 'konut',
        score: model.decisionScore
      });
    } catch {}

  // PDF pipeline hazır payload; şimdilik yazdırma + kullanıcı bilgisi
    if (pdfHint) {
      pdfHint.hidden = false;
      pdfHint.textContent =
        'Rapor verisi hazır. Şimdilik yazdır/PDF ile kaydedebilirsiniz; yakında doğrudan PDF indirme eklenecek.';
    }
    printKonutReport(model);
  });

  const summary = await buildAiExecutiveSummary({
    locationLabel: model.locationLabel,
    budgetLabel: model.budgetLabel,
    homeType: model.homeType,
    purpose: model.purpose,
    decisionScore: model.decisionScore,
    scoreLabel: model.scoreLabel,
    confidenceScore: model.confidenceScore,
    overallRisk: model.overallRisk,
    strengths: model.strengths,
    weaknesses: model.weaknesses
  });

  const execEl = root.querySelector('[data-konut-v2-exec]');
  if (execEl) execEl.textContent = summary.text;
  const sourceEl = root.querySelector('[data-konut-v2-source]');
  if (sourceEl) {
    sourceEl.textContent = `Kaynak: ${summary.source === 'ai' ? 'AI destekli' : 'Kural tabanlı danışman'}`;
  }
  model.executiveSummary = summary.text;
  model.pdfReportData.executiveSummary = summary.text;

  return model;
}
