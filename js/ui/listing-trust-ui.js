import { escapeHtml as defaultEscapeHtml } from '../core/security.js';
import {
  buildVehicleImageUiPayload,
  resolveVehicleImageTrust
} from '../auto/vehicle-image.js';
import { resolveListingImages } from '../features/listings/listing-media.js';

/** @typedef {{ id: string, label: string }} ListingTrustBadge */

const VEHICLE_LISTING_CATEGORIES = new Set(['arac', 'vehicle']);

const IMAGE_REPRESENTATION_LABEL = 'Görsel temsili';
const IMAGE_SOURCE_LABEL = 'Kaynak görseli';
const IMAGE_UNVERIFIED_LABEL = 'Görsel doğrulanamadı';
const GENERIC_LISTING_PLACEHOLDER = '/assets/images/placeholder.svg';

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
 * Resolves a safe public external URL from listing fields or first channel entry.
 * @param {Record<string, unknown>} [record]
 * @returns {string|null}
 */
export function resolvePublicExternalUrl(record = {}) {
  if (hasPublicSourceUrl(record)) {
    return String(record.source_url ?? record.external_url).trim();
  }

  const channelUrl = record.channels?.[0]?.url;
  if (channelUrl == null) return null;

  return hasPublicSourceUrl({ source_url: channelUrl })
    ? String(channelUrl).trim()
    : null;
}

/**
 * @param {unknown} category
 * @returns {boolean}
 */
export function isVehicleListingCategory(category) {
  const key = String(category ?? '').trim().toLowerCase();
  return VEHICLE_LISTING_CATEGORIES.has(key);
}

/**
 * @param {Record<string, unknown>} listing
 * @param {string[]} keys
 * @returns {string}
 */
function readListingAttribute(listing, keys) {
  const attrs =
    listing.attributes && typeof listing.attributes === 'object' && !Array.isArray(listing.attributes)
      ? /** @type {Record<string, unknown>} */ (listing.attributes)
      : {};

  for (const key of keys) {
    const direct = listing[key];
    if (direct != null && String(direct).trim()) return String(direct).trim();
    const fromAttrs = attrs[key];
    if (fromAttrs != null && String(fromAttrs).trim()) return String(fromAttrs).trim();
  }

  return '';
}

/**
 * @param {Record<string, unknown>} [listing]
 * @returns {string}
 */
function resolveListingPrimaryImageUrl(listing = {}) {
  const images = listing.images;
  if (Array.isArray(images) && images.length) {
    const first = images[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (first && typeof first === 'object' && /** @type {{ url?: string }} */ (first).url) {
      return String(/** @type {{ url?: string }} */ (first).url).trim();
    }
  }

  const fallback = listing.image_url ?? listing.imageUrl;
  if (fallback != null && String(fallback).trim()) return String(fallback).trim();

  return '';
}

/**
 * Maps a public /secenekler listing row to vehicle image resolver input.
 * @param {Record<string, unknown>} [listing]
 * @returns {Record<string, unknown>}
 */
export function mapListingToVehicleImageInput(listing = {}) {
  const name = String(listing.title ?? listing.name ?? '').trim();
  const imageUrl = resolveListingPrimaryImageUrl(listing);
  const yearRaw =
    readListingAttribute(listing, ['year', 'model_year']) ||
    (listing.year != null ? String(listing.year) : '') ||
    (listing.model_year != null ? String(listing.model_year) : '');

  return {
    name,
    title: name,
    image_url: imageUrl || null,
    brand: readListingAttribute(listing, ['vehicleBrand', 'vehicle_brand', 'brand']) || undefined,
    model: readListingAttribute(listing, ['model']) || undefined,
    year: yearRaw || undefined,
    model_year: yearRaw || undefined,
    trim: readListingAttribute(listing, ['trim']) || undefined
  };
}

/**
 * Vehicle image trust for araç listings only; null for other categories.
 * @param {Record<string, unknown>} [listing]
 * @returns {ReturnType<typeof resolveVehicleImageTrust>|null}
 */
export function resolveListingImageTrust(listing = {}) {
  if (!isVehicleListingCategory(listing.category)) return null;
  return resolveVehicleImageTrust(mapListingToVehicleImageInput(listing));
}

/**
 * Neutral public trust copy for the image badge on /secenekler surfaces.
 * @param {Record<string, unknown>} [listing]
 * @returns {string}
 */
export function getListingImageTrustBadgeLabel(listing = {}) {
  if (!isVehicleListingCategory(listing.category)) {
    return IMAGE_REPRESENTATION_LABEL;
  }

  if (!resolveListingPrimaryImageUrl(listing)) {
    return IMAGE_REPRESENTATION_LABEL;
  }

  const trust = resolveListingImageTrust(listing);
  if (!trust) return IMAGE_REPRESENTATION_LABEL;
  if (trust.showRealImage) return IMAGE_SOURCE_LABEL;
  return IMAGE_UNVERIFIED_LABEL;
}

/**
 * Trust-gated display URL for araç listing card/gallery surfaces.
 * @param {Record<string, unknown>} [listing]
 * @returns {string|null} Resolved URL for vehicle listings; null to use legacy listing image path.
 */
export function resolveListingTrustGatedImageUrl(listing = {}) {
  if (!isVehicleListingCategory(listing.category)) return null;
  return buildVehicleImageUiPayload(mapListingToVehicleImageInput(listing)).imageUrl;
}

/**
 * Trust-gated compare-card image for Seçenek-sourced comparison items.
 * @param {Record<string, unknown>} [item]
 * @returns {{ imageUrl: string, imageAlt: string }|null}
 */
export function resolveListingComparisonImageItem(item = {}) {
  if (String(item.sourceType || '') !== 'Seçenek') return null;

  const title = String(item.title || 'Seçenek');
  const seed =
    item.listingImageSeed && typeof item.listingImageSeed === 'object'
      ? /** @type {Record<string, unknown>} */ (item.listingImageSeed)
      : {};
  const category = String(item.categoryId || seed.category || '');
  const isVehicle = isVehicleListingCategory(category);

  if (isVehicle) {
    const vehicleInput = mapListingToVehicleImageInput({
      ...seed,
      category,
      title: item.title || seed.title,
      images: seed.images || (item.image ? [item.image] : undefined)
    });
    const uiPayload = buildVehicleImageUiPayload(vehicleInput);
    const trust = item.imageTrust || uiPayload.imageTrust;

    if (trust?.showRealImage === true && (item.image || uiPayload.imageUrl)) {
      return {
        imageUrl: String(item.image || uiPayload.imageUrl),
        imageAlt: title
      };
    }

    return {
      imageUrl: String(uiPayload.imageUrl),
      imageAlt: trust?.showRealImage === false ? IMAGE_UNVERIFIED_LABEL : title
    };
  }

  const listingLike = { ...seed, category };
  const imageUrl =
    item.image || resolveListingImages(listingLike, GENERIC_LISTING_PLACEHOLDER)[0] || GENERIC_LISTING_PLACEHOLDER;

  return { imageUrl: String(imageUrl), imageAlt: title };
}

/**
 * Trust-gated image list for araç listing gallery surfaces.
 * @param {Record<string, unknown>} [listing]
 * @returns {string[]|null}
 */
export function resolveTrustGatedListingImages(listing = {}) {
  const gatedUrl = resolveListingTrustGatedImageUrl(listing);
  return gatedUrl ? [gatedUrl] : null;
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

  badges.push({
    id: 'image-representation',
    label: getListingImageTrustBadgeLabel(listing)
  });

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
