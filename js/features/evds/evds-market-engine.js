/**
 * EVDS Market Engine — deterministic piyasa skorları karar motorlarını destekler.
 * EVDS verisi yoksa mevcut davranış korunur (null / hasData: false).
 */
import { escapeHtml } from '../../core/security.js';
import { clampScore } from '../results/results-engine.js';

/** @typedef {{ policyRate?: number|null, housingLoanRate?: number|null, cpiAnnual?: number|null, usdTry?: number|null, eurTry?: number|null }} EvdsRates */

export const EVDS_THRESHOLDS = Object.freeze({
  policyRate: { low: 25, medium: 38, high: 45 },
  housingLoanRate: { low: 28, medium: 35, high: 42 },
  cpiAnnual: { low: 20, medium: 35, high: 50 },
  fxTry: { low: 30, medium: 35, high: 38 }
});

function safeRate(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function levelFromThresholds(value, thresholds) {
  if (value == null) return null;
  if (value >= thresholds.high) return 'yüksek';
  if (value >= thresholds.medium) return 'orta';
  if (value <= thresholds.low) return 'düşük';
  return 'orta';
}

function formatPct(value) {
  if (value == null) return '—';
  return `%${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
}

function formatFx(value) {
  if (value == null) return '—';
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/**
 * EVDS snapshot rates objesini normalize eder.
 * @param {object} rates
 * @returns {EvdsRates}
 */
export function normalizeEvdsRates(rates = {}) {
  const src = rates && typeof rates === 'object' ? rates : {};
  return {
    policyRate: safeRate(src.policyRate),
    housingLoanRate: safeRate(src.housingLoanRate),
    cpiAnnual: safeRate(src.cpiAnnual),
    usdTry: safeRate(src.usdTry),
    eurTry: safeRate(src.eurTry)
  };
}

/**
 * EVDS verisi karar motoru için kullanılabilir mi?
 * @param {EvdsRates} rates
 * @param {'finansman'|'konut'|'auto'} category
 */
export function hasEvdsDataForCategory(rates = {}, category = 'finansman') {
  const r = normalizeEvdsRates(rates);
  if (category === 'auto') {
    return r.usdTry != null || r.eurTry != null || r.cpiAnnual != null;
  }
  return r.policyRate != null || r.housingLoanRate != null || r.cpiAnnual != null;
}

/**
 * Finansman Piyasası Skoru (0–100).
 * Politika faizi → finansman riski; konut kredisi → erişilebilirlik; TÜFE → reel maliyet.
 * @param {EvdsRates} rates
 */
export function computeFinansmanMarketScore(rates = {}) {
  const r = normalizeEvdsRates(rates);
  if (!hasEvdsDataForCategory(r, 'finansman')) {
    return { hasData: false, score: null, scoreAdjustment: 0, components: {}, summary: '' };
  }

  let score = 70;
  const components = {
    financingRisk: { level: 'orta', label: 'Finansman riski', detail: '' },
    creditAccessibility: { level: 'orta', label: 'Kredi erişilebilirliği', detail: '', score: 70 },
    realCostRisk: { level: 'orta', label: 'Reel maliyet riski', detail: '' }
  };

  if (r.policyRate != null) {
    const level = levelFromThresholds(r.policyRate, EVDS_THRESHOLDS.policyRate);
    components.financingRisk.level = level || 'orta';
    if (level === 'yüksek') {
      score -= 15;
      components.financingRisk.detail = `Politika faizi ${formatPct(r.policyRate)} — finansman riski yükselmiş durumda.`;
    } else if (level === 'orta') {
      score -= 7;
      components.financingRisk.detail = `Politika faizi ${formatPct(r.policyRate)} — orta düzey finansman riski.`;
    } else {
      score += 4;
      components.financingRisk.detail = `Politika faizi ${formatPct(r.policyRate)} — görece düşük finansman riski.`;
    }
  }

  if (r.housingLoanRate != null) {
    const level = levelFromThresholds(r.housingLoanRate, EVDS_THRESHOLDS.housingLoanRate);
    let accessScore = 70;
    if (level === 'yüksek') {
      score -= 12;
      accessScore = 35;
      components.creditAccessibility.level = 'düşük';
      components.creditAccessibility.detail = `Konut kredisi faizi ${formatPct(r.housingLoanRate)} — kredi erişilebilirliği zayıf.`;
    } else if (level === 'orta') {
      score -= 5;
      accessScore = 58;
      components.creditAccessibility.level = 'orta';
      components.creditAccessibility.detail = `Konut kredisi faizi ${formatPct(r.housingLoanRate)} — kredi maliyeti orta bandında.`;
    } else {
      score += 5;
      accessScore = 82;
      components.creditAccessibility.level = 'yüksek';
      components.creditAccessibility.detail = `Konut kredisi faizi ${formatPct(r.housingLoanRate)} — kredi erişimi görece uygun.`;
    }
    components.creditAccessibility.score = accessScore;
  }

  if (r.cpiAnnual != null) {
    const level = levelFromThresholds(r.cpiAnnual, EVDS_THRESHOLDS.cpiAnnual);
    components.realCostRisk.level = level || 'orta';
    if (level === 'yüksek') {
      score -= 10;
      components.realCostRisk.detail = `TÜFE yıllık ${formatPct(r.cpiAnnual)} — reel maliyet riski yüksek.`;
    } else if (level === 'orta') {
      score -= 4;
      components.realCostRisk.detail = `TÜFE yıllık ${formatPct(r.cpiAnnual)} — enflasyon reel maliyeti baskılıyor.`;
    } else {
      score += 3;
      components.realCostRisk.detail = `TÜFE yıllık ${formatPct(r.cpiAnnual)} — enflasyon baskısı görece sınırlı.`;
    }
  }

  const finalScore = clampScore(clamp(score, 15, 95));
  const scoreAdjustment = clamp(Math.round((finalScore - 70) * 0.12), -8, 8);

  return {
    hasData: true,
    score: finalScore,
    scoreAdjustment,
    components,
    rates: r,
    summary: buildFinansmanMarketSummary(r, components, finalScore)
  };
}

function buildFinansmanMarketSummary(rates, components, score) {
  const parts = [];
  if (components.financingRisk.detail) parts.push(components.financingRisk.detail);
  if (components.creditAccessibility.detail) parts.push(components.creditAccessibility.detail);
  if (components.realCostRisk.detail) parts.push(components.realCostRisk.detail);
  if (!parts.length) return '';
  const band = score >= 72 ? 'destekleyici' : score >= 55 ? 'nötr-baskılı' : 'baskılayıcı';
  return `Finansman piyasası skoru ${score}/100 (${band}). ${parts.join(' ')}`;
}

/**
 * Konut Finansman Erişilebilirlik Skoru (0–100).
 * @param {EvdsRates} rates
 */
export function computeKonutFinancingAccessScore(rates = {}) {
  const r = normalizeEvdsRates(rates);
  if (!hasEvdsDataForCategory(r, 'konut')) {
    return { hasData: false, score: null, scoreAdjustment: 0, outlook: {}, summary: '' };
  }

  let score = 68;
  const outlook = {
    creditCost: { level: 'orta', label: 'Kredi maliyeti', detail: '' },
    financingAccess: { level: 'orta', label: 'Finansman erişimi', detail: '' },
    inflationEffect: { level: 'orta', label: 'Enflasyon etkisi', detail: '' }
  };

  if (r.housingLoanRate != null) {
    const level = levelFromThresholds(r.housingLoanRate, EVDS_THRESHOLDS.housingLoanRate);
    outlook.creditCost.level = level === 'yüksek' ? 'yüksek' : level === 'düşük' ? 'düşük' : 'orta';
    if (level === 'yüksek') {
      score -= 14;
      outlook.creditCost.detail = `Konut kredisi faizi ${formatPct(r.housingLoanRate)} seviyesinde; aylık taksit yükü yüksek.`;
    } else if (level === 'düşük') {
      score += 8;
      outlook.creditCost.detail = `Konut kredisi faizi ${formatPct(r.housingLoanRate)} — kredi maliyeti görece uygun.`;
    } else {
      score -= 4;
      outlook.creditCost.detail = `Konut kredisi faizi ${formatPct(r.housingLoanRate)} — orta band kredi maliyeti.`;
    }
  }

  if (r.policyRate != null) {
    const level = levelFromThresholds(r.policyRate, EVDS_THRESHOLDS.policyRate);
    outlook.financingAccess.level = level === 'yüksek' ? 'düşük' : level === 'düşük' ? 'yüksek' : 'orta';
    if (level === 'yüksek') {
      score -= 10;
      outlook.financingAccess.detail = `Politika faizi ${formatPct(r.policyRate)} — bankaların kredi arzı sıkılaşmış olabilir.`;
    } else if (level === 'düşük') {
      score += 6;
      outlook.financingAccess.detail = `Politika faizi ${formatPct(r.policyRate)} — finansman erişimi görece destekleyici.`;
    } else {
      outlook.financingAccess.detail = `Politika faizi ${formatPct(r.policyRate)} — finansman erişimi dengeli.`;
    }
  }

  if (r.cpiAnnual != null) {
    const level = levelFromThresholds(r.cpiAnnual, EVDS_THRESHOLDS.cpiAnnual);
    outlook.inflationEffect.level = level || 'orta';
    if (level === 'yüksek') {
      score -= 8;
      outlook.inflationEffect.detail = `TÜFE ${formatPct(r.cpiAnnual)} — reel konut maliyeti ve kira/getiri dengesi baskı altında.`;
    } else if (level === 'düşük') {
      score += 5;
      outlook.inflationEffect.detail = `TÜFE ${formatPct(r.cpiAnnual)} — enflasyon etkisi görece sınırlı.`;
    } else {
      score -= 3;
      outlook.inflationEffect.detail = `TÜFE ${formatPct(r.cpiAnnual)} — enflasyon konut finansman kararını etkileyebilir.`;
    }
  }

  const finalScore = clampScore(clamp(score, 15, 95));
  const scoreAdjustment = clamp(Math.round((finalScore - 68) * 0.1), -6, 6);

  return {
    hasData: true,
    score: finalScore,
    scoreAdjustment,
    outlook,
    rates: r,
    summary: buildKonutFinancingSummary(outlook, finalScore)
  };
}

function buildKonutFinancingSummary(outlook, score) {
  const parts = [outlook.creditCost.detail, outlook.financingAccess.detail, outlook.inflationEffect.detail].filter(
    Boolean
  );
  if (!parts.length) return '';
  return `Konut finansman erişilebilirlik skoru ${score}/100. ${parts.join(' ')}`;
}

/**
 * Araç Kur Riski Analizi.
 * @param {EvdsRates} rates
 */
export function computeAutoFxRiskAnalysis(rates = {}) {
  const r = normalizeEvdsRates(rates);
  if (!hasEvdsDataForCategory(r, 'auto')) {
    return { hasData: false, scoreAdjustment: 0, risks: {}, summary: '' };
  }

  const fxValues = [r.usdTry, r.eurTry].filter((v) => v != null);
  const avgFx = fxValues.length ? fxValues.reduce((a, b) => a + b, 0) / fxValues.length : null;
  const maxFx = fxValues.length ? Math.max(...fxValues) : null;
  const fxRef = maxFx ?? avgFx;

  let score = 72;
  const risks = {
    zeroVehicleCost: { level: 'orta', label: 'Sıfır araç maliyeti riski', detail: '' },
    maintenanceCost: { level: 'orta', label: 'Bakım/yedek parça maliyeti riski', detail: '' },
    inflationEffect: { level: 'orta', label: 'Enflasyon etkisi', detail: '' }
  };

  if (fxRef != null) {
    const level = levelFromThresholds(fxRef, EVDS_THRESHOLDS.fxTry);
    const fxLabel = r.usdTry != null && r.eurTry != null
      ? `USD/TRY ${formatFx(r.usdTry)}, EUR/TRY ${formatFx(r.eurTry)}`
      : r.usdTry != null
        ? `USD/TRY ${formatFx(r.usdTry)}`
        : `EUR/TRY ${formatFx(r.eurTry)}`;

    if (level === 'yüksek') {
      score -= 18;
      risks.zeroVehicleCost.level = 'yüksek';
      risks.maintenanceCost.level = 'yüksek';
      risks.zeroVehicleCost.detail = `${fxLabel} — ithal araç ve sıfır km fiyatları kur baskısı altında.`;
      risks.maintenanceCost.detail = `${fxLabel} — yedek parça ve bakım maliyetleri yüksek seyrediyor.`;
    } else if (level === 'orta') {
      score -= 8;
      risks.zeroVehicleCost.level = 'orta';
      risks.maintenanceCost.level = 'orta';
      risks.zeroVehicleCost.detail = `${fxLabel} — kur seviyesi sıfır araç maliyetini orta düzeyde etkiliyor.`;
      risks.maintenanceCost.detail = `${fxLabel} — bakım/yedek parça maliyetleri izlenmeli.`;
    } else {
      score += 4;
      risks.zeroVehicleCost.level = 'düşük';
      risks.maintenanceCost.level = 'düşük';
      risks.zeroVehicleCost.detail = `${fxLabel} — kur baskısı görece sınırlı.`;
      risks.maintenanceCost.detail = `${fxLabel} — bakım maliyeti riski düşük bandında.`;
    }
  }

  if (r.cpiAnnual != null) {
    const level = levelFromThresholds(r.cpiAnnual, EVDS_THRESHOLDS.cpiAnnual);
    risks.inflationEffect.level = level || 'orta';
    if (level === 'yüksek') {
      score -= 6;
      risks.inflationEffect.detail = `TÜFE ${formatPct(r.cpiAnnual)} — reel sahip olma maliyeti artıyor.`;
    } else {
      risks.inflationEffect.detail = `TÜFE ${formatPct(r.cpiAnnual)} — enflasyon toplam maliyeti etkileyebilir.`;
    }
  }

  const finalScore = clampScore(clamp(score, 15, 95));
  const scoreAdjustment = clamp(Math.round((finalScore - 72) * 0.1), -5, 5);

  return {
    hasData: true,
    score: finalScore,
    scoreAdjustment,
    risks,
    rates: r,
    fxReference: fxRef,
    summary: buildAutoFxSummary(risks, finalScore)
  };
}

function buildAutoFxSummary(risks, score) {
  const parts = [risks.zeroVehicleCost.detail, risks.maintenanceCost.detail, risks.inflationEffect.detail].filter(
    Boolean
  );
  if (!parts.length) return '';
  return `Kur ve maliyet risk skoru ${score}/100. ${parts.join(' ')}`;
}

/**
 * Kategori bazlı EVDS piyasa analizi.
 * @param {'finansman'|'konut'|'auto'} category
 * @param {EvdsRates} rates
 */
export function buildEvdsMarketAnalysis(category, rates = {}) {
  const cat = String(category || '').toLowerCase();
  if (cat === 'finansman') return { category: cat, finansman: computeFinansmanMarketScore(rates) };
  if (cat === 'konut') return { category: cat, konut: computeKonutFinancingAccessScore(rates) };
  if (cat === 'auto') return { category: cat, auto: computeAutoFxRiskAnalysis(rates) };
  return { category: cat, hasData: false };
}

/**
 * Karar motoru skor ayarlaması ve faktörleri uygular (in-place context).
 * @param {'finansman'|'konut'|'auto'} category
 * @param {object} context
 * @param {object} evdsAnalysis — buildEvdsMarketAnalysis çıktısı
 */
export function applyEvdsToDecisionContext(category, context = {}, evdsAnalysis = null) {
  if (!evdsAnalysis || !context) return context;

  const cat = String(category || '').toLowerCase();
  const factors = context.scoreFactors || [];
  const warnings = context.warnings || [];

  if (cat === 'finansman' && evdsAnalysis.finansman?.hasData) {
    const m = evdsAnalysis.finansman;
    context.evdsMarket = m;
    context.evdsScoreAdjustment = m.scoreAdjustment;
    if (m.scoreAdjustment !== 0) {
      factors.push({
        label: 'Piyasa koşulları (EVDS)',
        impact: m.scoreAdjustment > 0 ? `+${m.scoreAdjustment}` : String(m.scoreAdjustment),
        reason: m.summary.split('.')[0] || 'TCMB EVDS piyasa sinyalleri'
      });
    }
    if (m.components.financingRisk?.level === 'yüksek') {
      warnings.push('Yüksek politika faizi finansman riskini artırıyor.');
    }
    if (m.components.creditAccessibility?.level === 'düşük') {
      warnings.push('Konut kredisi faizleri kredi erişilebilirliğini baskılıyor.');
    }
  }

  if (cat === 'konut' && evdsAnalysis.konut?.hasData) {
    const k = evdsAnalysis.konut;
    context.evdsMarket = k;
    context.evdsScoreAdjustment = k.scoreAdjustment;
    if (k.scoreAdjustment !== 0) {
      factors.push({
        label: 'Konut finansman görünümü (EVDS)',
        impact: k.scoreAdjustment > 0 ? `+${k.scoreAdjustment}` : String(k.scoreAdjustment),
        reason: k.summary.split('.')[0] || 'TCMB EVDS finansman sinyalleri'
      });
    }
    if (k.outlook.creditCost?.level === 'yüksek') {
      warnings.push('Yüksek konut kredisi faizi aylık yükü artırabilir.');
    }
  }

  if (cat === 'auto' && evdsAnalysis.auto?.hasData) {
    const a = evdsAnalysis.auto;
    context.evdsMarket = a;
    context.evdsScoreAdjustment = a.scoreAdjustment;
    if (a.scoreAdjustment !== 0) {
      factors.push({
        label: 'Kur/maliyet riski (EVDS)',
        impact: a.scoreAdjustment > 0 ? `+${a.scoreAdjustment}` : String(a.scoreAdjustment),
        reason: a.summary.split('.')[0] || 'TCMB EVDS kur sinyalleri'
      });
    }
    if (a.risks.zeroVehicleCost?.level === 'yüksek') {
      warnings.push('Yüksek kur seviyesi sıfır araç maliyetini baskılıyor.');
    }
  }

  context.scoreFactors = factors;
  context.warnings = warnings;
  context.marketAssessment = buildMarketAssessmentText(cat, evdsAnalysis);
  return context;
}

/**
 * AI özetine beslenecek piyasa değerlendirme metni.
 * @param {'finansman'|'konut'|'auto'} category
 * @param {object} evdsAnalysis
 */
export function buildMarketAssessmentText(category, evdsAnalysis = {}) {
  const cat = String(category || '').toLowerCase();

  if (cat === 'finansman' && evdsAnalysis.finansman?.hasData) {
    const m = evdsAnalysis.finansman;
    const r = m.rates || {};
    const highLoan = r.housingLoanRate != null && r.housingLoanRate >= EVDS_THRESHOLDS.housingLoanRate.medium;
    const highPolicy = r.policyRate != null && r.policyRate >= EVDS_THRESHOLDS.policyRate.medium;
    if (highLoan || highPolicy) {
      return `Konut kredisi faizlerinin ${highLoan ? 'yüksek' : 'güncel'} seyrettiği ve politika faizinin ${highPolicy ? 'yüksek' : 'mevcut'} olduğu piyasa koşullarında finansman maliyeti karar üzerinde önemli etki yaratmaktadır. ${m.summary}`;
    }
    return m.summary;
  }

  if (cat === 'konut' && evdsAnalysis.konut?.hasData) {
    const k = evdsAnalysis.konut;
    const r = k.rates || {};
    if (r.housingLoanRate != null && r.housingLoanRate >= EVDS_THRESHOLDS.housingLoanRate.medium) {
      return `Konut kredisi faizlerinin yüksek seyrettiği mevcut piyasa koşullarında finansman maliyeti karar üzerinde önemli etki yaratmaktadır. ${k.summary}`;
    }
    return k.summary;
  }

  if (cat === 'auto' && evdsAnalysis.auto?.hasData) {
    const a = evdsAnalysis.auto;
    if (a.risks.zeroVehicleCost?.level === 'yüksek') {
      return `Yüksek kur seviyesinde sıfır araç ve yedek parça maliyetleri toplam sahip olma yükünü artırmaktadır. ${a.summary}`;
    }
    return a.summary;
  }

  return '';
}

function levelTone(level) {
  if (level === 'yüksek') return 'high';
  if (level === 'düşük') return 'low';
  return 'mid';
}

/**
 * Finansman sonuç kartı HTML.
 */
export function renderFinansmanMarketAssessmentHtml(analysis = {}, esc = escapeHtml) {
  const m = analysis.finansman;
  if (!m?.hasData) return '';
  const e = esc;
  const c = m.components || {};

  return `
    <section class="ib-evds-market finansman-v2-evds-market" aria-label="Finansman Piyasası Değerlendirmesi">
      <h3>Finansman Piyasası Değerlendirmesi</h3>
      <div class="ib-evds-market__score">
        <span>Piyasa skoru</span>
        <strong>${e(String(m.score))}<small>/100</small></strong>
      </div>
      <ul class="ib-evds-market__list">
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(c.financingRisk?.level))}">
          <strong>${e(c.financingRisk?.label || 'Finansman riski')}</strong>
          <span class="ib-evds-market__level">${e(c.financingRisk?.level || '—')}</span>
          <p>${e(c.financingRisk?.detail || '')}</p>
        </li>
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(c.creditAccessibility?.level === 'düşük' ? 'yüksek' : c.creditAccessibility?.level === 'yüksek' ? 'düşük' : 'orta'))}">
          <strong>${e(c.creditAccessibility?.label || 'Kredi erişilebilirliği')}</strong>
          <span class="ib-evds-market__level">${e(c.creditAccessibility?.level || '—')}</span>
          <p>${e(c.creditAccessibility?.detail || '')}</p>
        </li>
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(c.realCostRisk?.level))}">
          <strong>${e(c.realCostRisk?.label || 'Reel maliyet riski')}</strong>
          <span class="ib-evds-market__level">${e(c.realCostRisk?.level || '—')}</span>
          <p>${e(c.realCostRisk?.detail || '')}</p>
        </li>
      </ul>
      <p class="ib-evds-market__note">Kaynak: TCMB EVDS · Bilgilendirme amaçlıdır; skor destekleyicidir.</p>
    </section>`;
}

/**
 * Konut finansman görünümü kartı HTML.
 */
export function renderKonutFinancingOutlookHtml(analysis = {}, esc = escapeHtml) {
  const k = analysis.konut;
  if (!k?.hasData) return '';
  const e = esc;
  const o = k.outlook || {};

  return `
    <section class="ib-evds-market konut-v2-evds-market" aria-label="Konut Finansman Görünümü">
      <h3>Konut Finansman Görünümü</h3>
      <div class="ib-evds-market__score">
        <span>Finansman erişilebilirlik skoru</span>
        <strong>${e(String(k.score))}<small>/100</small></strong>
      </div>
      <ul class="ib-evds-market__list">
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(o.creditCost?.level))}">
          <strong>${e(o.creditCost?.label || 'Kredi maliyeti')}</strong>
          <span class="ib-evds-market__level">${e(o.creditCost?.level || '—')}</span>
          <p>${e(o.creditCost?.detail || '')}</p>
        </li>
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(o.financingAccess?.level === 'düşük' ? 'yüksek' : o.financingAccess?.level === 'yüksek' ? 'düşük' : 'orta'))}">
          <strong>${e(o.financingAccess?.label || 'Finansman erişimi')}</strong>
          <span class="ib-evds-market__level">${e(o.financingAccess?.level || '—')}</span>
          <p>${e(o.financingAccess?.detail || '')}</p>
        </li>
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(o.inflationEffect?.level))}">
          <strong>${e(o.inflationEffect?.label || 'Enflasyon etkisi')}</strong>
          <span class="ib-evds-market__level">${e(o.inflationEffect?.level || '—')}</span>
          <p>${e(o.inflationEffect?.detail || '')}</p>
        </li>
      </ul>
      <p class="ib-evds-market__note">Kaynak: TCMB EVDS · Bilgilendirme amaçlıdır; skor destekleyicidir.</p>
    </section>`;
}

/**
 * Araç kur ve maliyet riski kartı HTML.
 */
export function renderAutoFxRiskHtml(analysis = {}, esc = escapeHtml) {
  const a = analysis.auto;
  if (!a?.hasData) return '';
  const e = esc;
  const r = a.risks || {};

  return `
    <section class="ib-evds-market auto-v2-evds-market" aria-label="Kur ve Maliyet Riski">
      <h3>Kur ve Maliyet Riski</h3>
      <div class="ib-evds-market__score">
        <span>Kur/maliyet skoru</span>
        <strong>${e(String(a.score))}<small>/100</small></strong>
      </div>
      <ul class="ib-evds-market__list">
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(r.zeroVehicleCost?.level))}">
          <strong>${e(r.zeroVehicleCost?.label || 'Sıfır araç maliyeti riski')}</strong>
          <span class="ib-evds-market__level">${e(r.zeroVehicleCost?.level || '—')}</span>
          <p>${e(r.zeroVehicleCost?.detail || '')}</p>
        </li>
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(r.maintenanceCost?.level))}">
          <strong>${e(r.maintenanceCost?.label || 'Bakım/yedek parça maliyeti riski')}</strong>
          <span class="ib-evds-market__level">${e(r.maintenanceCost?.level || '—')}</span>
          <p>${e(r.maintenanceCost?.detail || '')}</p>
        </li>
        <li class="ib-evds-market__item ib-evds-market__item--${e(levelTone(r.inflationEffect?.level))}">
          <strong>${e(r.inflationEffect?.label || 'Enflasyon etkisi')}</strong>
          <span class="ib-evds-market__level">${e(r.inflationEffect?.level || '—')}</span>
          <p>${e(r.inflationEffect?.detail || '')}</p>
        </li>
      </ul>
      <p class="ib-evds-market__note">Kaynak: TCMB EVDS · Bilgilendirme amaçlıdır; skor destekleyicidir.</p>
    </section>`;
}

/**
 * Tarayıcıda EVDS snapshot çeker (karar motoru için).
 * @returns {Promise<{ rates: EvdsRates, status: string }|null>}
 */
export async function fetchEvdsRatesForEngine(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') return null;
  try {
    const res = await fetchImpl('/api/evds-snapshot', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.rates) return null;
    return {
      rates: normalizeEvdsRates(data.rates),
      status: data.status || 'unknown',
      dataDate: data.dataDate || null
    };
  } catch {
    return null;
  }
}

/**
 * EVDS risk kalemini risk analizine ekler (varsa).
 * @param {'finansman'|'konut'|'auto'} category
 * @param {Array} riskAnalysis
 * @param {object} evdsAnalysis
 * @param {Function} buildRiskItem
 */
export function appendEvdsRiskItem(category, riskAnalysis = [], evdsAnalysis = {}, buildRiskItemFn) {
  if (!buildRiskItemFn || !Array.isArray(riskAnalysis)) return riskAnalysis;

  const cat = String(category || '').toLowerCase();

  if (cat === 'finansman' && evdsAnalysis.finansman?.hasData) {
    const m = evdsAnalysis.finansman;
    const level = m.score < 55 ? 'yüksek' : m.score < 68 ? 'orta' : 'düşük';
    riskAnalysis.push(
      buildRiskItemFn(
        'evds_market',
        level,
        'Piyasa/faiz ortamı (EVDS)',
        m.summary.split('.')[0] + '.',
        level === 'yüksek'
          ? 'Faiz ve enflasyon senaryolarını vade tablosuna ekleyin.'
          : 'Güncel piyasa faizlerini tekliflerle karşılaştırın.'
      )
    );
  }

  if (cat === 'konut' && evdsAnalysis.konut?.hasData) {
    const k = evdsAnalysis.konut;
    const level = k.score < 55 ? 'yüksek' : k.score < 68 ? 'orta' : 'düşük';
    riskAnalysis.push(
      buildRiskItemFn(
        'evds_financing',
        level,
        'Konut finansman ortamı (EVDS)',
        k.summary.split('.')[0] + '.',
        'Konut kredisi faiz ve vade senaryolarını banka teklifleriyle doğrulayın.'
      )
    );
  }

  if (cat === 'auto' && evdsAnalysis.auto?.hasData) {
    const a = evdsAnalysis.auto;
    const level = a.risks.zeroVehicleCost?.level === 'yüksek' ? 'yüksek' : a.risks.zeroVehicleCost?.level === 'orta' ? 'orta' : 'düşük';
    riskAnalysis.push(
      buildRiskItemFn(
        'evds_fx',
        level,
        'Kur ve maliyet riski (EVDS)',
        a.summary.split('.')[0] + '.',
        level === 'yüksek'
          ? 'Kur artış senaryosunda TCO ve yedek parça maliyetini yeniden hesaplayın.'
          : 'Güncel kur ve enflasyon verilerini teklif aşamasında kontrol edin.'
      )
    );
  }

  return riskAnalysis;
}
