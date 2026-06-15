import { escapeHtml as defaultEscapeHtml } from '../core/security.js';

/** @typedef {{ id: string, label: string }} ListingTrustBadge */

export const AI_SCORE_DISCLAIMER =
  'Bu değer veri güveni değil, metodolojik uyum skorudur.';

const PUBLIC_SOURCE_LABELS = Object.freeze({
  manual_seed: 'Editoryal katalog',
  manual: 'Editoryal katalog',
  user_listing: 'Kullanıcı gönderimi',
  csv: 'İçe aktarılan kaynak',
  json: 'İçe aktarılan kaynak',
  import: 'İçe aktarılan kaynak',
  partner_api: 'Partner kaynağı',
  partner_feed: 'Partner kaynağı',
  collector: 'Toplanan kaynak'
});

const LIMITED_SOURCE_LABEL = 'Kaynak bilgisi sınırlı';

/**
 * @param {unknown} sourceType
 * @returns {string}
 */
export function formatPublicSourceLabel(sourceType) {
  const key = String(sourceType ?? '').trim().toLowerCase();
  if (!key) return LIMITED_SOURCE_LABEL;
  return PUBLIC_SOURCE_LABELS[key] ?? LIMITED_SOURCE_LABEL;
}

/**
 * @param {Record<string, unknown>} [listing]
 * @returns {boolean}
 */
export function hasPublicSourceUrl(listing = {}) {
  const raw = listing.source_url ?? listing.external_url ?? null;
  if (raw == null) return false;

  const trimmed = String(raw).trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} [listing]
 * @param {{ showPublished?: boolean }} [options]
 * @returns {ListingTrustBadge[]}
 */
export function getListingTrustBadges(listing = {}, options = {}) {
  const badges = /** @type {ListingTrustBadge[]} */ ([]);

  if (options.showPublished !== false) {
    badges.push({ id: 'published', label: 'Yayınlanmış seçenek' });
  }

  const sourceLabel = formatPublicSourceLabel(listing.source_type);
  badges.push({ id: 'source', label: `Kaynak: ${sourceLabel}` });

  if (hasPublicSourceUrl(listing)) {
    badges.push({ id: 'source-link', label: 'Kaynak bağlantısı var' });
  } else {
    badges.push({ id: 'source-link-missing', label: 'Kaynak bağlantısı yok' });
  }

  badges.push({ id: 'image-representation', label: 'Görsel temsili' });

  return badges;
}

/**
 * @param {Record<string, unknown>} [listing]
 * @param {{ escapeHtml?: (value: unknown) => string, showPublished?: boolean }} [options]
 * @returns {string}
 */
export function buildListingTrustStripHtml(listing = {}, options = {}) {
  const escape = typeof options.escapeHtml === 'function' ? options.escapeHtml : defaultEscapeHtml;
  const badges = getListingTrustBadges(listing, options);
  const items = badges
    .map(
      (badge) =>
        `<span class="listing-trust-badge" data-trust-badge="${escape(badge.id)}">${escape(badge.label)}</span>`
    )
    .join('');

  return `<div class="listing-trust-strip" role="group" aria-label="Kaynak ve görünürlük bilgisi">${items}</div>`;
}
