/**
 * AI Listings Search — explainability engine (Sprint-16 v2).
 * Builds human-readable "Neden eşleşti?" reasons for each result.
 */

/** @type {Readonly<Record<string, string>>} */
const ATTRIBUTE_LABELS_TR = Object.freeze({
  low_km: 'düşük km',
  authorized_service: 'yetkili servis',
  paint_one_piece: 'tek parça boya',
  m_sport: 'M Sport'
});

/** @type {Readonly<Record<string, string>>} */
const FUEL_LABELS_TR = Object.freeze({
  diesel: 'dizel',
  gasoline: 'benzin',
  lpg: 'lpg',
  electric: 'elektrik',
  hybrid: 'hibrit'
});

/** @type {Readonly<Record<string, string>>} */
const TRANSMISSION_LABELS_TR = Object.freeze({
  automatic: 'otomatik',
  manual: 'manuel'
});

/**
 * @param {Record<string, unknown>} doc
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @param {Record<string, number>} breakdown
 * @param {Record<string, number>} [boosts]
 * @returns {string[]}
 */
export function buildMatchExplanation(doc, parsed, breakdown, boosts = {}) {
  /** @type {string[]} */
  const reasons = [];

  if (breakdown.brand > 0 && parsed.brand) {
    reasons.push(String(parsed.brand));
  } else if (breakdown.brand > 0 && doc.brand) {
    reasons.push(String(doc.brand));
  }

  if (breakdown.model > 0 && parsed.model) {
    reasons.push(String(parsed.model));
  } else if (breakdown.model > 0 && doc.model) {
    reasons.push(String(doc.model));
  }

  if (breakdown.year > 0 && parsed.year) {
    reasons.push(String(parsed.year));
  } else if (breakdown.year > 0 && doc.year) {
    reasons.push(String(doc.year));
  }

  for (const attribute of parsed.attributes) {
    const label = ATTRIBUTE_LABELS_TR[attribute];
    if (label && breakdown.attributes > 0) {
      reasons.push(label);
    }
  }

  if (breakdown.fuel > 0 && parsed.fuel) {
    reasons.push(FUEL_LABELS_TR[parsed.fuel] ?? parsed.fuel);
  }

  if (breakdown.transmission > 0 && parsed.transmission) {
    reasons.push(TRANSMISSION_LABELS_TR[parsed.transmission] ?? parsed.transmission);
  }

  if (breakdown.description > 0) {
    const terms = parsed.text_terms.slice(0, 2).filter(Boolean);
    if (terms.length) {
      reasons.push(...terms);
    }
  }

  if (breakdown.tags > 0) {
    reasons.push('etiket eşleşmesi');
  }

  if (boosts.exact_phrase > 0) {
    reasons.push('tam ifade eşleşmesi');
  }

  if (boosts.multi_token > 0 && parsed.tokens.length >= 2) {
    reasons.push('çoklu kelime eşleşmesi');
  }

  if (boosts.recent_listing > 0) {
    reasons.push('güncel ilan');
  }

  if (boosts.quality_score > 0) {
    reasons.push('yüksek kalite');
  }

  return [...new Set(reasons.map((r) => String(r).trim()).filter(Boolean))];
}

/**
 * @param {string[]} reasons
 * @returns {string}
 */
export function formatExplanationLines(reasons) {
  if (!reasons.length) return '';
  return reasons.map((reason) => `✓ ${reason}`).join('\n');
}

/**
 * @param {number} score
 * @returns {number}
 */
export function scoreToStarCount(score) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped >= 90) return 5;
  if (clamped >= 75) return 4;
  if (clamped >= 60) return 3;
  if (clamped >= 45) return 2;
  if (clamped >= 30) return 1;
  return 0;
}

/**
 * @param {number} score
 * @returns {string}
 */
export function scoreToStars(score) {
  const count = scoreToStarCount(score);
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}
