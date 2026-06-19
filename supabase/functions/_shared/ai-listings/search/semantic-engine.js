/**
 * AI Listings Search — semantic field scoring engine (Sprint-16 v2).
 * Weighted scoring across all searchable fields; cached normalized text.
 */

import { normalizeText } from './normalizer.js';

/** @type {ReadonlyArray<string>} */
export const SEARCHABLE_FIELDS = Object.freeze([
  'title',
  'description',
  'brand',
  'model',
  'year',
  'fuel',
  'transmission',
  'tags',
  'attributes',
  'features',
  'normalizedText',
  'searchableText'
]);

/** @type {Readonly<Record<string, number>>} */
export const SEMANTIC_WEIGHTS = Object.freeze({
  brand: 25,
  model: 20,
  year: 15,
  attributes: 10,
  description: 10,
  tags: 10,
  fuel: 5,
  transmission: 5
});

/** @type {Map<string, string>} */
const normalizedTextCache = new Map();

/**
 * @param {Record<string, unknown>} doc
 * @returns {string[]}
 */
function extractTags(doc) {
  const tags = doc.tags ?? doc.analysis_tags;
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === 'string' && tags.trim()) return [tags];
  return [];
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {string[]}
 */
function extractFeatures(doc) {
  const features = doc.features ?? doc.attributes?.features;
  if (Array.isArray(features)) return features.map(String);
  if (typeof features === 'string' && features.trim()) return [features];
  return [];
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {string}
 */
export function buildSearchableText(doc) {
  const tags = extractTags(doc).join(' ');
  const features = extractFeatures(doc).join(' ');
  const attributes =
    doc.attributes && typeof doc.attributes === 'object' && !Array.isArray(doc.attributes)
      ? JSON.stringify(doc.attributes)
      : '';

  return [
    doc.title,
    doc.description,
    doc.brand,
    doc.model,
    doc.year,
    doc.fuel,
    doc.transmission,
    tags,
    attributes,
    features
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .map(String)
    .join(' ');
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {string}
 */
export function getCachedNormalizedText(doc) {
  const id = String(doc.id ?? doc.searchableText ?? buildSearchableText(doc));
  const cached = normalizedTextCache.get(id);
  if (cached) return cached;

  const normalized = normalizeText(doc.normalizedText ?? doc.searchableText ?? buildSearchableText(doc));
  normalizedTextCache.set(id, normalized);

  if (normalizedTextCache.size > 500) {
    const oldest = normalizedTextCache.keys().next().value;
    if (oldest) normalizedTextCache.delete(oldest);
  }

  return normalized;
}

/**
 * Clear normalized text cache (testing).
 */
export function clearNormalizedTextCache() {
  normalizedTextCache.clear();
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
 * @returns {{ breakdown: Record<string, number>, matched_fields: string[] }}
 */
export function computeSemanticScores(doc, parsed) {
  /** @type {Record<string, number>} */
  const breakdown = {
    brand: 0,
    model: 0,
    year: 0,
    attributes: 0,
    description: 0,
    tags: 0,
    fuel: 0,
    transmission: 0
  };

  /** @type {string[]} */
  const matched_fields = [];
  const haystack = getCachedNormalizedText(doc);
  const descriptionHaystack = normalizeText(`${doc.title ?? ''} ${doc.description ?? ''}`);
  const tagsHaystack = normalizeText(extractTags(doc).join(' '));

  if (parsed.brand && textMatch(doc.brand, parsed.brand)) {
    breakdown.brand = SEMANTIC_WEIGHTS.brand;
    matched_fields.push('brand');
  }

  if (parsed.model && textMatch(doc.model, parsed.model)) {
    breakdown.model = SEMANTIC_WEIGHTS.model;
    matched_fields.push('model');
  }

  if (parsed.year && Number(doc.year) === parsed.year) {
    breakdown.year = SEMANTIC_WEIGHTS.year;
    matched_fields.push('year');
  }

  if (parsed.fuel && normalizeFuel(doc.fuel) === parsed.fuel) {
    breakdown.fuel = SEMANTIC_WEIGHTS.fuel;
    matched_fields.push('fuel');
  }

  if (parsed.transmission && normalizeTransmission(doc.transmission) === parsed.transmission) {
    breakdown.transmission = SEMANTIC_WEIGHTS.transmission;
    matched_fields.push('transmission');
  }

  if (parsed.body_type && textMatch(doc.body_type ?? doc.segment, parsed.body_type)) {
    breakdown.attributes = Math.max(breakdown.attributes, SEMANTIC_WEIGHTS.attributes);
    matched_fields.push('attributes');
  }

  for (const attribute of parsed.attributes) {
    if (attribute === 'low_km') {
      const docKm = Number(doc.km);
      if (Number.isFinite(docKm) && docKm <= 50000) {
        breakdown.attributes = Math.max(breakdown.attributes, SEMANTIC_WEIGHTS.attributes);
        matched_fields.push('attributes');
      }
      continue;
    }

    if (attribute === 'm_sport' && (haystack.includes('m sport') || haystack.includes('msport'))) {
      breakdown.attributes = Math.max(breakdown.attributes, SEMANTIC_WEIGHTS.attributes);
      matched_fields.push('attributes');
    } else if (attribute === 'authorized_service' && (haystack.includes('yetkili') || haystack.includes('authorized'))) {
      breakdown.attributes = Math.max(breakdown.attributes, SEMANTIC_WEIGHTS.attributes);
      matched_fields.push('attributes');
    } else if (
      attribute === 'paint_one_piece' &&
      (haystack.includes('tek parca') ||
        haystack.includes('tek parça') ||
        haystack.includes('lokal boya') ||
        haystack.includes('paint') ||
        haystack.includes('boya'))
    ) {
      breakdown.attributes = Math.max(breakdown.attributes, SEMANTIC_WEIGHTS.attributes);
      matched_fields.push('attributes');
    }
  }

  const textTerms = [...parsed.text_terms, parsed.brand, parsed.model].filter(Boolean);
  if (textTerms.length) {
    const descHits = textTerms.filter((term) => descriptionHaystack.includes(normalizeText(term))).length;
    if (descHits > 0) {
      breakdown.description = Math.round((descHits / textTerms.length) * SEMANTIC_WEIGHTS.description);
      matched_fields.push('description');
    }

    const tagHits = textTerms.filter((term) => tagsHaystack.includes(normalizeText(term))).length;
    if (tagHits > 0) {
      breakdown.tags = Math.round((tagHits / textTerms.length) * SEMANTIC_WEIGHTS.tags);
      matched_fields.push('tags');
    }
  }

  if (parsed.km !== null && doc.km !== null && doc.km !== undefined) {
    const docKm = Number(doc.km);
    if (Number.isFinite(docKm)) {
      const diff = Math.abs(docKm - parsed.km);
      if (diff <= 5000) {
        breakdown.attributes = Math.max(breakdown.attributes, SEMANTIC_WEIGHTS.attributes);
        matched_fields.push('attributes');
      } else if (diff <= 20000) {
        breakdown.attributes = Math.max(breakdown.attributes, Math.round(SEMANTIC_WEIGHTS.attributes * 0.5));
        matched_fields.push('attributes');
      }
    }
  }

  return { breakdown, matched_fields: [...new Set(matched_fields)] };
}

/**
 * @param {Record<string, unknown>} doc
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @returns {number}
 */
export function computeSemanticScore(doc, parsed) {
  const { breakdown } = computeSemanticScores(doc, parsed);
  return Object.values(breakdown).reduce((sum, value) => sum + value, 0);
}
