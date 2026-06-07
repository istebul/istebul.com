import { clampScore, safeNumber, normalizeCityKey, readAttribute, CURRENT_YEAR } from './score-utils.js';

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
 * @param {Record<string, unknown>} listing
 * @returns {number}
 */
function estimateMarketAverage(listing) {
  const category = String(listing.category ?? 'general').toLowerCase();

  if (category === 'vehicle') {
    const year = safeNumber(readAttribute(listing.attributes, ['year', 'yil', 'model_year']));
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
    const price = Number(listing.price);
    return price > 0 ? Math.round(price * 1.05) : 0;
  }

  const price = Number(listing.price);
  return price > 0 ? Math.round(price) : 0;
}

/**
 * @param {Record<string, unknown>} listing
 */
export function runMarketEngine(listing) {
  const price = Number(listing.price);
  const market_average = estimateMarketAverage(listing);

  if (!Number.isFinite(price) || price <= 0 || market_average <= 0) {
    return {
      market_score: 0,
      price_score: 0,
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

  let market_summary;
  if (absPct <= 1) {
    market_summary = 'Fiyat piyasa ortalamasıyla uyumlu görünüyor.';
  } else if (deviation_pct > 0) {
    market_summary = `Piyasa ortalamasının yaklaşık %${absPct.toFixed(0)} üzerinde.`;
  } else {
    market_summary = `Piyasa ortalamasının yaklaşık %${absPct.toFixed(0)} altında.`;
  }

  return {
    market_score,
    price_score,
    market_average,
    deviation_pct: Math.round(deviation_pct * 10) / 10,
    market_summary
  };
}
