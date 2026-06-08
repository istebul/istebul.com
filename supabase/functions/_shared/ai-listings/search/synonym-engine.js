/**
 * AI Listings Search — Turkish + English synonym mapping (Sprint-16 v2).
 */

import { normalizeText } from './normalizer.js';

/** @type {Readonly<Record<string, string>>} */
export const SYNONYM_MAP = Object.freeze({
  otomatik: 'automatic',
  automatic: 'automatic',
  auto: 'automatic',
  manuel: 'manual',
  manual: 'manual',
  dizel: 'diesel',
  diesel: 'diesel',
  benzin: 'gasoline',
  gasoline: 'gasoline',
  petrol: 'gasoline',
  lpg: 'lpg',
  elektrik: 'electric',
  electric: 'electric',
  hibrit: 'hybrid',
  hybrid: 'hybrid',
  suv: 'suv',
  jeep: 'suv',
  crossover: 'suv',
  sedan: 'sedan',
  hatchback: 'hatchback',
  station: 'station',
  wagon: 'station',
  coupe: 'coupe',
  cabrio: 'cabrio',
  pickup: 'pickup',
  'dusuk km': 'low_km',
  'düşük km': 'low_km',
  'az km': 'low_km',
  'low mileage': 'low_km',
  low_km: 'low_km',
  'yetkili servis': 'authorized_service',
  'servis bakimli': 'authorized_service',
  'servis bakımlı': 'authorized_service',
  'authorized service': 'authorized_service',
  'tek parca boya': 'paint_one_piece',
  'tek parça boya': 'paint_one_piece',
  'lokal boya': 'paint_one_piece',
  paint: 'paint_one_piece',
  boya: 'paint_one_piece',
  'm sport': 'm_sport',
  msport: 'm_sport',
  'm-sport': 'm_sport',
  arac: 'vehicle',
  araç: 'vehicle',
  vehicle: 'vehicle',
  konut: 'housing',
  housing: 'housing',
  tatil: 'vacation',
  vacation: 'vacation'
});

/** @type {Readonly<Record<string, string>>} */
const NORMALIZED_SYNONYM_MAP = Object.freeze(
  Object.fromEntries(Object.entries(SYNONYM_MAP).map(([key, value]) => [normalizeText(key), value]))
);

/**
 * @param {unknown} token
 * @returns {string}
 */
export function resolveSynonym(token) {
  const key = normalizeText(token);
  return NORMALIZED_SYNONYM_MAP[key] ?? key;
}

/**
 * @param {string[]} tokens
 * @returns {string[]}
 */
export function resolveSynonymTokens(tokens) {
  return tokens.map((token) => resolveSynonym(token));
}

/**
 * @param {string} phrase
 * @returns {string|null}
 */
export function resolvePhraseSynonym(phrase) {
  const key = normalizeText(phrase);
  return NORMALIZED_SYNONYM_MAP[key] ?? null;
}
