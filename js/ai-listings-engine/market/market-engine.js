import { clampScore, safeNumber, normalizeCityKey, readAttribute, CURRENT_YEAR } from '../scoring/score-utils.js';

const HOUSING_SQM_BENCHMARK = {
  default: 28000,
  istanbul: 45000,
  ankara: 32000,
  izmir: 38000,
  antalya: 35000,
  bursa: 30000
};

const VEHICLE_REFERENCE_PRICE = 1_200_000;

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 * @returns {number}
 */
function estimateMarketAverage(listing) {
  const category = String(listing.category ?? 'general').toLowerCase();

  if (category === 'vehicle') {
    const year = listing.year ?? safeNumber(readAttribute(listing.attributes, ['year', 'yil', 'model_year']));
    const ageYears = year > 0 ? Math.max(0, CURRENT_YEAR - year) : 8;
    return Math.round(VEHICLE_REFERENCE_PRICE * Math.pow(0.88, ageYears));
  }

  if (category === 'housing' || category === 'real_estate') {
    const sqm = safeNumber(readAttribute(listing.attributes, ['sqm', 'metrekare', 'size_sqm'])) || 100;
    const cityKey = normalizeCityKey(listing.location);
    const perSqm = HOUSING_SQM_BENCHMARK[cityKey] ?? HOUSING_SQM_BENCHMARK.default;
    return Math.round(sqm * perSqm);
  }

  if (category === 'vacation') {
    return listing.price > 0 ? Math.round(listing.price * 1.05) : 0;
  }

  return listing.price > 0 ? Math.round(listing.price * 1.0) : 0;
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 * @param {Record<string, unknown>|null|undefined} [existingAnalysis]
 * @returns {{
 *   market_score: number,
 *   price_score: number,
 *   market_average: number,
 *   deviation_pct: number,
 *   market_summary: string
 * }}
 */
export function runMarketEngine(listing, existingAnalysis = null) {
  const price = listing.price;
  const market_average = estimateMarketAverage(listing);

  if (!Number.isFinite(price) || price <= 0 || market_average <= 0) {
    const fallbackMarket = Number(existingAnalysis?.market_score);
    const fallbackPrice = Number(existingAnalysis?.price_score);
    return {
      market_score: Number.isFinite(fallbackMarket) ? clampScore(fallbackMarket) : 0,
      price_score: Number.isFinite(fallbackPrice) ? clampScore(fallbackPrice) : 0,
      market_average: 0,
      deviation_pct: 0,
      market_summary: 'Piyasa karşılaştırması için yeterli fiyat verisi yok.'
    };
  }

  const deviation_pct = ((price - market_average) / market_average) * 100;
  const absPct = Math.abs(deviation_pct);

  let price_score = 50;
  if (absPct <= 5) price_score = 90;
  else if (absPct <= 12) price_score = 75;
  else if (absPct <= 20) price_score = 60;
  else if (absPct <= 35) price_score = 45;
  else price_score = 30;

  if (deviation_pct < 0) price_score = clampScore(price_score + 5);

  const market_score = clampScore(100 - absPct * 1.8);
  const direction = deviation_pct > 1 ? 'üzerinde' : deviation_pct < -1 ? 'altında' : 'seviyesinde';

  const market_summary =
    direction === 'seviyesinde'
      ? 'Fiyat piyasa ortalamasıyla uyumlu görünüyor.'
      : `Piyasa ortalamasının yaklaşık %${absPct.toFixed(1)} ${direction}.`;

  const mergedMarket = Number.isFinite(Number(existingAnalysis?.market_score))
    ? clampScore(Number(existingAnalysis.market_score))
    : market_score;
  const mergedPrice = Number.isFinite(Number(existingAnalysis?.price_score))
    ? clampScore(Number(existingAnalysis.price_score))
    : price_score;

  return {
    market_score: mergedMarket,
    price_score: mergedPrice,
    market_average,
    deviation_pct: Math.round(deviation_pct * 10) / 10,
    market_summary
  };
}
