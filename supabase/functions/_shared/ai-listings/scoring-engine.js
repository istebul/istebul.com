/**
 * isteBul AI Listings Edge API — deterministic scoring (mirrors src/ai-listings/scoring).
 * Keep in sync with src/ai-listings/scoring/* when rules change.
 */

const SCORING_ENGINE_VERSION = 'v1-rules-sprint6';
const CURRENT_YEAR = 2026;

const HOUSING_SQM_BENCHMARK = {
  default: 28000,
  istanbul: 45000,
  ankara: 32000,
  izmir: 38000,
  antalya: 35000,
  bursa: 30000
};

const CITY_LOCATION_SCORE = {
  istanbul: 85,
  ankara: 75,
  izmir: 80,
  antalya: 78,
  bursa: 70,
  default: 55
};

const VEHICLE_FUEL_SCORE = {
  elektrik: 95,
  hibrit: 85,
  lpg: 70,
  dizel: 65,
  benzin: 55
};

const VEHICLE_REFERENCE_PRICE = 1_200_000;

function clampScore(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function safeNumber(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normalizeCityKey(city) {
  const key = String(city ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
  if (key.includes('istanbul')) return 'istanbul';
  if (key.includes('ankara')) return 'ankara';
  if (key.includes('izmir')) return 'izmir';
  if (key.includes('antalya')) return 'antalya';
  if (key.includes('bursa')) return 'bursa';
  return 'default';
}

function readAttribute(attributes, keys) {
  if (!attributes || typeof attributes !== 'object') return undefined;
  for (const key of keys) {
    if (attributes[key] !== undefined && attributes[key] !== null && attributes[key] !== '') {
      return attributes[key];
    }
  }
  return undefined;
}

function computeVehicleScores(listing) {
  const attrs = listing.attributes ?? {};
  const year = safeNumber(readAttribute(attrs, ['year', 'yil', 'model_year']));
  const km = safeNumber(readAttribute(attrs, ['mileage', 'km', 'kilometre']));
  const fuel = String(readAttribute(attrs, ['fuel_type', 'yakit_turu', 'fuel']) ?? 'benzin');

  const ageYears = year > 0 ? Math.max(0, CURRENT_YEAR - year) : 8;
  const age_score =
    year <= 1990 ? 30 : ageYears <= 3 ? 90 : ageYears <= 7 ? 75 : ageYears <= 12 ? 60 : ageYears <= 18 ? 45 : 30;

  const mileage_score =
    km < 0 ? 30 : km <= 30000 ? 90 : km <= 80000 ? 75 : km <= 150000 ? 60 : km <= 250000 ? 45 : 30;

  const fuel_score = VEHICLE_FUEL_SCORE[fuel.toLocaleLowerCase('tr-TR')] ?? 50;

  let price_score = 0;
  if (listing.price > 0) {
    const expected = VEHICLE_REFERENCE_PRICE * Math.pow(0.88, ageYears);
    const ratio = listing.price / expected;
    price_score =
      ratio >= 0.8 && ratio <= 1.1 ? 85 : ratio >= 0.65 && ratio <= 1.25 ? 70 : ratio >= 0.5 && ratio <= 1.4 ? 55 : 35;
  }

  const risk_score = clampScore(
    100 - (age_score * 0.25 + mileage_score * 0.35 + price_score * 0.25 + fuel_score * 0.15)
  );
  const market_score = clampScore((age_score + fuel_score) / 2);
  const ai_score = clampScore(
    price_score * 0.3 + mileage_score * 0.25 + age_score * 0.25 + fuel_score * 0.1 + (100 - risk_score) * 0.1
  );

  const hasCore =
    year > 0 && km >= 0 && listing.price > 0 && String(listing.location ?? '').trim() && String(listing.title ?? '').trim();
  const confidence = hasCore ? 0.82 : listing.price > 0 && listing.title ? 0.55 : 0.35;

  return {
    ai_score,
    risk_score,
    market_score,
    price_score,
    confidence,
    factor_scores: { price_score, mileage_score, age_score, fuel_score, risk_score },
    scoring_version: SCORING_ENGINE_VERSION
  };
}

function computeHousingScores(listing) {
  const attrs = listing.attributes ?? {};
  const sqm = safeNumber(readAttribute(attrs, ['sqm', 'metrekare', 'size_sqm']));
  const rooms = safeNumber(readAttribute(attrs, ['rooms', 'oda_sayisi', 'room_count']));
  const buildingAge = safeNumber(readAttribute(attrs, ['building_age', 'bina_yasi', 'age_years']));

  const cityKey = normalizeCityKey(listing.location);
  const location_score = CITY_LOCATION_SCORE[cityKey] ?? CITY_LOCATION_SCORE.default;

  const roomCount = Math.max(1, rooms);
  const sqmPerRoom = sqm > 0 ? sqm / roomCount : 0;
  const size_score =
    sqm <= 0
      ? 40
      : sqmPerRoom >= 25 && sqmPerRoom <= 45
        ? 85
        : sqmPerRoom >= 18 && sqmPerRoom <= 55
          ? 70
          : sqmPerRoom >= 12 && sqmPerRoom <= 65
            ? 55
            : 40;

  const building_age_score =
    buildingAge < 0 ? 40 : buildingAge <= 5 ? 90 : buildingAge <= 15 ? 75 : buildingAge <= 30 ? 60 : buildingAge <= 50 ? 45 : 35;

  let price_score = listing.price > 0 ? 40 : 0;
  if (listing.price > 0 && sqm > 0) {
    const benchmark = HOUSING_SQM_BENCHMARK[cityKey] ?? HOUSING_SQM_BENCHMARK.default;
    const ratio = listing.price / sqm / benchmark;
    price_score =
      ratio >= 0.85 && ratio <= 1.15 ? 85 : ratio >= 0.7 && ratio <= 1.3 ? 70 : ratio >= 0.55 && ratio <= 1.45 ? 55 : 35;
  }

  const risk_score = clampScore(
    100 - (location_score * 0.3 + size_score * 0.2 + building_age_score * 0.2 + price_score * 0.3)
  );
  const market_score = clampScore(location_score * 0.6 + building_age_score * 0.4);
  const ai_score = clampScore(
    price_score * 0.3 +
      location_score * 0.25 +
      size_score * 0.2 +
      building_age_score * 0.15 +
      (100 - risk_score) * 0.1
  );

  const hasCore =
    sqm > 0 && rooms > 0 && buildingAge >= 0 && listing.price > 0 && String(listing.location ?? '').trim() && String(listing.title ?? '').trim();
  const confidence = hasCore ? 0.84 : listing.price > 0 && listing.title ? 0.58 : 0.36;

  return {
    ai_score,
    risk_score,
    market_score,
    price_score,
    confidence,
    factor_scores: { price_score, location_score, size_score, building_age_score, risk_score },
    scoring_version: SCORING_ENGINE_VERSION
  };
}

function computeGeneralScores(listing) {
  const title = String(listing.title ?? '').trim();
  const description = String(listing.description ?? '').trim();
  const location = String(listing.location ?? '').trim();
  const price = Number(listing.price ?? 0);

  const completeness =
    (title ? 25 : 0) + (description.length > 10 ? 25 : 0) + (price > 0 ? 25 : 0) + (location ? 25 : 0);
  const market_score = 0;
  const price_score = price > 0 ? 40 : 0;
  const ai_score = clampScore(completeness * 0.4 + price_score * 0.3);
  const risk_score = clampScore(100 - ai_score);
  const confidence = title && price > 0 ? 0.6 : 0.35;

  return { ai_score, risk_score, market_score, price_score, confidence, scoring_version: SCORING_ENGINE_VERSION };
}

/**
 * @param {{ listing: Record<string, unknown> }} input
 */
export function computeListingScores(input) {
  const listing = input.listing;
  if (listing.category === 'vehicle') return computeVehicleScores(listing);
  if (listing.category === 'housing') return computeHousingScores(listing);
  return computeGeneralScores(listing);
}

function buildSummary(listing, scores) {
  const title = String(listing.title ?? '').trim() || String(listing.id ?? '');
  const riskLabel = scores.risk_score >= 60 ? 'yüksek' : scores.risk_score >= 35 ? 'orta' : 'düşük';
  if (listing.category === 'vehicle') {
    return `"${title}" için kural tabanlı araç analizi: genel skor ${scores.ai_score}/100, risk ${riskLabel} (${scores.risk_score}/100).`;
  }
  if (listing.category === 'housing') {
    return `"${title}" için kural tabanlı konut analizi: genel skor ${scores.ai_score}/100, risk ${riskLabel} (${scores.risk_score}/100).`;
  }
  return `"${title}" için kural tabanlı analiz: genel skor ${scores.ai_score}/100.`;
}

function buildPros(listing, scores) {
  const pros = [];
  if (scores.price_score >= 70) pros.push('Fiyat segmenti referans bandına yakın görünüyor.');
  if (scores.market_score >= 70) pros.push('Piyasa uyumu güçlü sinyaller veriyor.');
  if (String(listing.description ?? '').length > 40) pros.push('Açıklama yeterli detay içeriyor.');
  return pros.length ? pros : ['Temel veri seti mevcut; güçlü sinyal sınırlı.'];
}

function buildCons(listing, scores) {
  const cons = [];
  if (!String(listing.description ?? '').trim()) cons.push('Açıklama eksik — değerlendirme güveni düşer.');
  if (!String(listing.location ?? '').trim()) cons.push('Konum bilgisi eksik.');
  if (Number(listing.price ?? 0) <= 0) cons.push('Fiyat belirtilmemiş.');
  if (scores.risk_score >= 60) cons.push('Genel risk skoru yüksek segmentte.');
  return cons.length ? cons : ['Kritik eksik veri tespit edilmedi.'];
}

function buildTags(listing, scores) {
  const tags = [
    String(listing.category ?? 'general'),
    'rules-engine',
    `ai:${scores.ai_score}`,
    `risk:${scores.risk_score}`,
    `confidence:${Math.round(scores.confidence * 100)}`
  ];
  const factors = scores.factor_scores ?? {};
  for (const [key, value] of Object.entries(factors)) {
    if (Number.isFinite(value)) tags.push(`factor:${key}:${value}`);
  }
  return tags;
}

/**
 * @param {{ listing: Record<string, unknown> }} input
 */
export function buildListingAnalysis(listing, scores) {
  return {
    ai_score: scores.ai_score,
    risk_score: scores.risk_score,
    market_score: scores.market_score,
    price_score: scores.price_score,
    confidence: scores.confidence,
    summary: buildSummary(listing, scores),
    pros: buildPros(listing, scores),
    cons: buildCons(listing, scores),
    tags: buildTags(listing, scores)
  };
}
