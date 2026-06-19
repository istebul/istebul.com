/**
 * Market Intelligence — vehicle segment detection (Sprint-7).
 */

import { PREMIUM_BRANDS } from './market-model.js';

/** @type {ReadonlyArray<string>} */
const COMMERCIAL_KEYWORDS = Object.freeze([
  'transporter',
  'ducato',
  'master',
  'boxer',
  'sprinter',
  'kamyonet',
  'panelvan',
  'ticari',
  'caddy',
  'kangoo',
  'partner',
  'connect'
]);

/** @type {ReadonlyArray<string>} */
const SUV_KEYWORDS = Object.freeze([
  'suv',
  'crossover',
  'x1',
  'x3',
  'x5',
  'x6',
  'q3',
  'q5',
  'q7',
  'tiguan',
  'tucson',
  'sportage',
  'c-hr',
  'rav4',
  'duster',
  '3008',
  '2008',
  'kuga',
  'ecosport',
  'captur',
  'juke',
  'qashqai',
  't-roc',
  'troc',
  'kodiaq',
  'karoq'
]);

/** @type {ReadonlyArray<string>} */
const HATCHBACK_KEYWORDS = Object.freeze([
  'clio',
  'yaris',
  'fiesta',
  'polo',
  'i20',
  'corsa',
  '208',
  'sandero',
  'fabia',
  'golf',
  'focus hatch',
  'megane hatch',
  'civic hatch',
  'i10',
  'i30 hatch',
  'swift',
  'mii',
  'up!',
  'aygo'
]);

/** @type {ReadonlyArray<string>} */
const COMPACT_SEDAN_KEYWORDS = Object.freeze([
  'corolla',
  'civic',
  'focus',
  'octavia',
  'jetta',
  'megane',
  'passat',
  'leon',
  'elantra',
  'cerato',
  'cruze',
  'altima',
  'sentra',
  'fluence',
  'symbol',
  'egea',
  'linea'
]);

/** @type {ReadonlyArray<string>} */
const PREMIUM_SEDAN_KEYWORDS = Object.freeze([
  '320',
  '320i',
  '330',
  '520',
  '520i',
  'c serisi',
  'c180',
  'c200',
  'c220',
  'e serisi',
  'e200',
  'a4',
  'a6',
  '3 serisi',
  '5 serisi',
  's60',
  's90',
  'v60'
]);

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return String(text ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * @param {string} haystack
 * @param {ReadonlyArray<string>} keywords
 * @returns {boolean}
 */
function containsKeyword(haystack, keywords) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

/**
 * @param {string} brand
 * @returns {boolean}
 */
function isPremiumBrand(brand) {
  const normalized = normalizeText(brand);
  return PREMIUM_BRANDS.some((entry) => normalized.includes(entry));
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {string}
 */
export function detectVehicleSegment(listing) {
  if (String(listing.category ?? '') !== 'vehicle') {
    return 'unknown';
  }

  const brand = normalizeText(listing.brand ?? '');
  const model = normalizeText(listing.model ?? '');
  const title = normalizeText(listing.title ?? '');
  const combined = `${brand} ${model} ${title}`.trim();

  if (!combined) return 'unknown';

  if (containsKeyword(combined, COMMERCIAL_KEYWORDS)) {
    return 'commercial';
  }

  if (containsKeyword(combined, SUV_KEYWORDS)) {
    return 'suv';
  }

  if (containsKeyword(combined, HATCHBACK_KEYWORDS)) {
    return 'hatchback';
  }

  if (containsKeyword(combined, PREMIUM_SEDAN_KEYWORDS) || isPremiumBrand(brand)) {
    if (!containsKeyword(combined, SUV_KEYWORDS) && !containsKeyword(combined, COMMERCIAL_KEYWORDS)) {
      return 'premium_sedan';
    }
  }

  if (containsKeyword(combined, COMPACT_SEDAN_KEYWORDS)) {
    return 'compact_sedan';
  }

  if (isPremiumBrand(brand)) {
    return 'premium_sedan';
  }

  return 'unknown';
}
