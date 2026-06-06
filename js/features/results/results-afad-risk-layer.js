/**
 * AFAD Risk Layer — konut sonuç ekranı için deprem istihbarat kartı.
 * Ana karar skorunu doğrudan değiştirmez; bilgilendirme ve AI özet desteği sağlar.
 */
import { escapeHtml } from '../../core/security.js';
import {
  buildAfadAssessmentText,
  fetchAfadRiskForEngine,
  hasAfadData,
  normalizeAfadRiskSnapshot
} from '../afad/afad-earthquake-engine.js';

export const AFAD_RISK_LAYER_DISCLAIMER =
  'Bilgilendirme amaçlıdır · Resmi AFAD deprem olay verisi · Zemin etüdü veya yapı güvenliği taahhüdü değildir';

export const AFAD_AI_EARTHQUAKE_SENTENCE =
  'AFAD deprem verileri, konut kararının yalnızca bütçe ve lokasyon tercihlerine değil, bölgesel deprem riski ve güncel sismik aktiviteye göre de değerlendirilmesi gerektiğini göstermektedir.';

const BANNED_PHRASES = [
  /\bal\b/giu,
  /\bsat\b/giu,
  /\bbekle\b/giu,
  /\bsatın al\b/giu,
  /\byatırım yap\b/giu
];

function activityLevelLabel(level = '') {
  const map = {
    sakin: 'Sakin',
    düşük: 'Düşük aktivite',
    orta: 'Orta aktivite',
    yüksek: 'Yüksek aktivite',
    'çok yüksek': 'Çok yüksek aktivite'
  };
  return map[String(level).toLowerCase()] || '—';
}

function riskToneClass(level = '') {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'yüksek' || normalized === 'çok yüksek' || normalized === 'high') return 'high';
  if (normalized === 'orta' || normalized === 'medium') return 'medium';
  if (normalized === 'düşük' || normalized === 'sakin' || normalized === 'low') return 'low';
  return 'unavailable';
}

function ensureNoDirectiveCopy(text = '') {
  let out = String(text || '').trim();
  for (const pattern of BANNED_PHRASES) {
    out = out.replace(pattern, '').trim();
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function buildActivityBullets(snapshot = {}) {
  const bullets = [];
  const count = Number(snapshot.eventCount) || 0;
  const maxMag = Number(snapshot.maxMagnitude) || 0;
  const activity = snapshot.earthquakeActivityLevel || 'sakin';

  if (count > 0) {
    bullets.push(
      `Son dönemde kayıtlı ${count} deprem olayı; en yüksek büyüklük ${maxMag.toFixed(1)}.`
    );
  } else {
    bullets.push('Son dönemde kayıtlı mikro-deprem aktivitesi sınırlı görünüyor.');
  }

  bullets.push(`Sismik aktivite seviyesi: ${activityLevelLabel(activity)}.`);

  if (snapshot.seismicBaseRisk != null) {
    bullets.push(`Bölgesel temel risk skoru: ${snapshot.seismicBaseRisk}/100.`);
  }

  return bullets.slice(0, 3).map(ensureNoDirectiveCopy);
}

/**
 * AFAD risk katmanı — ana skoru değiştirmez.
 * @param {object|null} snapshot
 */
export function buildAfadRiskLayer(snapshot = null) {
  const normalized = normalizeAfadRiskSnapshot(snapshot);
  if (!hasAfadData(normalized)) {
    return {
      title: 'Deprem Riski',
      riskLevel: 'unavailable',
      activityLevel: 'sakin',
      summary: '',
      bullets: [],
      indicators: [],
      aiExplanation: '',
      disclaimer: AFAD_RISK_LAYER_DISCLAIMER,
      aiEarthquakeSentence: '',
      hasData: false
    };
  }

  const riskLevel = normalized.riskLevel || 'orta';
  const summary = ensureNoDirectiveCopy(normalized.earthquakeSummary || '');
  const bullets = buildActivityBullets(normalized);
  const indicators = [
    { label: 'Risk skoru', value: `${normalized.earthquakeRiskScore}/100` },
    { label: 'Aktivite', value: activityLevelLabel(normalized.earthquakeActivityLevel) },
    { label: 'Olay sayısı', value: String(normalized.eventCount ?? 0) },
    { label: 'En yüksek M', value: (normalized.maxMagnitude ?? 0).toFixed(1) }
  ];

  return {
    title: 'Deprem Riski',
    riskLevel,
    activityLevel: normalized.earthquakeActivityLevel,
    riskScore: normalized.earthquakeRiskScore,
    summary,
    bullets,
    indicators,
    recentEvents: normalized.recentEvents || [],
    aiExplanation: summary,
    disclaimer: AFAD_RISK_LAYER_DISCLAIMER,
    aiEarthquakeSentence: AFAD_AI_EARTHQUAKE_SENTENCE,
    hasData: true,
    source: normalized.source || 'afad'
  };
}

/**
 * AI executive summary için deprem cümlesi.
 * @param {ReturnType<typeof buildAfadRiskLayer>} layer
 */
export function buildAfadAiEarthquakeSentence(layer) {
  if (!layer?.hasData) return '';
  const summary = ensureNoDirectiveCopy(layer.summary || '');
  const base = ensureNoDirectiveCopy(layer.aiEarthquakeSentence || AFAD_AI_EARTHQUAKE_SENTENCE);
  if (summary && !base.includes(summary.slice(0, 40))) {
    return `${base} ${summary}`.trim();
  }
  return base;
}

/**
 * AFAD risk katmanı HTML.
 * @param {ReturnType<typeof buildAfadRiskLayer>} layer
 * @param {Function} [esc]
 */
export function renderAfadRiskLayerHtml(layer, esc = escapeHtml) {
  if (!layer?.hasData) return '';

  const e = esc;
  const indicators = (layer.indicators || [])
    .map(
      (ind) =>
        `<li><span class="ib-afad-risk-layer__ind-label">${e(ind.label)}</span> <strong>${e(ind.value)}</strong></li>`
    )
    .join('');

  const recentEvents = (layer.recentEvents || [])
    .slice(0, 2)
    .map((ev) => {
      const mag = ev?.magnitude != null ? `M${Number(ev.magnitude).toFixed(1)}` : 'M—';
      const where = ev?.location || [ev?.district, ev?.province].filter(Boolean).join(', ') || '—';
      return `<li>${e(mag)} · ${e(where)}${ev?.date ? ` · ${e(String(ev.date).slice(0, 16))}` : ''}</li>`;
    })
    .join('');

  return `
    <section class="ib-afad-risk-layer ib-evds-risk-layer" data-afad-risk-layer data-afad-risk-level="${e(layer.riskLevel)}" aria-label="${e(layer.title)}">
      <header class="ib-afad-risk-layer__head ib-evds-risk-layer__head">
        <h3 class="ib-afad-risk-layer__title ib-evds-risk-layer__title">${e(layer.title)}</h3>
        <span class="ib-afad-risk-layer__badge ib-evds-risk-layer__badge ib-evds-risk-layer__badge--${e(riskToneClass(layer.riskLevel))}">${e(layer.riskLevel)} risk</span>
      </header>
      <p class="ib-afad-risk-layer__summary ib-evds-risk-layer__summary">${e(layer.summary)}</p>
      ${
        layer.bullets?.length
          ? `<ul class="ib-afad-risk-layer__bullets ib-evds-risk-layer__bullets">${layer.bullets.map((b) => `<li>${e(b)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        indicators
          ? `<div class="ib-afad-risk-layer__indicators ib-evds-risk-layer__indicators"><span class="ib-afad-risk-layer__ind-heading ib-evds-risk-layer__ind-heading">Göstergeler</span><ul>${indicators}</ul></div>`
          : ''
      }
      ${
        recentEvents
          ? `<div class="ib-afad-risk-layer__recent"><span class="ib-afad-risk-layer__ind-heading ib-evds-risk-layer__ind-heading">Son olaylar</span><ul class="ib-afad-risk-layer__bullets ib-evds-risk-layer__bullets">${recentEvents}</ul></div>`
          : ''
      }
      ${
        layer.aiExplanation
          ? `<p class="ib-afad-risk-layer__ai"><strong>AI açıklama:</strong> ${e(layer.aiExplanation)}</p>`
          : ''
      }
      <p class="ib-afad-risk-layer__disclaimer ib-evds-risk-layer__disclaimer">${e(layer.disclaimer)}</p>
    </section>`;
}

/**
 * AFAD snapshot çekip risk katmanı üretir.
 * @param {{ city?: string, district?: string }} location
 * @param {Function} [fetchImpl]
 */
export async function fetchAndBuildAfadRiskLayer(location = {}, fetchImpl = globalThis.fetch) {
  const snapshot = await fetchAfadRiskForEngine(location, fetchImpl);
  return buildAfadRiskLayer(snapshot);
}

/**
 * Sonuç panelinde AFAD deprem kartını yerleştirir.
 * @param {HTMLElement} root
 * @param {ReturnType<typeof buildAfadRiskLayer>} layer
 */
export function mountAfadRiskLayer(root, layer) {
  if (!root || !layer?.hasData || typeof document === 'undefined') return;

  root.querySelector('[data-afad-risk-layer]')?.remove();

  const html = renderAfadRiskLayerHtml(layer);
  if (!html) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const card = wrap.firstElementChild;
  if (!card) return;

  const evdsLayer = root.querySelector('[data-evds-risk-layer]');
  if (evdsLayer?.parentNode) {
    evdsLayer.insertAdjacentElement('afterend', card);
    return;
  }

  const economicMount = root.querySelector('[data-results-economic-mount]');
  if (economicMount?.parentNode) {
    economicMount.insertAdjacentElement('afterend', card);
  } else {
    root.prepend(card);
  }
}

export { buildAfadAssessmentText };
