/**
 * TÜİK Referans Katmanı — karar sonuç ekranları için skor-nötr bilgilendirme katmanı.
 * Ana karar skorunu değiştirmez; yalnızca sanitize edilmiş /api/tuik-snapshot verisini sunar.
 */
import { escapeHtml } from '../../core/security.js';

export const TUIK_REFERENCE_LAYER_TITLE = 'TÜİK referans verisi';

export const TUIK_REFERENCE_LAYER_DISCLAIMER =
  'Bilgilendirme amaçlıdır · Karar skoru üretmez · Ham tablo yayınlamaz · Manuel gözden geçirilmiş referans snapshot';

const TUIK_SNAPSHOT_ENDPOINT = '/api/tuik-snapshot';

const BANNED_PHRASES = [
  /tavsiye eder/giu,
  /skoru artırır/giu,
  /canlı bağlı/giu,
  /resmi api/giu,
  /upstream/giu
];

function safeString(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function normalizeVerticalId(value) {
  return safeString(value).toLowerCase();
}

function normalizeSnapshot(snapshot = {}) {
  if (snapshot?.data && (snapshot.ok != null || snapshot.meta != null)) {
    return {
      ok: Boolean(snapshot.ok),
      data: snapshot.data || {},
      meta: snapshot.meta || {}
    };
  }

  return {
    ok: safeString(snapshot.status) === 'reference',
    data: snapshot || {},
    meta: snapshot.meta && typeof snapshot.meta === 'object' ? snapshot.meta : {}
  };
}

function buildEmptyLayer() {
  return {
    hasData: false,
    items: [],
    attribution: {
      provider: 'Türkiye İstatistik Kurumu (TÜİK)',
      url: '',
      disclaimer: ''
    },
    disclaimer: TUIK_REFERENCE_LAYER_DISCLAIMER,
    lastReviewed: '',
    source: 'tuik',
    status: 'reference',
    scoreImpact: false
  };
}

function normalizeCategoryItem(category = {}) {
  const id = safeString(category.id);
  const title = safeString(category.title);
  if (!id || !title) return null;
  if (category.scoreImpact === true) return null;

  const relatedVerticals = Array.isArray(category.relatedVerticals)
    ? category.relatedVerticals.map(normalizeVerticalId).filter(Boolean)
    : [];

  return {
    id,
    title,
    usage: safeString(category.usage),
    relatedVerticals,
    scoreImpact: false
  };
}

function filterCategories(categories = [], vertical = '') {
  const normalizedVertical = normalizeVerticalId(vertical);
  const items = categories.map(normalizeCategoryItem).filter(Boolean);

  if (!normalizedVertical) return items;

  return items.filter((item) => item.relatedVerticals.includes(normalizedVertical));
}

function buildTuikSnapshotUrl(vertical = '') {
  const trimmed = safeString(vertical);
  if (!trimmed) return TUIK_SNAPSHOT_ENDPOINT;
  const params = new URLSearchParams();
  params.set('vertical', trimmed);
  return `${TUIK_SNAPSHOT_ENDPOINT}?${params.toString()}`;
}

/**
 * /api/tuik-snapshot yanıtını çeker ve normalize eder.
 * @param {{ vertical?: string, fetchImpl?: typeof fetch }} [options]
 * @returns {Promise<{ ok: boolean, data: object, meta: object }|null>}
 */
export async function fetchTuikReferenceSnapshot({ vertical, fetchImpl } = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== 'function') return null;

  try {
    const response = await fetchFn(buildTuikSnapshotUrl(vertical), {
      credentials: 'same-origin'
    });
    if (!response.ok) return null;

    const body = await response.json();
    if (!body || typeof body !== 'object') return null;

    return normalizeSnapshot(body);
  } catch {
    return null;
  }
}

/**
 * TÜİK snapshot yanıtından skor-nötr bilgilendirme katmanı üretir.
 * @param {{ ok?: boolean, data?: object, meta?: object }|object|null} snapshot
 * @param {{ vertical?: string }} [options]
 */
export function buildTuikReferenceLayer(snapshot, options = {}) {
  if (!snapshot) return buildEmptyLayer();

  const normalized = normalizeSnapshot(snapshot);
  const data = normalized.data || {};
  const meta = normalized.meta || {};
  const status = safeString(data.status).toLowerCase();

  if (status !== 'reference') return buildEmptyLayer();
  if (meta.scoreImpact === true) return buildEmptyLayer();

  const items = filterCategories(data.categories, options.vertical);
  if (!items.length) return buildEmptyLayer();

  const attribution = {
    provider: safeString(data.attribution?.provider, 'Türkiye İstatistik Kurumu (TÜİK)'),
    url: safeString(data.attribution?.url),
    disclaimer: safeString(data.attribution?.disclaimer)
  };

  return {
    hasData: true,
    items,
    attribution,
    disclaimer: TUIK_REFERENCE_LAYER_DISCLAIMER,
    lastReviewed: safeString(data.lastReviewed),
    source: safeString(data.source, 'tuik') || 'tuik',
    status: 'reference',
    scoreImpact: false
  };
}

/**
 * TÜİK referans katmanı kartı HTML.
 * @param {ReturnType<typeof buildTuikReferenceLayer>} viewModel
 * @param {{ esc?: Function }} [options]
 */
export function renderTuikReferenceLayer(viewModel, options = {}) {
  if (!viewModel?.hasData) return '';

  const esc = options.esc || escapeHtml;
  const items = (viewModel.items || [])
    .map(
      (item) => `
        <li class="ib-tuik-reference-layer__item">
          <strong class="ib-tuik-reference-layer__item-title">${esc(item.title)}</strong>
          ${
            item.usage
              ? `<p class="ib-tuik-reference-layer__item-usage">${esc(item.usage)}</p>`
              : ''
          }
        </li>`
    )
    .join('');

  const attributionProvider = esc(viewModel.attribution?.provider || 'Türkiye İstatistik Kurumu (TÜİK)');
  const attributionDisclaimer = viewModel.attribution?.disclaimer
    ? `<p class="ib-tuik-reference-layer__attribution-note">${esc(viewModel.attribution.disclaimer)}</p>`
    : '';
  const lastReviewed = viewModel.lastReviewed
    ? `<p class="ib-tuik-reference-layer__reviewed">Son gözden geçirme: ${esc(viewModel.lastReviewed)}</p>`
    : '';

  return `
    <section class="ib-tuik-reference-layer" data-tuik-reference-layer aria-label="${esc(TUIK_REFERENCE_LAYER_TITLE)}">
      <header class="ib-tuik-reference-layer__head">
        <h3 class="ib-tuik-reference-layer__title">${esc(TUIK_REFERENCE_LAYER_TITLE)}</h3>
      </header>
      <ul class="ib-tuik-reference-layer__items">${items}</ul>
      <p class="ib-tuik-reference-layer__attribution">${attributionProvider}</p>
      ${attributionDisclaimer}
      ${lastReviewed}
      <p class="ib-tuik-reference-layer__disclaimer">${esc(viewModel.disclaimer)}</p>
    </section>`;
}

/**
 * Container içine TÜİK referans katmanını yerleştirir (yardımcı API; bu fazda bağlanmaz).
 * @param {HTMLElement|null|undefined} container
 * @param {ReturnType<typeof buildTuikReferenceLayer>} viewModel
 * @returns {boolean}
 */
export function mountTuikReferenceLayer(container, viewModel) {
  if (!container || !viewModel?.hasData) return false;

  const html = renderTuikReferenceLayer(viewModel);
  if (!html) return false;

  for (const pattern of BANNED_PHRASES) {
    pattern.lastIndex = 0;
    if (pattern.test(html)) return false;
  }

  container.innerHTML = html;
  return true;
}
