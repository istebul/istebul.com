/**
 * Listing Quality & Trust — trust signal engine (Sprint-23 v1).
 */

import { safeNumber, readAttribute, CURRENT_YEAR } from '../engine/score-utils.js';
import { runPriceIntelligence } from '../price/price-intelligence.js';
import { computeQualitySignals, resolveQualityCategoryKey } from './quality-signal-engine.js';

/**
 * @param {string} key
 * @param {string} label
 * @param {boolean} triggered
 * @param {string} [description]
 * @returns {{ key: string, label: string, triggered: boolean, description: string, penalty: number }}
 */
function trustSignal(key, label, triggered, description = '', penalty = 10) {
  return { key, label, triggered, description, penalty: triggered ? penalty : 0 };
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} [context]
 * @returns {Array<{ key: string, label: string, triggered: boolean, description: string, penalty: number }>}
 */
export function computeTrustSignals(listing, context = {}) {
  const attrs = /** @type {Record<string, unknown>} */ (listing.attributes ?? {});
  const category = resolveQualityCategoryKey(String(listing.category ?? context.category ?? 'vehicle'));
  const qualitySignals = computeQualitySignals(listing, context);
  const missingCritical = qualitySignals.filter((s) => !s.passed && s.score < 50);
  const imageCount = Array.isArray(listing.images) ? listing.images.length : 0;
  const descLen = String(listing.description ?? '').trim().length;
  const duplicate = String(context.duplicate_status ?? listing.duplicate_status ?? 'new');

  let suspiciousPrice = false;
  let priceNote = '';
  const priceIntel = context.price_intelligence ?? runPriceIntelligence(listing);
  const deviation = Math.abs(safeNumber(/** @type {Record<string, unknown>} */ (priceIntel).deviation_pct));
  const position = String(/** @type {Record<string, unknown>} */ (priceIntel).price_position ?? '');
  if (position === 'overpriced' && deviation >= 18) {
    suspiciousPrice = true;
    priceNote = 'Fiyat konumu yüksek görünüyor.';
  } else if (position === 'underpriced' && deviation >= 8) {
    suspiciousPrice = true;
    priceNote = 'Fiyat olağandışı düşük görünüyor.';
  } else if (safeNumber(listing.price) <= 0) {
    suspiciousPrice = true;
    priceNote = 'Fiyat bilgisi eksik veya geçersiz.';
  }

  let inconsistent = false;
  let inconsistencyNote = '';
  const year = safeNumber(readAttribute(attrs, ['year', 'model_year', 'building_year']));
  const km = safeNumber(readAttribute(attrs, ['km', 'mileage']));
  if (year > CURRENT_YEAR + 1) {
    inconsistent = true;
    inconsistencyNote = 'Model yılı tutarsız görünüyor.';
  } else if (km < 0) {
    inconsistent = true;
    inconsistencyNote = 'Kilometre değeri tutarsız.';
  } else if (category === 'housing') {
    const floor = safeNumber(readAttribute(attrs, ['floor']));
    const totalFloors = safeNumber(readAttribute(attrs, ['total_floors']));
    if (floor > 0 && totalFloors > 0 && floor > totalFloors) {
      inconsistent = true;
      inconsistencyNote = 'Kat bilgisi tutarsız görünüyor.';
    }
  }

  let stale = false;
  const updatedAt = listing.updated_at ?? listing.created_at;
  if (updatedAt) {
    const ageDays = (Date.now() - new Date(String(updatedAt)).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 120) stale = true;
  } else if (!listing.created_at) {
    stale = true;
  }

  const ownershipUncertainty =
    category === 'vehicle' &&
    qualitySignals.find((s) => s.key === 'ownershipCostAvailability')?.score < 50;

  return [
    trustSignal('suspiciousPrice', 'Şüpheli fiyat', suspiciousPrice, priceNote, 15),
    trustSignal(
      'missingCriticalFields',
      'Kritik alan eksikliği',
      missingCritical.length >= 3,
      `${missingCritical.length} kritik alan eksik görünüyor.`,
      Math.min(25, missingCritical.length * 6)
    ),
    trustSignal(
      'weakDescription',
      'Zayıf açıklama',
      descLen < 30,
      'Açıklama metni yetersiz.',
      8
    ),
    trustSignal(
      'lowImageEvidence',
      'Düşük görsel kanıt',
      imageCount < 2,
      'Yeterli fotoğraf bulunmuyor.',
      10
    ),
    trustSignal(
      'duplicateRisk',
      'Mükerrer ilan riski',
      duplicate === 'exact' || duplicate === 'similar',
      duplicate === 'exact' ? 'Birebir benzer ilan tespit edildi.' : 'Benzer ilan uyarısı var.',
      duplicate === 'exact' ? 20 : 12
    ),
    trustSignal(
      'inconsistentAttributes',
      'Tutarsız özellikler',
      inconsistent,
      inconsistencyNote || 'Özellik alanları tutarsız olabilir.',
      12
    ),
    trustSignal(
      'staleListingRisk',
      'Güncellik riski',
      stale,
      'İlan güncelliği düşük görünüyor.',
      8
    ),
    trustSignal(
      'ownershipCostUncertainty',
      'Maliyet belirsizliği',
      Boolean(ownershipUncertainty),
      'Sahip olma maliyeti için yeterli veri yok.',
      5
    )
  ];
}

/**
 * @param {Array<{ penalty: number }>} signals
 * @returns {number}
 */
export function aggregateTrustScore(signals) {
  let score = 100;
  for (const item of signals) {
    score -= Number(item.penalty ?? 0);
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * @param {number} score
 * @returns {'high'|'medium'|'low'}
 */
export function mapTrustLevel(score) {
  const s = Number(score) || 0;
  if (s >= 75) return 'high';
  if (s >= 50) return 'medium';
  return 'low';
}

/**
 * @param {'high'|'medium'|'low'|string} level
 * @returns {string}
 */
export function buildTrustLevelLabelTr(level) {
  if (level === 'high') return 'Yüksek güven';
  if (level === 'medium') return 'Orta güven';
  return 'Düşük güven';
}

/**
 * @param {number} trustScore
 * @param {Array<{ triggered: boolean, penalty: number }>} trustSignals
 * @param {number} qualityScore
 * @returns {'low'|'medium'|'high'}
 */
export function classifyListingRiskLevel(trustScore, trustSignals, qualityScore) {
  const triggeredCount = trustSignals.filter((s) => s.triggered).length;
  const highPenalty = trustSignals.some((s) => s.triggered && s.penalty >= 20);

  if (trustScore < 45 || highPenalty || (triggeredCount >= 4 && trustScore < 60)) return 'high';
  if (trustScore < 70 || triggeredCount >= 2 || qualityScore < 50) return 'medium';
  return 'low';
}

/**
 * @param {'low'|'medium'|'high'|string} level
 * @returns {string}
 */
export function buildRiskLevelLabelTr(level) {
  if (level === 'low') return 'Düşük risk';
  if (level === 'high') return 'Yüksek risk';
  return 'Orta risk';
}

/**
 * @param {'low'|'medium'|'high'|string} level
 * @returns {'low'|'mid'|'high'}
 */
export function mapRiskLevelClass(level) {
  if (level === 'low') return 'low';
  if (level === 'high') return 'high';
  return 'mid';
}
