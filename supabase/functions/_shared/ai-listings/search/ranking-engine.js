/**
 * AI Listings Search — deterministic ranking engine (Sprint-15).
 */

import { normalizeText } from './normalizer.js';

/** @type {Readonly<Record<string, number>>} */
export const RANKING_WEIGHTS = Object.freeze({
  brand: 20,
  model: 20,
  year: 10,
  km: 10,
  fuel: 8,
  transmission: 8,
  attribute: 10,
  text: 8,
  quality_boost: 4,
  duplicate_penalty: -10
});

export const MIN_SIMILARITY_THRESHOLD = 40;

/**
 * @param {number} value
 * @returns {number}
 */
export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * @param {number} score
 * @returns {number}
 */
export function scoreToSimilarityPercent(score) {
  return clampScore(score);
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function textMatch(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

/**
 * @param {unknown} fuel
 * @returns {string}
 */
function normalizeFuel(fuel) {
  const value = normalizeText(fuel);
  if (!value) return '';
  if (value.includes('dizel') || value.includes('diesel')) return 'diesel';
  if (value.includes('benzin') || value.includes('gasoline') || value.includes('petrol')) return 'gasoline';
  if (value.includes('lpg')) return 'lpg';
  if (value.includes('elektr') || value.includes('electric')) return 'electric';
  if (value.includes('hibrit') || value.includes('hybrid')) return 'hybrid';
  return value;
}

/**
 * @param {unknown} transmission
 * @returns {string}
 */
function normalizeTransmission(transmission) {
  const value = normalizeText(transmission);
  if (!value) return '';
  if (value.includes('otomatik') || value.includes('automatic') || value.includes('auto')) return 'automatic';
  if (value.includes('manuel') || value.includes('manual')) return 'manual';
  return value;
}

/**
 * @param {Record<string, unknown>} doc
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @returns {{ score: number, breakdown: Record<string, number> }}
 */
export function rankDocument(doc, parsed) {
  /** @type {Record<string, number>} */
  const breakdown = {
    brand: 0,
    model: 0,
    year: 0,
    km: 0,
    fuel: 0,
    transmission: 0,
    attribute: 0,
    text: 0,
    quality_boost: 0,
    duplicate_penalty: 0
  };

  if (parsed.brand && textMatch(doc.brand, parsed.brand)) {
    breakdown.brand = RANKING_WEIGHTS.brand;
  }

  if (parsed.model && textMatch(doc.model, parsed.model)) {
    breakdown.model = RANKING_WEIGHTS.model;
  }

  if (parsed.year && Number(doc.year) === parsed.year) {
    breakdown.year = RANKING_WEIGHTS.year;
  }

  if (parsed.km !== null && doc.km !== null && doc.km !== undefined) {
    const docKm = Number(doc.km);
    if (Number.isFinite(docKm)) {
      const diff = Math.abs(docKm - parsed.km);
      if (diff <= 5000) breakdown.km = RANKING_WEIGHTS.km;
      else if (diff <= 20000) breakdown.km = Math.round(RANKING_WEIGHTS.km * 0.5);
    }
  }

  if (parsed.attributes.includes('low_km')) {
    const docKm = Number(doc.km);
    if (Number.isFinite(docKm) && docKm <= 50000) {
      breakdown.km = Math.max(breakdown.km, RANKING_WEIGHTS.km);
    }
  }

  if (parsed.fuel && normalizeFuel(doc.fuel) === parsed.fuel) {
    breakdown.fuel = RANKING_WEIGHTS.fuel;
  }

  if (parsed.transmission && normalizeTransmission(doc.transmission) === parsed.transmission) {
    breakdown.transmission = RANKING_WEIGHTS.transmission;
  }

  for (const attribute of parsed.attributes) {
    if (attribute === 'low_km') continue;
    const haystack = normalizeText(
      `${doc.title ?? ''} ${doc.description ?? ''} ${JSON.stringify(doc.attributes ?? {})}`
    );
    if (attribute === 'authorized_service' && (haystack.includes('yetkili') || haystack.includes('authorized'))) {
      breakdown.attribute += RANKING_WEIGHTS.attribute;
    } else if (
      attribute === 'paint_one_piece' &&
      (haystack.includes('tek parca') ||
        haystack.includes('tek parça') ||
        haystack.includes('lokal boya') ||
        haystack.includes('paint'))
    ) {
      breakdown.attribute += RANKING_WEIGHTS.attribute;
    }
  }

  const textTerms = [...parsed.text_terms, parsed.brand, parsed.model].filter(Boolean);
  if (textTerms.length) {
    const haystack = normalizeText(
      `${doc.title ?? ''} ${doc.description ?? ''} ${doc.brand ?? ''} ${doc.model ?? ''}`
    );
    const hits = textTerms.filter((term) => haystack.includes(normalizeText(term))).length;
    if (hits > 0) {
      breakdown.text = Math.round((hits / textTerms.length) * RANKING_WEIGHTS.text);
    }
  }

  const quality = Number(doc.quality_score);
  const ai = Number(doc.decision_score);
  if (Number.isFinite(quality) || Number.isFinite(ai)) {
    const avg = [quality, ai].filter(Number.isFinite).reduce((sum, v) => sum + v, 0) / 2;
    breakdown.quality_boost = Math.round((avg / 100) * RANKING_WEIGHTS.quality_boost);
  }

  if (doc.duplicate_status === 'exact' || doc.duplicate_status === 'similar') {
    breakdown.duplicate_penalty = RANKING_WEIGHTS.duplicate_penalty;
  }

  let score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  const hasPrimaryMatch = breakdown.brand > 0 || breakdown.model > 0 || breakdown.year > 0;
  if (hasPrimaryMatch && score > 0 && score < MIN_SIMILARITY_THRESHOLD) {
    score += 20;
  }

  return { score: clampScore(score), breakdown };
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {string} [sortBy]
 * @returns {Array<Record<string, unknown>>}
 */
export function sortSearchResults(results, sortBy = 'best_match') {
  const sort = String(sortBy ?? 'best_match').trim().toLowerCase();
  const sorted = [...results];

  switch (sort) {
    case 'newest':
      sorted.sort((a, b) => String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? '')));
      break;
    case 'highest_ai':
      sorted.sort((a, b) => Number(b.decision_score ?? 0) - Number(a.decision_score ?? 0));
      break;
    case 'lowest_risk':
      sorted.sort((a, b) => Number(a.risk_score ?? 999) - Number(b.risk_score ?? 999));
      break;
    case 'highest_quality':
      sorted.sort((a, b) => Number(b.quality_score ?? 0) - Number(a.quality_score ?? 0));
      break;
    case 'best_match':
    default:
      sorted.sort((a, b) => Number(b.search_score ?? 0) - Number(a.search_score ?? 0));
      break;
  }

  return sorted;
}
