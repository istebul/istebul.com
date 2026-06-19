/**
 * P6 — Partner objection handling (structured playbook).
 */
import { escapeHtml } from '../../core/dom-safe.js';

let objectionsCache = null;

const FALLBACK_OBJECTIONS = [
  {
    id: 'price_transparency',
    category: 'pricing',
    objection: 'Fiyat neden sitede yok?',
    response:
      'CPL ve kapasite offline tekliflenir; referans bant Starter ₺5.000+ sıcak lead. Pilot ile doğrulama.',
    close: 'Pilot + teklif iste linki gönderin.'
  }
];

async function loadObjectionsData() {
  if (objectionsCache) return objectionsCache;
  try {
    const res = await fetch('/data/sales/objections.json');
    objectionsCache = res.ok ? await res.json() : { objections: FALLBACK_OBJECTIONS };
  } catch {
    objectionsCache = { objections: FALLBACK_OBJECTIONS };
  }
  return objectionsCache;
}

export async function listObjections() {
  const data = await loadObjectionsData();
  return data.objections || [];
}

/**
 * @param {string} objectionId
 */
export async function getObjectionById(objectionId) {
  const list = await listObjections();
  return list.find((o) => o.id === objectionId) || null;
}

/**
 * @param {string} [category]
 */
export async function listObjectionsByCategory(category) {
  const list = await listObjections();
  if (!category) return list;
  return list.filter((o) => o.category === category);
}

/**
 * @param {string} query free-text match
 */
export async function searchObjections(query = '') {
  const q = String(query).trim().toLowerCase();
  if (!q) return listObjections();
  const list = await listObjections();
  return list.filter(
    (o) =>
      o.objection?.toLowerCase().includes(q) ||
      o.response?.toLowerCase().includes(q) ||
      o.id?.includes(q)
  );
}

export function formatObjectionCopy(item) {
  if (!item) return '';
  return [
    `İtiraz: ${item.objection}`,
    `Yanıt: ${item.response}`,
    item.close ? `Kapanış: ${item.close}` : null,
    item.proof ? `Kanıt: ${item.proof}` : null
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * @param {{ compact?: boolean }} [options]
 */
export async function renderObjectionPlaybookHtml(options = {}) {
  const list = await listObjections();
  const compact = options.compact === true;

  if (compact) {
    return `
      <div class="ib-sales-objection-compact" role="list">
        ${list
          .map(
            (o) => `
          <details class="ib-sales-objection-item" data-objection-id="${escapeHtml(o.id)}">
            <summary>${escapeHtml(o.objection)}</summary>
            <p>${escapeHtml(o.response)}</p>
            ${o.close ? `<p class="ib-sales-close"><strong>Kapanış:</strong> ${escapeHtml(o.close)}</p>` : ''}
          </details>`
          )
          .join('')}
      </div>`;
  }

  return `
    <div class="ib-sales-objection-grid" role="list">
      ${list
        .map(
          (o) => `
        <article class="ib-sales-objection-card" data-objection-id="${escapeHtml(o.id)}">
          <span class="ib-sales-tag">${escapeHtml(o.category || 'general')}</span>
          <h3>${escapeHtml(o.objection)}</h3>
          <p>${escapeHtml(o.response)}</p>
          ${o.close ? `<p class="ib-sales-close"><strong>Kapanış:</strong> ${escapeHtml(o.close)}</p>` : ''}
          ${o.proof ? `<a class="text-link" href="${escapeHtml(o.proof)}">Kanıt sayfası</a>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" data-sales-copy-objection="${escapeHtml(o.id)}">Metni kopyala</button>
        </article>`
        )
        .join('')}
    </div>`;
}
