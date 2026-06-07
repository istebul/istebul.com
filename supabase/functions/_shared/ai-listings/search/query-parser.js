/**
 * AI Listings Search — deterministic query parser (Sprint-15).
 */

import { normalizeText, parseKmValue, parsePriceValue } from './normalizer.js';
import { tokenize } from './tokenizer.js';
import { resolvePhraseSynonym, resolveSynonym } from './synonym-engine.js';

/** @type {ReadonlySet<string>} */
const KNOWN_BRANDS = new Set([
  'bmw',
  'audi',
  'mercedes',
  'volkswagen',
  'vw',
  'toyota',
  'honda',
  'ford',
  'renault',
  'fiat',
  'hyundai',
  'kia',
  'volvo',
  'peugeot',
  'citroen',
  'opel',
  'skoda',
  'seat',
  'nissan',
  'mazda',
  'mitsubishi',
  'porsche',
  'jeep',
  'dacia',
  'land',
  'rover',
  'mini',
  'cupra',
  'tesla',
  'chery',
  'mg',
  'suzuki',
  'subaru',
  'lexus',
  'infiniti',
  'jaguar',
  'alfa',
  'romeo',
  'lancia',
  'ds',
  'smart',
  'togg'
]);

/**
 * @typedef {Object} ParsedSearchQuery
 * @property {string} raw
 * @property {string} normalized
 * @property {string[]} tokens
 * @property {string|null} brand
 * @property {string|null} model
 * @property {number|null} year
 * @property {number|null} km
 * @property {number|null} price
 * @property {string|null} fuel
 * @property {string|null} transmission
 * @property {string|null} body_type
 * @property {string|null} segment
 * @property {string|null} category
 * @property {string[]} attributes
 * @property {string[]} text_terms
 */

/**
 * @param {unknown} query
 * @param {{ knownBrands?: Set<string>, knownModels?: Set<string> }} [options]
 * @returns {ParsedSearchQuery}
 */
export function parseSearchQuery(query, options = {}) {
  const raw = String(query ?? '').trim();
  const normalized = normalizeText(raw);
  const tokens = tokenize(raw);

  /** @type {ParsedSearchQuery} */
  const parsed = {
    raw,
    normalized,
    tokens,
    brand: null,
    model: null,
    year: null,
    km: null,
    price: null,
    fuel: null,
    transmission: null,
    body_type: null,
    segment: null,
    category: null,
    attributes: [],
    text_terms: []
  };

  if (!normalized) return parsed;

  const knownBrands = options.knownBrands ?? KNOWN_BRANDS;
  const knownModels = options.knownModels ?? new Set();

  const kmValue = parseKmValue(raw);
  if (kmValue !== null) parsed.km = kmValue;

  const priceValue = parsePriceValue(raw);
  if (priceValue !== null) parsed.price = priceValue;

  const consumed = new Set();

  for (let i = 0; i < tokens.length; i++) {
    const phrase = `${tokens[i]} ${tokens[i + 1] ?? ''}`.trim();
    const phraseSyn = resolvePhraseSynonym(phrase);
    if (phraseSyn && tokens[i + 1]) {
      applyParsedValue(parsed, phraseSyn);
      consumed.add(i);
      consumed.add(i + 1);
      i += 1;
      continue;
    }

    const syn = resolveSynonym(tokens[i]);
    if (syn !== tokens[i] || isCanonicalSynonymValue(syn)) {
      applyParsedValue(parsed, syn);
      consumed.add(i);
      continue;
    }

    const yearMatch = tokens[i].match(/^(19|20)\d{2}$/);
    if (yearMatch) {
      parsed.year = Number(tokens[i]);
      consumed.add(i);
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;
    const token = tokens[i];

    if (!parsed.brand) {
      const brandCandidate = token.toLowerCase();
      if (knownBrands.has(brandCandidate)) {
        parsed.brand = capitalizeBrand(token);
        consumed.add(i);
        if (tokens[i + 1] && knownModels.has(tokens[i + 1].toLowerCase())) {
          parsed.model = tokens[i + 1];
          consumed.add(i + 1);
          i += 1;
        }
        continue;
      }
    }

    if (!parsed.model && parsed.brand && /^[a-z0-9][\w.-]*$/i.test(token)) {
      parsed.model = token;
      consumed.add(i);
      continue;
    }

    parsed.text_terms.push(token);
  }

  if (!parsed.brand) {
    for (let i = 0; i < tokens.length; i++) {
      if (consumed.has(i)) continue;
      const token = tokens[i];
      if (knownBrands.has(token.toLowerCase())) {
        parsed.brand = capitalizeBrand(token);
        consumed.add(i);
        break;
      }
    }
  }

  return parsed;
}

/** @type {ReadonlySet<string>} */
const CANONICAL_SYNONYM_VALUES = new Set([
  'automatic',
  'manual',
  'diesel',
  'gasoline',
  'lpg',
  'electric',
  'hybrid',
  'suv',
  'sedan',
  'hatchback',
  'station',
  'coupe',
  'cabrio',
  'pickup',
  'vehicle',
  'housing',
  'vacation',
  'low_km',
  'authorized_service',
  'paint_one_piece'
]);

/**
 * @param {string} value
 * @returns {boolean}
 */
function isCanonicalSynonymValue(value) {
  return CANONICAL_SYNONYM_VALUES.has(value);
}

/**
 * @param {ParsedSearchQuery} parsed
 * @param {string} value
 */
function applyParsedValue(parsed, value) {
  switch (value) {
    case 'automatic':
    case 'manual':
      parsed.transmission = value;
      break;
    case 'diesel':
    case 'gasoline':
    case 'lpg':
    case 'electric':
    case 'hybrid':
      parsed.fuel = value;
      break;
    case 'suv':
    case 'sedan':
    case 'hatchback':
    case 'station':
    case 'coupe':
    case 'cabrio':
    case 'pickup':
      parsed.body_type = value;
      parsed.segment = value;
      break;
    case 'vehicle':
      parsed.category = 'vehicle';
      break;
    case 'housing':
      parsed.category = 'housing';
      break;
    case 'vacation':
      parsed.category = 'vacation';
      break;
    case 'low_km':
    case 'authorized_service':
    case 'paint_one_piece':
      if (!parsed.attributes.includes(value)) parsed.attributes.push(value);
      break;
    default:
      break;
  }
}

/**
 * @param {string} token
 * @returns {string}
 */
function capitalizeBrand(token) {
  const upper = token.toUpperCase();
  if (upper === 'BMW' || upper === 'VW' || upper === 'DS' || upper === 'MG') return upper;
  if (upper === 'MERCEDES') return 'Mercedes';
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/**
 * @param {Array<Record<string, unknown>>} documents
 * @returns {{ brands: Set<string>, models: Set<string> }}
 */
export function extractKnownBrandsModels(documents) {
  /** @type {Set<string>} */
  const brands = new Set(KNOWN_BRANDS);
  /** @type {Set<string>} */
  const models = new Set();

  for (const doc of documents) {
    const brand = normalizeText(doc.brand);
    const model = normalizeText(doc.model);
    if (brand) brands.add(brand);
    if (model) models.add(model);
  }

  return { brands, models };
}
