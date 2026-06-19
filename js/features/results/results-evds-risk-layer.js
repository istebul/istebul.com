/**
 * EVDS Risk Layer — karar sonuç ekranları için piyasa görünümü / risk katmanı.
 * Ana karar skorunu değiştirmez; bilgilendirme ve AI özet desteği sağlar.
 */
import { escapeHtml } from '../../core/security.js';
import {
  EVDS_THRESHOLDS,
  fetchEvdsRatesForEngine,
  normalizeEvdsRates,
  sanitizeEvdsDecisionSupportCopy
} from '../evds/evds-market-engine.js';
import {
  formatFxTry,
  formatPercentTr
} from '../home/home-economic-indicators.js';

/** @typedef {'finance'|'konut'|'auto'} EvdsRiskPreset */
/** @typedef {'low'|'medium'|'high'|'unavailable'} EvdsRiskLevel */

export const EVDS_RISK_LAYER_DISCLAIMER =
  'Bilgilendirme amaçlıdır · Karar destek katmanı · Yatırım veya kredi tavsiyesi değildir · Kaynak: TCMB EVDS';

export const EVDS_AI_MARKET_SENTENCE =
  'Piyasa verileri, bu kararın yalnızca kullanıcı tercihlerine değil mevcut faiz, enflasyon veya kur koşullarına göre de değerlendirilmesi gerektiğini göstermektedir.';

const BANNED_PHRASES = [
  /\bal\b/giu,
  /\bsat\b/giu,
  /\bbekle\b/giu,
  /\bkredi çek\b/giu,
  /\bkesin avantajlı\b/giu,
  /\bsatın al\b/giu,
  /\byatırım yap\b/giu
];

const PRESET_CONFIG = Object.freeze({
  finance: Object.freeze({
    title: 'Finansman Piyasası Görünümü',
    summaryHigh:
      'Mevcut faiz ve enflasyon görünümü, kredi maliyetlerinin karar üzerinde önemli bir risk katmanı oluşturabileceğini göstermektedir.',
    summaryMedium:
      'Mevcut faiz ve enflasyon görünümü, finansman maliyetlerinde dikkat edilmesi gereken bir piyasa katmanına işaret etmektedir.',
    summaryLow:
      'Mevcut faiz ve enflasyon görünümü, finansman maliyetleri açısından görece dengeli bir piyasa tabanına işaret etmektedir.'
  }),
  konut: Object.freeze({
    title: 'Konut Finansman Görünümü',
    summaryHigh:
      'Konut finansmanı açısından mevcut piyasa koşulları, kredi kullanım kararında ek dikkat gerektiren bir maliyet katmanı oluşturmaktadır.',
    summaryMedium:
      'Konut finansmanı açısından mevcut piyasa koşulları, aylık yük ve toplam maliyet kalemlerinde izlenmesi gereken bir katman sunmaktadır.',
    summaryLow:
      'Konut finansmanı açısından mevcut piyasa koşulları, maliyet baskısı açısından görece dengeli bir tablo göstermektedir.'
  }),
  auto: Object.freeze({
    title: 'Kur ve Maliyet Riski',
    summaryHigh:
      'Kur ve enflasyon görünümü, araç sahipliği maliyetlerinde yukarı yönlü baskı oluşturabilecek bir piyasa koşuluna işaret etmektedir.',
    summaryMedium:
      'Kur ve enflasyon görünümü, araç sahipliği maliyetlerinde izlenmesi gereken bir piyasa katmanına işaret etmektedir.',
    summaryLow:
      'Kur ve enflasyon görünümü, araç sahipliği maliyetleri açısından görece dengeli bir piyasa tabanına işaret etmektedir.'
  })
});

function pressureLevel(value, thresholds) {
  if (value == null) return null;
  if (value >= thresholds.high) return 'high';
  if (value >= thresholds.medium) return 'medium';
  if (value <= thresholds.low) return 'low';
  return 'medium';
}

function formatIndicatorValue(key, value) {
  if (value == null) return '—';
  if (key === 'usdTry' || key === 'eurTry') return formatFxTry(value);
  return formatPercentTr(value);
}

function indicatorLabel(key) {
  return {
    policyRate: 'Politika faizi',
    housingLoanRate: 'Konut kredisi faizi',
    cpiAnnual: 'TÜFE',
    usdTry: 'USD/TRY',
    eurTry: 'EUR/TRY'
  }[key] || key;
}

function aggregateRiskLevel(pressures) {
  const active = pressures.filter(Boolean);
  if (!active.length) return 'unavailable';

  const highCount = active.filter((p) => p === 'high').length;
  const mediumCount = active.filter((p) => p === 'medium').length;

  if (highCount >= 2) return 'high';
  if (highCount >= 1 || mediumCount >= 2) return 'medium';
  return 'low';
}

function riskLevelLabel(level) {
  return {
    low: 'Düşük baskı',
    medium: 'Orta baskı',
    high: 'Yüksek baskı',
    unavailable: 'Veri yok'
  }[level] || '—';
}

function ensureNoDirectiveCopy(text) {
  let out = sanitizeEvdsDecisionSupportCopy(String(text || ''));
  for (const pattern of BANNED_PHRASES) {
    out = out.replace(pattern, '').trim();
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function buildFinanceLayer(rates) {
  const pressures = [];
  const bullets = [];
  const usedIndicators = [];

  const policy = rates.policyRate;
  const housing = rates.housingLoanRate;
  const cpi = rates.cpiAnnual;

  if (policy != null) {
    const level = pressureLevel(policy, EVDS_THRESHOLDS.policyRate);
    pressures.push(level);
    usedIndicators.push({
      key: 'policyRate',
      label: indicatorLabel('policyRate'),
      value: formatIndicatorValue('policyRate', policy),
      pressure: level
    });
    if (level === 'high') {
      bullets.push(
        `Politika faizi ${formatIndicatorValue('policyRate', policy)} seviyesinde; finansman maliyeti baskısı oluşturabilir.`
      );
    } else if (level === 'medium') {
      bullets.push(
        `Politika faizi ${formatIndicatorValue('policyRate', policy)}; finansman maliyetleri izlenmeli.`
      );
    }
  }

  if (housing != null) {
    const level = pressureLevel(housing, EVDS_THRESHOLDS.housingLoanRate);
    pressures.push(level);
    usedIndicators.push({
      key: 'housingLoanRate',
      label: indicatorLabel('housingLoanRate'),
      value: formatIndicatorValue('housingLoanRate', housing),
      pressure: level
    });
    if (level === 'high') {
      bullets.push(
        `Konut kredisi faizi ${formatIndicatorValue('housingLoanRate', housing)}; kredi erişilebilirliği baskısı oluşabilir.`
      );
    } else if (level === 'medium') {
      bullets.push(
        `Konut kredisi faizi ${formatIndicatorValue('housingLoanRate', housing)}; erişilebilirlik orta bantta.`
      );
    }
  }

  if (cpi != null) {
    const level = pressureLevel(cpi, EVDS_THRESHOLDS.cpiAnnual);
    pressures.push(level);
    usedIndicators.push({
      key: 'cpiAnnual',
      label: indicatorLabel('cpiAnnual'),
      value: formatIndicatorValue('cpiAnnual', cpi),
      pressure: level
    });
    if (level === 'high') {
      bullets.push(`TÜFE ${formatIndicatorValue('cpiAnnual', cpi)}; reel maliyet / enflasyon baskısı yüksek.`);
    } else if (level === 'medium') {
      bullets.push(`TÜFE ${formatIndicatorValue('cpiAnnual', cpi)}; enflasyon maliyet kalemlerini etkileyebilir.`);
    }
  }

  if (!usedIndicators.length) {
    return null;
  }

  const riskLevel = aggregateRiskLevel(pressures);
  const cfg = PRESET_CONFIG.finance;

  while (bullets.length < 2 && usedIndicators.length) {
    const ind = usedIndicators[bullets.length % usedIndicators.length];
    bullets.push(`${ind.label} ${ind.value} — mevcut piyasa göstergesi.`);
  }

  return {
    preset: 'finance',
    riskLevel,
    title: cfg.title,
    summary: ensureNoDirectiveCopy(
      riskLevel === 'high' ? cfg.summaryHigh : riskLevel === 'medium' ? cfg.summaryMedium : cfg.summaryLow
    ),
    bullets: bullets.slice(0, 3).map(ensureNoDirectiveCopy),
    usedIndicators,
    disclaimer: EVDS_RISK_LAYER_DISCLAIMER,
    aiMarketSentence: EVDS_AI_MARKET_SENTENCE,
    hasData: true
  };
}

function buildKonutLayer(rates) {
  const pressures = [];
  const bullets = [];
  const usedIndicators = [];

  const housing = rates.housingLoanRate;
  const policy = rates.policyRate;
  const cpi = rates.cpiAnnual;

  if (housing != null) {
    const level = pressureLevel(housing, EVDS_THRESHOLDS.housingLoanRate);
    pressures.push(level);
    usedIndicators.push({
      key: 'housingLoanRate',
      label: indicatorLabel('housingLoanRate'),
      value: formatIndicatorValue('housingLoanRate', housing),
      pressure: level
    });
    if (level === 'high') {
      bullets.push(
        `Konut kredisi faizi ${formatIndicatorValue('housingLoanRate', housing)}; aylık ödeme ve toplam geri ödeme baskısı oluşabilir.`
      );
    } else if (level === 'medium') {
      bullets.push(
        `Konut kredisi faizi ${formatIndicatorValue('housingLoanRate', housing)}; ödeme yükü orta bantta.`
      );
    }
  }

  if (policy != null) {
    const level = pressureLevel(policy, EVDS_THRESHOLDS.policyRate);
    pressures.push(level);
    usedIndicators.push({
      key: 'policyRate',
      label: indicatorLabel('policyRate'),
      value: formatIndicatorValue('policyRate', policy),
      pressure: level
    });
    if (level === 'high') {
      bullets.push(
        `Politika faizi ${formatIndicatorValue('policyRate', policy)}; finansman erişimi baskısı oluşabilir.`
      );
    }
  }

  if (cpi != null) {
    const level = pressureLevel(cpi, EVDS_THRESHOLDS.cpiAnnual);
    pressures.push(level);
    usedIndicators.push({
      key: 'cpiAnnual',
      label: indicatorLabel('cpiAnnual'),
      value: formatIndicatorValue('cpiAnnual', cpi),
      pressure: level
    });
    if (level === 'high') {
      bullets.push(`TÜFE ${formatIndicatorValue('cpiAnnual', cpi)}; bütçe ve reel maliyet baskısı yüksek.`);
    } else if (level === 'medium') {
      bullets.push(`TÜFE ${formatIndicatorValue('cpiAnnual', cpi)}; bütçe kalemlerini etkileyebilir.`);
    }
  }

  if (!usedIndicators.length) {
    return null;
  }

  const riskLevel = aggregateRiskLevel(pressures);
  const cfg = PRESET_CONFIG.konut;

  while (bullets.length < 2 && usedIndicators.length) {
    const ind = usedIndicators[bullets.length % usedIndicators.length];
    bullets.push(`${ind.label} ${ind.value} — mevcut piyasa göstergesi.`);
  }

  return {
    preset: 'konut',
    riskLevel,
    title: cfg.title,
    summary: ensureNoDirectiveCopy(
      riskLevel === 'high' ? cfg.summaryHigh : riskLevel === 'medium' ? cfg.summaryMedium : cfg.summaryLow
    ),
    bullets: bullets.slice(0, 3).map(ensureNoDirectiveCopy),
    usedIndicators,
    disclaimer: EVDS_RISK_LAYER_DISCLAIMER,
    aiMarketSentence: EVDS_AI_MARKET_SENTENCE,
    hasData: true
  };
}

function buildAutoLayer(rates) {
  const pressures = [];
  const bullets = [];
  const usedIndicators = [];

  const usd = rates.usdTry;
  const eur = rates.eurTry;
  const cpi = rates.cpiAnnual;

  const fxValues = [usd, eur].filter((v) => v != null);
  const fxRef = fxValues.length ? Math.max(...fxValues) : null;

  if (fxRef != null) {
    const level = pressureLevel(fxRef, EVDS_THRESHOLDS.fxTry);
    pressures.push(level);
    if (usd != null) {
      usedIndicators.push({
        key: 'usdTry',
        label: indicatorLabel('usdTry'),
        value: formatIndicatorValue('usdTry', usd),
        pressure: pressureLevel(usd, EVDS_THRESHOLDS.fxTry)
      });
    }
    if (eur != null) {
      usedIndicators.push({
        key: 'eurTry',
        label: indicatorLabel('eurTry'),
        value: formatIndicatorValue('eurTry', eur),
        pressure: pressureLevel(eur, EVDS_THRESHOLDS.fxTry)
      });
    }
    if (level === 'high') {
      bullets.push(
        'USD/TRY ve EUR/TRY yüksek seviyede; araç fiyatı, yedek parça, bakım ve kasko maliyeti baskısı oluşabilir.'
      );
    } else if (level === 'medium') {
      bullets.push('Kur seviyesi orta bantta; ithal maliyet kalemleri izlenmeli.');
    }
  }

  if (cpi != null) {
    const level = pressureLevel(cpi, EVDS_THRESHOLDS.cpiAnnual);
    pressures.push(level);
    usedIndicators.push({
      key: 'cpiAnnual',
      label: indicatorLabel('cpiAnnual'),
      value: formatIndicatorValue('cpiAnnual', cpi),
      pressure: level
    });
    if (level === 'high') {
      bullets.push(`TÜFE ${formatIndicatorValue('cpiAnnual', cpi)}; sahiplik maliyeti baskısı yüksek.`);
    } else if (level === 'medium') {
      bullets.push(`TÜFE ${formatIndicatorValue('cpiAnnual', cpi)}; toplam sahip olma maliyetini etkileyebilir.`);
    }
  }

  if (!usedIndicators.length) {
    return null;
  }

  const riskLevel = aggregateRiskLevel(pressures);
  const cfg = PRESET_CONFIG.auto;

  while (bullets.length < 2 && usedIndicators.length) {
    const ind = usedIndicators[bullets.length % usedIndicators.length];
    bullets.push(`${ind.label} ${ind.value} — mevcut piyasa göstergesi.`);
  }

  return {
    preset: 'auto',
    riskLevel,
    title: cfg.title,
    summary: ensureNoDirectiveCopy(
      riskLevel === 'high' ? cfg.summaryHigh : riskLevel === 'medium' ? cfg.summaryMedium : cfg.summaryLow
    ),
    bullets: bullets.slice(0, 3).map(ensureNoDirectiveCopy),
    usedIndicators,
    disclaimer: EVDS_RISK_LAYER_DISCLAIMER,
    aiMarketSentence: EVDS_AI_MARKET_SENTENCE,
    hasData: true
  };
}

/**
 * EVDS risk katmanı — ana skoru değiştirmez.
 * @param {EvdsRiskPreset} preset
 * @param {object} rates
 */
export function buildEvdsRiskLayer(preset, rates = {}) {
  const normalized = normalizeEvdsRates(rates);
  const p = String(preset || '').toLowerCase();

  let layer = null;
  if (p === 'finance' || p === 'finansman') layer = buildFinanceLayer(normalized);
  else if (p === 'konut') layer = buildKonutLayer(normalized);
  else if (p === 'auto') layer = buildAutoLayer(normalized);

  if (!layer) {
    const cfg = PRESET_CONFIG[p === 'finance' || p === 'finansman' ? 'finance' : p] || PRESET_CONFIG.finance;
    return {
      preset: p || 'finance',
      riskLevel: 'unavailable',
      title: cfg?.title || 'Piyasa Görünümü',
      summary: '',
      bullets: [],
      usedIndicators: [],
      disclaimer: EVDS_RISK_LAYER_DISCLAIMER,
      aiMarketSentence: '',
      hasData: false
    };
  }

  return layer;
}

/**
 * AI executive summary için piyasa cümlesi.
 * @param {ReturnType<typeof buildEvdsRiskLayer>} layer
 */
export function buildEvdsAiMarketSentence(layer) {
  if (!layer?.hasData) return '';
  const summary = ensureNoDirectiveCopy(layer.summary || '');
  const base = ensureNoDirectiveCopy(layer.aiMarketSentence || EVDS_AI_MARKET_SENTENCE);
  if (summary && !base.includes(summary.slice(0, 40))) {
    return `${base} ${summary}`.trim();
  }
  return base;
}

function riskToneClass(level) {
  if (level === 'high') return 'high';
  if (level === 'medium') return 'medium';
  if (level === 'low') return 'low';
  return 'unavailable';
}

/**
 * Kompakt premium EVDS risk katmanı kartı HTML.
 * @param {ReturnType<typeof buildEvdsRiskLayer>} layer
 * @param {Function} [esc]
 */
export function renderEvdsRiskLayerHtml(layer, esc = escapeHtml) {
  if (!layer?.hasData) return '';

  const e = esc;
  const indicators = (layer.usedIndicators || [])
    .map(
      (ind) =>
        `<li><span class="ib-evds-risk-layer__ind-label">${e(ind.label)}</span> <strong>${e(ind.value)}</strong></li>`
    )
    .join('');

  return `
    <section class="ib-evds-risk-layer" data-evds-risk-layer data-evds-risk-level="${e(layer.riskLevel)}" aria-label="${e(layer.title)}">
      <header class="ib-evds-risk-layer__head">
        <h3 class="ib-evds-risk-layer__title">${e(layer.title)}</h3>
        <span class="ib-evds-risk-layer__badge ib-evds-risk-layer__badge--${e(riskToneClass(layer.riskLevel))}">${e(riskLevelLabel(layer.riskLevel))}</span>
      </header>
      <p class="ib-evds-risk-layer__summary">${e(layer.summary)}</p>
      ${
        layer.bullets?.length
          ? `<ul class="ib-evds-risk-layer__bullets">${layer.bullets.map((b) => `<li>${e(b)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        indicators
          ? `<div class="ib-evds-risk-layer__indicators"><span class="ib-evds-risk-layer__ind-heading">Kullanılan göstergeler</span><ul>${indicators}</ul></div>`
          : ''
      }
      <p class="ib-evds-risk-layer__disclaimer">${e(layer.disclaimer)}</p>
    </section>`;
}

/**
 * EVDS snapshot çekip risk katmanı üretir.
 * @param {EvdsRiskPreset} preset
 * @param {Function} [fetchImpl]
 */
export async function fetchAndBuildEvdsRiskLayer(preset, fetchImpl = globalThis.fetch) {
  const snapshot = await fetchEvdsRatesForEngine(fetchImpl);
  return buildEvdsRiskLayer(preset, snapshot?.rates || null);
}

/**
 * Sonuç panelinde EVDS kartının altına risk katmanını yerleştirir.
 * @param {HTMLElement} root
 * @param {ReturnType<typeof buildEvdsRiskLayer>} layer
 */
export function mountEvdsRiskLayer(root, layer) {
  if (!root || !layer?.hasData || typeof document === 'undefined') return;

  root.querySelector('[data-evds-risk-layer]')?.remove();

  const html = renderEvdsRiskLayerHtml(layer);
  if (!html) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = html;

  const economicMount = root.querySelector('[data-results-economic-mount]');
  const card = wrap.firstElementChild;
  if (!card) return;

  if (economicMount?.parentNode) {
    economicMount.insertAdjacentElement('afterend', card);
  } else {
    root.prepend(card);
  }
}

export function containsDirectivePhrases(text) {
  const normalized = String(text || '').toLowerCase();
  return BANNED_PHRASES.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(normalized);
  });
}
