/**
 * AI Listings Search — searchable field helpers (Sprint-15).
 */

import { normalizeText } from './normalizer.js';

/** @type {ReadonlyArray<string>} */
export const SEARCHABLE_FIELDS = Object.freeze([
  'title',
  'description',
  'brand',
  'model',
  'year',
  'tags',
  'attributes',
  'features',
  'normalizedText',
  'searchableText'
]);

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function toStringList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '')).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

/**
 * @param {Record<string, unknown>} doc
 * @returns {string}
 */
export function buildSearchableText(doc) {
  const tags = toStringList(doc.tags).join(' ');
  const features = toStringList(doc.features).join(' ');
  const attributes =
    doc.attributes && typeof doc.attributes === 'object' && !Array.isArray(doc.attributes)
      ? JSON.stringify(doc.attributes)
      : String(doc.attributes ?? '');

  const parts = [
    doc.title,
    doc.description,
    doc.brand,
    doc.model,
    doc.year,
    tags,
    attributes,
    features,
    doc.normalizedText
  ];

  return normalizeText(parts.filter(Boolean).join(' '));
}

/**
 * @param {string} haystack
 * @param {string} attribute
 * @returns {boolean}
 */
function matchesAttributeInHaystack(haystack, attribute) {
  switch (attribute) {
    case 'authorized_service':
      return (
        haystack.includes('yetkili') ||
        haystack.includes('authorized') ||
        haystack.includes('servis bakim') ||
        haystack.includes('servis bakimli')
      );
    case 'paint_one_piece':
      return (
        haystack.includes('tek parca') ||
        haystack.includes('lokal boya') ||
        haystack.includes('boya') ||
        haystack.includes('paint')
      );
    case 'low_km':
      return haystack.includes('dusuk km') || haystack.includes('az km') || haystack.includes('low km');
    default:
      return false;
  }
}

/**
 * @param {Record<string, unknown>} doc
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @param {string} [rawQuery]
 * @returns {boolean}
 */
export function documentMatchesSearchQuery(doc, parsed, rawQuery = '') {
  const haystack = String(doc.searchableText ?? buildSearchableText(doc));
  const queryNorm = normalizeText(rawQuery || parsed.normalized || '');

  if (!queryNorm) return true;
  if (haystack.includes(queryNorm)) return true;

  if (parsed.brand && haystack.includes(normalizeText(parsed.brand))) return true;
  if (parsed.model && haystack.includes(normalizeText(parsed.model))) return true;
  if (parsed.year && haystack.includes(String(parsed.year))) return true;

  if (parsed.fuel && haystack.includes(parsed.fuel)) return true;
  if (parsed.transmission && haystack.includes(parsed.transmission)) return true;
  if (parsed.body_type && haystack.includes(parsed.body_type)) return true;

  for (const attribute of parsed.attributes) {
    if (matchesAttributeInHaystack(haystack, attribute)) return true;
  }

  const textTerms = [...parsed.text_terms, parsed.brand, parsed.model]
    .filter(Boolean)
    .map((term) => normalizeText(term));

  if (textTerms.length > 0 && textTerms.some((term) => haystack.includes(term))) {
    return true;
  }

  if (parsed.attributes.length > 0) {
    return parsed.attributes.some((attribute) => matchesAttributeInHaystack(haystack, attribute));
  }

  return false;
}
