import { clampScore } from './score-utils.js';

/** @type {ReadonlyArray<{ key: string, label: string, weight: number }>} */
const QUALITY_FIELDS = Object.freeze([
  { key: 'title', label: 'Başlık', weight: 15 },
  { key: 'description', label: 'Açıklama', weight: 15 },
  { key: 'price', label: 'Fiyat', weight: 15 },
  { key: 'location', label: 'Konum', weight: 10 },
  { key: 'photos', label: 'Fotoğraf', weight: 15 },
  { key: 'attributes', label: 'Özellikler', weight: 10 },
  { key: 'source_url', label: 'Kaynak URL', weight: 10 },
  { key: 'json', label: 'JSON', weight: 10 }
]);

/**
 * @param {Record<string, unknown>} listing
 */
function scoreTitle(listing) {
  const len = String(listing.title ?? '').trim().length;
  const score = len >= 12 ? 100 : len >= 6 ? 75 : len > 0 ? 45 : 0;
  return { field: 'title', label: 'Başlık', score, passed: len > 0 };
}

function scoreDescription(listing) {
  const len = String(listing.description ?? '').trim().length;
  const score = len >= 80 ? 100 : len >= 30 ? 75 : len > 0 ? 45 : 0;
  return { field: 'description', label: 'Açıklama', score, passed: len > 0 };
}

function scorePrice(listing) {
  const price = Number(listing.price);
  const passed = Number.isFinite(price) && price > 0;
  return { field: 'price', label: 'Fiyat', score: passed ? 100 : 0, passed };
}

function scoreLocation(listing) {
  const passed = String(listing.location ?? '').trim().length > 0;
  return { field: 'location', label: 'Konum', score: passed ? 100 : 0, passed };
}

function scorePhotos(listing) {
  const count = Array.isArray(listing.images) ? listing.images.length : 0;
  const score = count >= 5 ? 100 : count >= 3 ? 80 : count >= 1 ? 55 : 0;
  return { field: 'photos', label: 'Fotoğraf', score, passed: count > 0 };
}

function scoreAttributes(listing) {
  const attrs = listing.attributes;
  const keys = attrs && typeof attrs === 'object' && !Array.isArray(attrs) ? Object.keys(attrs) : [];
  const passed = keys.length > 0;
  const score = keys.length >= 4 ? 100 : keys.length >= 2 ? 70 : passed ? 45 : 0;
  return { field: 'attributes', label: 'Özellikler', score, passed };
}

function scoreSourceUrl(listing) {
  const url = String(listing.source_url ?? '');
  const passed = /^https?:\/\//i.test(url);
  return { field: 'source_url', label: 'Kaynak URL', score: passed ? 100 : url ? 40 : 0, passed };
}

function scoreJson(listing) {
  const attrs = listing.attributes;
  const passed = attrs && typeof attrs === 'object' && !Array.isArray(attrs);
  return { field: 'json', label: 'JSON', score: passed ? 100 : 0, passed: Boolean(passed) };
}

/**
 * @param {string[]} passed
 * @param {string[]} missing
 * @returns {string}
 */
function buildQualitySummary(passed, missing) {
  if (missing.length === 0) return 'Tüm temel alanlar yeterli görünüyor.';
  const passedPart = passed.slice(0, 3).join(' ve ') || 'Temel alanlar';
  const missingPart = missing.slice(0, 3).join(' ve ').toLowerCase();
  return `${passedPart} yeterli ancak ${missingPart} eksik.`;
}

/**
 * @param {Record<string, unknown>} listing
 */
export function runQualityEngine(listing) {
  const fieldScores = [
    scoreTitle(listing),
    scoreDescription(listing),
    scorePrice(listing),
    scoreLocation(listing),
    scorePhotos(listing),
    scoreAttributes(listing),
    scoreSourceUrl(listing),
    scoreJson(listing)
  ];

  const weightMap = Object.fromEntries(QUALITY_FIELDS.map((f) => [f.key, f.weight]));
  let weighted = 0;
  let totalWeight = 0;

  for (const item of fieldScores) {
    const weight = weightMap[item.field] ?? 10;
    weighted += item.score * weight;
    totalWeight += weight;
  }

  const quality_score = clampScore(totalWeight > 0 ? weighted / totalWeight : 0);
  const missing_fields = fieldScores.filter((item) => !item.passed).map((item) => item.label);
  const passed_fields = fieldScores.filter((item) => item.passed).map((item) => item.label);
  const quality_summary = buildQualitySummary(passed_fields, missing_fields);

  return { quality_score, missing_fields, passed_fields, quality_summary, field_scores: fieldScores };
}
