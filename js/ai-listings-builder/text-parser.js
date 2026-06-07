/**
 * AI Auto Listing Builder — free-text parser.
 */

import { logBuilderStage } from './debug-log.js';

/** @typedef {Record<string, { value: unknown, confidence: number }>} ParsedFieldMap */

const KNOWN_BRANDS = [
  'Mercedes-Benz',
  'Land Rover',
  'Mercedes',
  'Volkswagen',
  'Chevrolet',
  'Mitsubishi',
  'BMW',
  'Audi',
  'Toyota',
  'Honda',
  'Renault',
  'Fiat',
  'Ford',
  'Hyundai',
  'Kia',
  'Peugeot',
  'Citroen',
  'Opel',
  'Skoda',
  'Seat',
  'Volvo',
  'Nissan',
  'Mazda',
  'Dacia',
  'Mini',
  'Porsche',
  'Jeep',
  'Tesla'
];

const FUEL_PATTERNS = [
  { pattern: /\bbenzin\b/i, value: 'Benzin' },
  { pattern: /\bdizel\b/i, value: 'Dizel' },
  { pattern: /\blpg\b/i, value: 'LPG' },
  { pattern: /\belektrik\b/i, value: 'Elektrik' },
  { pattern: /\bhibrit\b/i, value: 'Hibrit' }
];

const TRANSMISSION_PATTERNS = [
  { pattern: /\botomatik\b/i, value: 'Otomatik' },
  { pattern: /\bmanuel\b/i, value: 'Manuel' },
  { pattern: /\byarı\s*otomatik\b/i, value: 'Yarı Otomatik' }
];

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function parsePriceValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s*TL\b/gi, '')
    .replace(/\s*TRY\b/gi, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(/,/g, '');

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseKmValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const match = raw.match(/([\d.,]+)\s*(?:km|kilometre)?/i);
  if (!match) return null;

  const normalized = match[1].replace(/\./g, '').replace(/,/g, '');
  const km = Number(normalized);
  return Number.isFinite(km) && km >= 0 ? Math.round(km) : null;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseYearValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const match = raw.match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return null;

  const year = Number(match[1]);
  const currentYear = new Date().getFullYear() + 1;
  return year >= 1950 && year <= currentYear ? year : null;
}

/**
 * @param {string} line
 * @returns {string|null}
 */
function parseFuelLine(line) {
  for (const item of FUEL_PATTERNS) {
    if (item.pattern.test(line)) return item.value;
  }
  return null;
}

/**
 * @param {string} line
 * @returns {string|null}
 */
function parseTransmissionLine(line) {
  for (const item of TRANSMISSION_PATTERNS) {
    if (item.pattern.test(line)) return item.value;
  }
  return null;
}

/**
 * @param {string} titleLine
 */
function parseVehicleTitleLine(titleLine) {
  const year = parseYearValue(titleLine);
  let rest = titleLine.replace(/\b(19\d{2}|20\d{2})\b/, ' ').replace(/\s+/g, ' ').trim();

  let brand = null;
  for (const candidate of KNOWN_BRANDS) {
    const pattern = new RegExp(`\\b${candidate.replace('-', '[ -]?')}\\b`, 'i');
    if (pattern.test(rest)) {
      brand = /mercedes/i.test(candidate) ? 'Mercedes' : candidate;
      rest = rest.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }

  const modelMatch = rest.match(/\b([A-Za-z0-9][A-Za-z0-9.-]{1,20})\b/);
  const model = modelMatch ? modelMatch[1] : null;
  const confidence = brand && model && year ? 0.92 : brand && year ? 0.85 : year ? 0.7 : 0.5;

  return { brand, model, year, confidence };
}

/**
 * @param {string[]} lines
 * @param {ParsedFieldMap} fields
 */
function buildTags(lines, fields) {
  const tags = new Set();
  const title = String(fields.title?.value ?? '');

  for (const token of title.split(/\s+/)) {
    const cleaned = token.replace(/[^\p{L}\p{N}-]/gu, '').trim();
    if (cleaned.length >= 2) tags.add(cleaned);
  }

  if (fields.brand?.value) tags.add(String(fields.brand.value));
  if (fields.model?.value) tags.add(String(fields.model.value));

  const km = Number(fields.km?.value);
  if (Number.isFinite(km) && km > 0 && km <= 60000) tags.add('Düşük KM');
  if (/m sport/i.test(title)) tags.add('M Sport');
  if (/yetkili servis/i.test(lines.join(' '))) tags.add('Yetkili Servis');

  return [...tags].slice(0, 8);
}

/**
 * @param {unknown} rawInput
 */
export function parseTextInput(rawInput) {
  const raw_text = String(rawInput ?? '').trim();
  const lines = raw_text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  /** @type {ParsedFieldMap} */
  const fields = {};
  fields.category = { value: 'vehicle', confidence: lines.length ? 0.55 : 0 };

  const titleLine = lines[0] ?? '';
  if (titleLine) fields.title = { value: titleLine, confidence: 0.88 };

  const titleParts = parseVehicleTitleLine(titleLine);
  if (titleParts.year) fields.year = { value: titleParts.year, confidence: 0.9 };
  if (titleParts.brand) fields.brand = { value: titleParts.brand, confidence: titleParts.confidence };
  if (titleParts.model) fields.model = { value: titleParts.model, confidence: titleParts.confidence };

  for (const line of lines.slice(1)) {
    const km = parseKmValue(line);
    if (km !== null && !fields.km) {
      fields.km = { value: km, confidence: /\bkm\b/i.test(line) ? 0.95 : 0.75 };
      continue;
    }

    const fuel = parseFuelLine(line);
    if (fuel && !fields.fuel) {
      fields.fuel = { value: fuel, confidence: 0.93 };
      continue;
    }

    const transmission = parseTransmissionLine(line);
    if (transmission && !fields.transmission) {
      fields.transmission = { value: transmission, confidence: 0.93 };
      continue;
    }

    const price = parsePriceValue(line);
    if (price !== null && !fields.price) {
      fields.price = { value: price, confidence: /TL|TRY/i.test(line) ? 0.96 : 0.8 };
      fields.currency = { value: 'TRY', confidence: /TL|TRY/i.test(line) ? 0.96 : 0.7 };
      continue;
    }

    const year = parseYearValue(line);
    if (year !== null && !fields.year) fields.year = { value: year, confidence: 0.85 };
  }

  fields.description = { value: raw_text, confidence: raw_text.length >= 20 ? 0.82 : 0.6 };
  fields.tags = { value: buildTags(lines, fields), confidence: 0.75 };

  logBuilderStage('text-parser', {
    line_count: lines.length,
    title: fields.title?.value ?? null,
    field_count: Object.keys(fields).length
  });

  return { fields, raw_text, lines };
}

/**
 * @param {unknown} value
 */
export function parseFuelValue(value) {
  return parseFuelLine(String(value ?? ''));
}

/**
 * @param {unknown} value
 */
export function parseTransmissionValue(value) {
  return parseTransmissionLine(String(value ?? ''));
}
