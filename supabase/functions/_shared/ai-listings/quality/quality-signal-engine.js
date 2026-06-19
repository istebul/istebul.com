/**
 * Listing Quality & Trust — category quality signal engine (Sprint-23 v1).
 */

import { safeNumber, readAttribute } from '../engine/score-utils.js';

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function scorePresence(value) {
  return hasText(value) || safeNumber(value) > 0 ? 100 : 0;
}

/**
 * @param {number} count
 * @param {number} good
 * @param {number} min
 * @returns {number}
 */
function scoreImageCount(count, good = 5, min = 1) {
  if (count >= good) return 100;
  if (count >= 3) return 80;
  if (count >= min) return 55;
  return 0;
}

/**
 * @param {number} len
 * @param {number} good
 * @param {number} min
 * @returns {number}
 */
function scoreDescriptionLength(len, good = 80, min = 20) {
  if (len >= good) return 100;
  if (len >= 40) return 75;
  if (len >= min) return 45;
  return len > 0 ? 25 : 0;
}

/**
 * @param {string} key
 * @param {string} label
 * @param {number} score
 * @returns {{ key: string, label: string, score: number, passed: boolean }}
 */
function signal(key, label, score) {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  return { key, label, score: s, passed: s >= 50 };
}

/**
 * @param {'vehicle'|'housing'|'travel'|string} category
 * @returns {'vehicle'|'housing'|'travel'}
 */
export function resolveQualityCategoryKey(category) {
  const cat = String(category ?? 'vehicle').toLowerCase();
  if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') return 'housing';
  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') return 'travel';
  return 'vehicle';
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} [context]
 * @returns {Array<{ key: string, label: string, score: number, passed: boolean }>}
 */
export function computeQualitySignals(listing, context = {}) {
  const category = resolveQualityCategoryKey(
    String(listing.category ?? context.category ?? 'vehicle')
  );
  const attrs = /** @type {Record<string, unknown>} */ (listing.attributes ?? {});
  const imageCount = Array.isArray(listing.images) ? listing.images.length : 0;
  const descLen = String(listing.description ?? '').trim().length;

  const common = [
    signal('priceCompleteness', 'Fiyat bilgisi', scorePresence(listing.price)),
    signal('locationCompleteness', 'Konum bilgisi', scorePresence(listing.location)),
    signal('imageCompleteness', 'Görsel kanıt', scoreImageCount(imageCount)),
    signal(
      'descriptionCompleteness',
      'Açıklama kalitesi',
      scoreDescriptionLength(descLen)
    )
  ];

  if (category === 'housing') {
    return [
      ...common,
      signal(
        'squareMeterCompleteness',
        'Metrekare bilgisi',
        scorePresence(readAttribute(attrs, ['square_meter', 'sqm', 'm2', 'area']))
      ),
      signal(
        'roomCompleteness',
        'Oda sayısı',
        scorePresence(readAttribute(attrs, ['rooms', 'room_count', 'bedrooms']))
      ),
      signal(
        'buildingAgeCompleteness',
        'Bina yaşı',
        scorePresence(readAttribute(attrs, ['building_age', 'building_year', 'age']))
      ),
      signal(
        'floorCompleteness',
        'Kat bilgisi',
        scorePresence(readAttribute(attrs, ['floor', 'total_floors']))
      ),
      signal(
        'financingCostAvailability',
        'Finansman maliyeti verisi',
        safeNumber(listing.price) > 0 && hasText(listing.location) ? 85 : 30
      )
    ];
  }

  if (category === 'travel') {
    return [
      ...common,
      signal(
        'dateCompleteness',
        'Tarih bilgisi',
        scorePresence(readAttribute(attrs, ['check_in', 'check_out', 'dates', 'start_date']))
      ),
      signal(
        'capacityCompleteness',
        'Kapasite bilgisi',
        scorePresence(readAttribute(attrs, ['capacity', 'guests', 'guest_count']))
      ),
      signal(
        'amenityCompleteness',
        'Olanak bilgisi',
        scorePresence(readAttribute(attrs, ['amenities', 'features']))
      ),
      signal(
        'cancellationPolicyCompleteness',
        'İptal koşulu bilgisi',
        scorePresence(readAttribute(attrs, ['cancellation_policy', 'cancel_policy']))
      )
    ];
  }

  return [
    ...common,
    signal(
      'mileageCompleteness',
      'Kilometre bilgisi',
      scorePresence(readAttribute(attrs, ['km', 'mileage', 'kilometer']))
    ),
    signal(
      'yearCompleteness',
      'Model yılı',
      scorePresence(readAttribute(attrs, ['year', 'model_year']))
    ),
    signal(
      'fuelCompleteness',
      'Yakıt tipi',
      scorePresence(readAttribute(attrs, ['fuel', 'fuel_type']))
    ),
    signal(
      'transmissionCompleteness',
      'Vites tipi',
      scorePresence(readAttribute(attrs, ['transmission', 'gearbox', 'gear']))
    ),
    signal(
      'ownershipCostAvailability',
      'Sahip olma maliyeti verisi',
      safeNumber(listing.price) > 0 && hasText(listing.location) ? 85 : 30
    )
  ];
}

/**
 * @param {Array<{ score: number }>} signals
 * @returns {number}
 */
export function aggregateQualityScore(signals) {
  if (!Array.isArray(signals) || !signals.length) return 0;
  const total = signals.reduce((sum, item) => sum + Number(item.score ?? 0), 0);
  return Math.round(total / signals.length);
}

/**
 * @param {number} score
 * @returns {'excellent'|'good'|'fair'|'weak'}
 */
export function mapQualityLevel(score) {
  const s = Number(score) || 0;
  if (s >= 85) return 'excellent';
  if (s >= 70) return 'good';
  if (s >= 50) return 'fair';
  return 'weak';
}

/**
 * @param {'excellent'|'good'|'fair'|'weak'|string} level
 * @returns {string}
 */
export function buildQualityLevelLabelTr(level) {
  if (level === 'excellent') return 'Çok güçlü';
  if (level === 'good') return 'Güçlü';
  if (level === 'fair') return 'Orta';
  return 'Zayıf';
}
