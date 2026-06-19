/**
 * Executive Decision Engine — labels, strengths, risks, recommendations (Sprint-8).
 */

import { clampScore, safeNumber, CURRENT_YEAR } from '../engine/score-utils.js';

/** @type {ReadonlyArray<string>} */
export const FORBIDDEN_EXECUTIVE_PHRASES = Object.freeze([
  'kesinlikle alın',
  'garanti',
  'gerçek piyasa',
  'yatırım tavsiyesi',
  'kazanırsınız'
]);

/** @type {ReadonlyArray<string>} */
export const ALLOWED_EXECUTIVE_PHRASES = Object.freeze([
  'ön değerlendirme',
  'deterministik analiz',
  'mevcut bilgiler ışığında',
  'önerilir'
]);

/**
 * @param {number} executiveScore
 * @returns {string}
 */
export function getExecutiveLabel(executiveScore) {
  const score = clampScore(executiveScore);
  if (score >= 90) return 'Satın Alınabilir';
  if (score >= 75) return 'İncelenebilir';
  if (score >= 60) return 'Dikkatli İncelenmeli';
  if (score >= 40) return 'Riskli';
  return 'Önerilmez';
}

/**
 * @param {string} transmission
 * @returns {boolean}
 */
function isAutomaticTransmission(transmission) {
  const value = String(transmission ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
  return (
    value.includes('otomatik') ||
    value.includes('automatic') ||
    value.includes('dsg') ||
    value.includes('cvt') ||
    value.includes('yarı otomatik') ||
    value.includes('yari otomatik')
  );
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{
 *   quality?: { quality_score?: number, missing_fields?: string[] },
 *   price_intelligence?: { price_score?: number, deviation_pct?: number },
 *   market_intelligence?: { market_context_score?: number, segment_label?: string },
 *   risk?: { risk_score?: number, risk_label?: string },
 *   decision?: { strengths?: string[], risks?: string[] }
 * }} engines
 * @returns {string[]}
 */
export function buildExecutiveStrengths(listing, engines) {
  /** @type {string[]} */
  const strengths = [];

  const description = String(listing.description ?? '');
  const km = listing.km !== null && listing.km !== undefined ? safeNumber(listing.km) : null;

  if (/yetkili servis|servis kayıt|servis geçmişi/i.test(description)) {
    strengths.push('Yetkili servis');
  }
  if (km !== null && km >= 0 && km < 80000) {
    strengths.push('Düşük KM');
  }
  if (isAutomaticTransmission(listing.transmission)) {
    strengths.push('Otomatik');
  }
  if (description.trim().length >= 50) {
    strengths.push('Detaylı açıklama');
  }

  const qualityScore = Number(engines.quality?.quality_score);
  if (Number.isFinite(qualityScore) && qualityScore >= 75) {
    strengths.push('Yüksek veri kalitesi');
  }

  const deviation = Number(engines.price_intelligence?.deviation_pct);
  if (Number.isFinite(deviation) && deviation < -3) {
    strengths.push('Fiyat avantajı');
  }

  const year = listing.year !== null && listing.year !== undefined ? safeNumber(listing.year) : 0;
  if (year >= CURRENT_YEAR - 3) {
    strengths.push('Güncel model yılı');
  }

  for (const item of engines.decision?.strengths ?? []) {
    const normalized = String(item).trim();
    if (normalized && !strengths.some((s) => s.toLocaleLowerCase('tr-TR') === normalized.toLocaleLowerCase('tr-TR'))) {
      strengths.push(normalized.charAt(0).toUpperCase() + normalized.slice(1));
    }
  }

  return [...new Set(strengths)].slice(0, 6);
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{
 *   quality?: { missing_fields?: string[] },
 *   risk?: { risk_factors?: string[] },
 *   duplicate?: { status?: string|null }
 * }} engines
 * @returns {string[]}
 */
export function buildExecutiveRisks(listing, engines) {
  /** @type {string[]} */
  const risks = [];

  const missing = engines.quality?.missing_fields ?? [];
  if (missing.includes('Fotoğraf')) risks.push('Fotoğraf eksik');
  if (missing.includes('Konum')) risks.push('Konum eksik');
  if (missing.includes('Kaynak URL')) risks.push('Kaynak URL eksik');
  if (missing.includes('Açıklama')) risks.push('Açıklama eksik');

  for (const factor of engines.risk?.risk_factors ?? []) {
    const label = String(factor).trim();
    if (label && !risks.includes(label)) risks.push(label);
  }

  const duplicateStatus = String(engines.duplicate?.status ?? '');
  if (duplicateStatus === 'exact' || duplicateStatus === 'similar') {
    risks.push('Olası mükerrer kayıt');
  }

  const images = Array.isArray(listing.images) ? listing.images : [];
  if (images.length === 0 && !risks.includes('Fotoğraf eksik')) {
    risks.push('Fotoğraf eksik');
  }

  return [...new Set(risks)].slice(0, 6);
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{
 *   quality?: { missing_fields?: string[] },
 *   risk?: { risk_score?: number, risk_label?: string },
 *   duplicate?: { status?: string|null }
 * }} engines
 * @returns {string[]}
 */
export function buildExecutiveRecommendations(listing, engines) {
  /** @type {string[]} */
  const recommendations = [];

  const missing = engines.quality?.missing_fields ?? [];
  if (missing.includes('Fotoğraf')) recommendations.push('Eksik görseller eklenmeli');
  if (missing.includes('Konum')) recommendations.push('Konum belirtilmeli');
  if (missing.includes('Kaynak URL')) recommendations.push('Kaynak URL eklenmeli');
  if (missing.includes('Açıklama')) recommendations.push('Açıklama detaylandırılmalı');

  if (String(listing.category ?? '') === 'vehicle') {
    recommendations.push('Servis kayıtları doğrulanmalı');
  }

  const riskScore = Number(engines.risk?.risk_score);
  if (Number.isFinite(riskScore) && riskScore > 50) {
    recommendations.push('Ekspertiz raporu önerilir');
  }

  const duplicateStatus = String(engines.duplicate?.status ?? '');
  if (duplicateStatus === 'exact' || duplicateStatus === 'similar') {
    recommendations.push('Mükerrer kayıt kontrolü yapılmalı');
  }

  if (recommendations.length === 0) {
    recommendations.push('Mevcut bilgilerle ön değerlendirme tamamlandı; detaylı inceleme önerilir');
  }

  return [...new Set(recommendations)].slice(0, 6);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenExecutivePhrase(text) {
  const normalized = String(text ?? '').toLocaleLowerCase('tr-TR');
  return FORBIDDEN_EXECUTIVE_PHRASES.some((phrase) => normalized.includes(phrase));
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findForbiddenExecutivePhrases(text) {
  const normalized = String(text ?? '').toLocaleLowerCase('tr-TR');
  return FORBIDDEN_EXECUTIVE_PHRASES.filter((phrase) => normalized.includes(phrase));
}
