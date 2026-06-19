/**
 * isteBul AI Listings Engine — deterministic scoring rules (Sprint-6).
 * Rules-based only; no LLM involvement.
 */

export const SCORING_ENGINE_VERSION = 'v1-rules-sprint6';

export const CURRENT_YEAR = 2026;

/** @type {Record<string, number>} */
export const HOUSING_SQM_BENCHMARK = {
  default: 28000,
  istanbul: 45000,
  ankara: 32000,
  izmir: 38000,
  antalya: 35000,
  bursa: 30000
};

/** @type {Record<string, number>} */
export const CITY_LOCATION_SCORE = {
  istanbul: 85,
  ankara: 75,
  izmir: 80,
  antalya: 78,
  bursa: 70,
  default: 55
};

/** @type {Record<string, number>} */
export const VEHICLE_FUEL_SCORE = {
  elektrik: 95,
  hibrit: 85,
  lpg: 70,
  dizel: 65,
  benzin: 55
};

/** Reference new-vehicle price (TRY) for depreciation heuristic. */
export const VEHICLE_REFERENCE_PRICE = 1_200_000;

/**
 * @param {string} city
 * @returns {keyof typeof HOUSING_SQM_BENCHMARK}
 */
export function normalizeCityKey(city) {
  const key = String(city ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
  if (key.includes('istanbul') || key.includes('İstanbul'.toLocaleLowerCase('tr-TR'))) return 'istanbul';
  if (key.includes('ankara')) return 'ankara';
  if (key.includes('izmir') || key.includes('İzmir'.toLocaleLowerCase('tr-TR'))) return 'izmir';
  if (key.includes('antalya')) return 'antalya';
  if (key.includes('bursa')) return 'bursa';
  return 'default';
}

/**
 * @param {Record<string, unknown>} attributes
 * @param {string[]} keys
 * @returns {unknown}
 */
export function readAttribute(attributes, keys) {
  if (!attributes || typeof attributes !== 'object') return undefined;
  for (const key of keys) {
    if (attributes[key] !== undefined && attributes[key] !== null && attributes[key] !== '') {
      return attributes[key];
    }
  }
  return undefined;
}
