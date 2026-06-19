/**
 * AFAD Deprem Risk Layer — karar sonuç ekranları için bilgilendirme katmanı.
 * Ana karar skorunu değiştirmez; yalnızca sanitize edilmiş AFAD snapshot verisini sunar.
 */
import { escapeHtml } from '../../core/security.js';

/** @typedef {'sakin'|'düşük'|'orta'|'yüksek'|'çok yüksek'|'unavailable'} AfadActivityLevel */

export const AFAD_RISK_LAYER_DISCLAIMER =
  'Bilgilendirme amaçlıdır · Resmi uyarı değildir · Karar destek katmanı · Kaynak: AFAD Deprem Dairesi';

export const AFAD_AI_ACTIVITY_SENTENCE =
  'AFAD deprem aktivite verileri, seçilen bölgedeki son dönem sismik hareketliliğin karar sürecinde ayrı bir bilgilendirme katmanı olarak değerlendirilmesi gerektiğini göstermektedir.';

const LAYER_TITLE = 'Deprem Aktivite Görünümü';

const BANNED_PHRASES = [
  /\bal\b/giu,
  /\balma\b/giu,
  /\bsat\b/giu,
  /\bbekle\b/giu,
  /\bvazgeç\b/giu,
  /\bkredi çek\b/giu,
  /\bkesin avantajlı\b/giu,
  /\bsatın al\b/giu,
  /\byatırım yap\b/giu,
  /\bskor değişti\b/giu,
  /\brisk skorun\b/giu,
  /\bskorunuz\b/giu,
  /\bskorun arttı\b/giu,
  /\bskorun azaldı\b/giu
];

const FORBIDDEN_PUBLIC_TOKENS = [
  'eventID',
  'latitude',
  'longitude',
  'coordinates',
  'earthquakeRiskScore',
  'activityScore',
  'seismicBaseRisk',
  'api_key',
  'apikey',
  'authorization',
  'bearer',
  'secret',
  'AFAD_EARTHQUAKE_ENABLED'
];

function normalizeSnapshot(snapshot = {}) {
  if (snapshot?.data && (snapshot.ok != null || snapshot.meta != null)) {
    return {
      ok: Boolean(snapshot.ok),
      data: snapshot.data || {},
      meta: snapshot.meta || {}
    };
  }
  return {
    ok: snapshot?.status === 'connected',
    data: snapshot || {},
    meta: {}
  };
}

function pickRegionalSignal(signals = [], options = {}) {
  const list = Array.isArray(signals) ? signals : [];
  if (!list.length) return null;

  const province = String(options.province || '').trim().toLocaleLowerCase('tr-TR');
  const district = String(options.district || '').trim().toLocaleLowerCase('tr-TR');

  if (province || district) {
    const scoped = list.find((signal) => {
      const signalProvince = String(signal?.province || '').trim().toLocaleLowerCase('tr-TR');
      const signalDistrict = String(signal?.district || '').trim().toLocaleLowerCase('tr-TR');
      if (district && signalDistrict && signalDistrict.includes(district)) return true;
      if (province && signalProvince && signalProvince.includes(province)) return true;
      return false;
    });
    if (scoped) return scoped;
  }

  return list[0] || null;
}

function isMeaningfulRegionalSignal(signal) {
  if (!signal || typeof signal !== 'object') return false;
  const eventCount = Number(signal.eventCount) || 0;
  const maxMagnitude = Number(signal.maxMagnitude) || 0;
  if (eventCount > 0 || maxMagnitude > 0) return true;
  if (signal.hasLiveActivity === true) return true;
  const level = String(signal.activityLevel || '').toLocaleLowerCase('tr-TR');
  return level && level !== 'sakin' && level !== 'unavailable';
}

function activityToneClass(level) {
  const key = String(level || '').toLocaleLowerCase('tr-TR');
  if (key === 'çok yüksek' || key === 'yüksek') return 'high';
  if (key === 'orta') return 'medium';
  if (key === 'düşük' || key === 'sakin') return 'low';
  return 'unavailable';
}

function activityLevelLabel(level) {
  const labels = {
    sakin: 'Sakin',
    düşük: 'Düşük aktivite',
    orta: 'Orta aktivite',
    yüksek: 'Yüksek aktivite',
    'çok yüksek': 'Çok yüksek aktivite',
    unavailable: 'Veri yok'
  };
  return labels[String(level || '').toLocaleLowerCase('tr-TR')] || 'Aktivite bilgisi';
}

function formatMagnitude(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(1);
}

function buildLocationLabel(signal = {}, options = {}) {
  return (
    signal.locationLabel ||
    [signal.province || options.province, signal.district || options.district].filter(Boolean).join(' / ') ||
    'Seçilen bölge'
  );
}

function stripScoreLikeCopy(text = '') {
  return String(text || '')
    .replace(/\b\d{1,3}\s*\/\s*100\b/giu, '')
    .replace(/\bskor\s+\d{1,3}\b/giu, '')
    .replace(/\bearthquakeRiskScore\b/giu, '')
    .replace(/\bactivityScore\b/giu, '')
    .replace(/\bseismicBaseRisk\b/giu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function containsAfadDirectivePhrases(text) {
  const normalized = String(text || '').toLowerCase();
  return BANNED_PHRASES.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(normalized);
  });
}

function ensureSafeCopy(text) {
  let out = stripScoreLikeCopy(String(text || ''));
  for (const pattern of BANNED_PHRASES) {
    out = out.replace(pattern, '').trim();
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function buildIndicators(signal = {}) {
  const indicators = [];
  const eventCount = Number(signal.eventCount) || 0;
  const maxMagnitude = formatMagnitude(signal.maxMagnitude);
  const avgMagnitude = formatMagnitude(signal.avgMagnitude);
  const significantCount = Number(signal.significantCount) || 0;

  if (eventCount > 0) {
    indicators.push({ label: 'Kayıtlı olay sayısı', value: String(eventCount) });
  }
  if (maxMagnitude) {
    indicators.push({ label: 'En yüksek büyüklük', value: maxMagnitude });
  }
  if (avgMagnitude) {
    indicators.push({ label: 'Ortalama büyüklük', value: avgMagnitude });
  }
  if (significantCount > 0) {
    indicators.push({ label: 'Anlamlı olay sayısı', value: String(significantCount) });
  }

  return indicators;
}

function buildSummary(signal = {}, locationLabel = '') {
  const eventCount = Number(signal.eventCount) || 0;
  const maxMagnitude = formatMagnitude(signal.maxMagnitude);
  const activityLevel = activityLevelLabel(signal.activityLevel);

  if (eventCount > 0 && maxMagnitude) {
    return ensureSafeCopy(
      `${locationLabel} için AFAD kayıtlarında son dönemde ${eventCount} deprem olayı izlendi; en yüksek büyüklük ${maxMagnitude}. Aktivite seviyesi: ${activityLevel}.`
    );
  }

  if (signal.hasLiveActivity) {
    return ensureSafeCopy(
      `${locationLabel} için AFAD kayıtlarında sınırlı deprem aktivitesi izlenmektedir. Aktivite seviyesi: ${activityLevel}.`
    );
  }

  return ensureSafeCopy(
    `${locationLabel} için AFAD deprem aktivite verisi bilgilendirme amaçlı olarak sunulmaktadır. Aktivite seviyesi: ${activityLevel}.`
  );
}

function buildBullets(signal = {}, earthquakes = []) {
  const bullets = [];
  const eventCount = Number(signal.eventCount) || 0;
  const maxMagnitude = formatMagnitude(signal.maxMagnitude);

  if (eventCount > 0) {
    bullets.push(
      ensureSafeCopy(
        `Son dönemde ${eventCount} deprem kaydı izlendi${maxMagnitude ? `; en yüksek büyüklük ${maxMagnitude}` : ''}.`
      )
    );
  }

  const recent = (Array.isArray(earthquakes) ? earthquakes : [])
    .filter((event) => event?.magnitude != null)
    .slice(0, 2);

  for (const event of recent) {
    const magnitude = formatMagnitude(event.magnitude);
    const where = [event.district, event.province].filter(Boolean).join(' / ') || event.location || 'Bölge';
    if (magnitude) {
      bullets.push(ensureSafeCopy(`${where}: ${magnitude} büyüklüğünde kayıt.`));
    }
  }

  if (!bullets.length && signal.hasLiveActivity) {
    bullets.push('Bölgede sınırlı canlı deprem aktivitesi sinyali bulunmaktadır.');
  }

  return bullets.filter(Boolean).slice(0, 3).map(ensureSafeCopy);
}

function buildEmptyLayer() {
  return {
    hasData: false,
    activityLevel: 'unavailable',
    title: LAYER_TITLE,
    summary: '',
    bullets: [],
    usedIndicators: [],
    locationLabel: '',
    disclaimer: AFAD_RISK_LAYER_DISCLAIMER,
    attribution: {
      provider: 'AFAD Deprem Dairesi',
      url: 'https://www.afad.gov.tr/',
      disclaimer: 'Bilgilendirme amaçlı deprem aktivite verisi; resmi uyarı veya acil durum bildirimi değildir.'
    },
    aiActivitySentence: ''
  };
}

/**
 * AFAD snapshot yanıtından bilgilendirme katmanı üretir (skor üretmez).
 * @param {{ ok?: boolean, data?: object, meta?: object }|object} snapshot
 * @param {{ province?: string, district?: string }} [options]
 */
export function buildAfadRiskLayer(snapshot = {}, options = {}) {
  const normalized = normalizeSnapshot(snapshot);
  const data = normalized.data || {};
  const status = String(data.status || '').toLowerCase();

  if (!normalized.ok || status === 'disabled') {
    return buildEmptyLayer();
  }

  if (status !== 'connected') {
    return buildEmptyLayer();
  }

  const signal = pickRegionalSignal(data.regionalSignals, options);
  if (!isMeaningfulRegionalSignal(signal)) {
    return buildEmptyLayer();
  }

  const locationLabel = buildLocationLabel(signal, options);
  const activityLevel = signal.activityLevel || 'sakin';
  const summary = buildSummary(signal, locationLabel);
  const bullets = buildBullets(signal, data.earthquakes);
  const usedIndicators = buildIndicators(signal);
  const attribution = {
    provider: data.attribution?.provider || 'AFAD Deprem Dairesi',
    url: data.attribution?.url || 'https://www.afad.gov.tr/',
    disclaimer:
      data.attribution?.disclaimer ||
      'Bilgilendirme amaçlı deprem aktivite verisi; resmi uyarı veya acil durum bildirimi değildir.'
  };

  return {
    hasData: true,
    activityLevel,
    title: LAYER_TITLE,
    summary,
    bullets,
    usedIndicators,
    locationLabel,
    disclaimer: AFAD_RISK_LAYER_DISCLAIMER,
    attribution,
    aiActivitySentence: AFAD_AI_ACTIVITY_SENTENCE
  };
}

/**
 * AI executive summary için deprem aktivite cümlesi (skor üretmez).
 * @param {ReturnType<typeof buildAfadRiskLayer>} layer
 */
export function buildAfadAiActivitySentence(layer) {
  if (!layer?.hasData) return '';

  const summary = ensureSafeCopy(layer.summary || '');
  const base = ensureSafeCopy(layer.aiActivitySentence || AFAD_AI_ACTIVITY_SENTENCE);
  if (summary && !base.includes(summary.slice(0, 40))) {
    return ensureSafeCopy(`${base} ${summary}`);
  }
  return base;
}

/**
 * Kompakt AFAD bilgilendirme katmanı kartı HTML.
 * @param {ReturnType<typeof buildAfadRiskLayer>} layer
 * @param {Function} [esc]
 */
export function renderAfadRiskLayerHtml(layer, esc = escapeHtml) {
  if (!layer?.hasData) return '';

  const e = esc;
  const indicators = (layer.usedIndicators || [])
    .map(
      (ind) =>
        `<li><span class="ib-afad-risk-layer__ind-label">${e(ind.label)}</span> <strong>${e(ind.value)}</strong></li>`
    )
    .join('');

  return `
    <section class="ib-afad-risk-layer" data-afad-risk-layer data-afad-activity-level="${e(layer.activityLevel)}" aria-label="${e(layer.title)}">
      <header class="ib-afad-risk-layer__head">
        <h3 class="ib-afad-risk-layer__title">${e(layer.title)}</h3>
        <span class="ib-afad-risk-layer__badge ib-afad-risk-layer__badge--${e(activityToneClass(layer.activityLevel))}">${e(activityLevelLabel(layer.activityLevel))}</span>
      </header>
      <p class="ib-afad-risk-layer__summary">${e(layer.summary)}</p>
      ${
        layer.bullets?.length
          ? `<ul class="ib-afad-risk-layer__bullets">${layer.bullets.map((b) => `<li>${e(b)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        indicators
          ? `<div class="ib-afad-risk-layer__indicators"><span class="ib-afad-risk-layer__ind-heading">İzlenen göstergeler</span><ul>${indicators}</ul></div>`
          : ''
      }
      <p class="ib-afad-risk-layer__attribution">${e(layer.attribution?.provider || 'AFAD Deprem Dairesi')}</p>
      <p class="ib-afad-risk-layer__disclaimer">${e(layer.disclaimer)}</p>
    </section>`;
}

function buildAfadSnapshotUrl(province = '', district = '') {
  const params = new URLSearchParams();
  const prov = String(province || '').trim();
  const dist = String(district || '').trim();
  if (prov) params.set('province', prov);
  if (dist) params.set('district', dist);
  const query = params.toString();
  return query ? `/api/afad-earthquake-snapshot?${query}` : '/api/afad-earthquake-snapshot';
}

/**
 * AFAD snapshot çekip bilgilendirme katmanı üretir.
 * @param {{ province?: string, district?: string, fetchImpl?: typeof fetch }} [options]
 */
export async function fetchAndBuildAfadRiskLayer({ province, district, fetchImpl } = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    return buildEmptyLayer();
  }

  try {
    const response = await fetchFn(buildAfadSnapshotUrl(province, district), {
      credentials: 'same-origin'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return buildEmptyLayer();
    }
    return buildAfadRiskLayer(body, { province, district });
  } catch {
    return buildEmptyLayer();
  }
}

/**
 * Sonuç panelinde AFAD bilgilendirme katmanını güvenli şekilde yerleştirir.
 * @param {HTMLElement} root
 * @param {ReturnType<typeof buildAfadRiskLayer>} layer
 */
export function mountAfadRiskLayer(root, layer) {
  if (!root || !layer?.hasData || typeof document === 'undefined') return;

  root.querySelector('[data-afad-risk-layer]')?.remove();

  const html = renderAfadRiskLayerHtml(layer);
  if (!html) return;

  for (const token of FORBIDDEN_PUBLIC_TOKENS) {
    if (html.toLowerCase().includes(token.toLowerCase())) return;
  }

  const wrap = document.createElement('div');
  wrap.innerHTML = html;

  const card = wrap.firstElementChild;
  if (!card) return;

  const evdsLayer = root.querySelector('[data-evds-risk-layer]');
  const economicMount = root.querySelector('[data-results-economic-mount]');

  if (evdsLayer?.parentNode) {
    evdsLayer.insertAdjacentElement('afterend', card);
    return;
  }

  if (economicMount?.parentNode) {
    economicMount.insertAdjacentElement('afterend', card);
    return;
  }

  root.prepend(card);
}
