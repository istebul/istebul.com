import { clampScore } from '../scoring/score-utils.js';

/** @typedef {{ key: string, label: string, weight: number }} QualityField */

/** @type {ReadonlyArray<QualityField>} */
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
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 * @returns {{ field: string, label: string, score: number, passed: boolean }}
 */
function scoreTitle(listing) {
  const len = listing.title.length;
  const score = len >= 12 ? 100 : len >= 6 ? 75 : len > 0 ? 45 : 0;
  return { field: 'title', label: 'Başlık', score, passed: len > 0 };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 */
function scoreDescription(listing) {
  const len = listing.description.length;
  const score = len >= 80 ? 100 : len >= 30 ? 75 : len > 0 ? 45 : 0;
  return { field: 'description', label: 'Açıklama', score, passed: len > 0 };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 */
function scorePrice(listing) {
  const passed = Number.isFinite(listing.price) && listing.price > 0;
  return { field: 'price', label: 'Fiyat', score: passed ? 100 : 0, passed };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 */
function scoreLocation(listing) {
  const passed = listing.location.length > 0;
  return { field: 'location', label: 'Konum', score: passed ? 100 : 0, passed };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 */
function scorePhotos(listing) {
  const count = listing.images.length;
  const score = count >= 5 ? 100 : count >= 3 ? 80 : count >= 1 ? 55 : 0;
  return { field: 'photos', label: 'Fotoğraf', score, passed: count > 0 };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 */
function scoreAttributes(listing) {
  const keys = Object.keys(listing.attributes ?? {});
  const passed = keys.length > 0;
  const score = keys.length >= 4 ? 100 : keys.length >= 2 ? 70 : passed ? 45 : 0;
  return { field: 'attributes', label: 'Özellikler', score, passed };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 */
function scoreSourceUrl(listing) {
  const url = listing.source_url;
  const passed = /^https?:\/\//i.test(url);
  return { field: 'source_url', label: 'Kaynak URL', score: passed ? 100 : url ? 40 : 0, passed };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 */
function scoreJson(listing) {
  const attrs = listing.attributes;
  const valid = attrs && typeof attrs === 'object' && !Array.isArray(attrs);
  const passed = Boolean(valid);
  return { field: 'json', label: 'JSON', score: passed ? 100 : 0, passed };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 * @returns {{
 *   quality_score: number,
 *   missing_fields: string[],
 *   quality_summary: string,
 *   field_scores: Array<{ field: string, label: string, score: number, passed: boolean }>
 * }}
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

  let quality_summary = 'Veri kalitesi yeterli görünüyor.';
  if (quality_score < 50) {
    quality_summary = 'Veri kalitesi düşük; eksik alanlar tamamlanmalı.';
  } else if (quality_score < 75) {
    quality_summary = 'Veri kalitesi orta seviyede; bazı alanlar iyileştirilebilir.';
  } else if (missing_fields.length > 0) {
    quality_summary = `Genel kalite iyi; eksik: ${missing_fields.slice(0, 3).join(', ')}.`;
  }

  return { quality_score, missing_fields, quality_summary, field_scores: fieldScores };
}
