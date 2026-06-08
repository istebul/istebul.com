/**
 * Deterministic baseline price model — AI Listings Price Intelligence v1.
 * Does not use live market data; produces estimated value from listing fields.
 */

import { safeNumber, readAttribute, normalizeCityKey, CURRENT_YEAR } from '../engine/score-utils.js';

const VEHICLE_BASE_PRICE = 1_500_000;
const HOUSING_SQM_BENCHMARK = {
  default: 28000,
  istanbul: 45000,
  ankara: 32000,
  izmir: 38000,
  antalya: 35000,
  bursa: 30000
};

const PREMIUM_KEYWORDS = [
  'premium',
  'm sport',
  'amg',
  's line',
  'full',
  'paket',
  'lux',
  'executive',
  'prestij'
];

/**
 * @param {Record<string, unknown>} listing
 * @returns {{ estimated: number, reasons: string[] }}
 */
export function estimateBaselineValue(listing) {
  const category = String(listing.category ?? 'general').toLowerCase();
  if (category === 'vehicle') return estimateVehicleBaseline(listing);
  if (category === 'housing' || category === 'real_estate') return estimateHousingBaseline(listing);
  return estimateGenericBaseline(listing);
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {{ estimated: number, reasons: string[] }}
 */
function estimateVehicleBaseline(listing) {
  /** @type {string[]} */
  const reasons = [];
  let value = VEHICLE_BASE_PRICE;
  reasons.push('Araç kategorisi için deterministik taban fiyat uygulandı');

  const year = safeNumber(listing.year ?? readAttribute(listing.attributes, ['year', 'yil', 'model_year']));
  if (year > 0) {
    const ageYears = Math.max(0, CURRENT_YEAR - year);
    const yearFactor = Math.pow(0.9, ageYears);
    value *= yearFactor;
    if (ageYears <= 3) {
      reasons.push('Yeni model yılı tahmini değeri artırdı');
    } else if (ageYears >= 10) {
      reasons.push('Yüksek araç yaşı tahmini değeri düşürdü');
    }
  } else {
    value *= Math.pow(0.9, 8);
    reasons.push('Model yılı eksik; varsayılan yaş etkisi uygulandı');
  }

  const km = safeNumber(listing.km ?? readAttribute(listing.attributes, ['mileage', 'km', 'kilometre']));
  if (km > 0) {
    if (km <= 30000) {
      value *= 1.05;
      reasons.push('Düşük kilometre küçük prim sağladı');
    } else if (km <= 80000) {
      value *= 1.0;
    } else if (km <= 150000) {
      value *= 0.92;
      reasons.push('Yüksek kilometre tahmini değeri düşürdü');
    } else {
      value *= 0.85;
      reasons.push('Çok yüksek kilometre tahmini değeri belirgin düşürdü');
    }
  } else {
    reasons.push('Kilometre bilgisi eksik');
  }

  const transmission = String(
    listing.transmission ?? readAttribute(listing.attributes, ['transmission', 'vites', 'gearbox']) ?? ''
  ).toLocaleLowerCase('tr-TR');
  if (transmission.includes('otomatik') || transmission.includes('automatic') || transmission.includes('dsg')) {
    value *= 1.03;
    reasons.push('Otomatik vites küçük prim sağladı');
  }

  const brand = String(listing.brand ?? readAttribute(listing.attributes, ['brand', 'marka']) ?? '').trim();
  const model = String(listing.model ?? readAttribute(listing.attributes, ['model']) ?? '').trim();
  if (brand) {
    const premiumBrands = ['bmw', 'mercedes', 'audi', 'porsche', 'volvo', 'lexus'];
    if (premiumBrands.includes(brand.toLocaleLowerCase('tr-TR'))) {
      value *= 1.08;
      reasons.push('Premium marka küçük prim sağladı');
    }
  }
  if (model) {
    reasons.push(`Model bilgisi (${model}) değerlendirmeye dahil edildi`);
  }

  const tags = Array.isArray(listing.tags) ? listing.tags.map(String) : [];
  const attrText = JSON.stringify(listing.attributes ?? {}).toLocaleLowerCase('tr-TR');
  const titleDesc = `${listing.title ?? ''} ${listing.description ?? ''}`.toLocaleLowerCase('tr-TR');
  const hasPremium = PREMIUM_KEYWORDS.some(
    (kw) => attrText.includes(kw) || titleDesc.includes(kw) || tags.some((t) => t.toLocaleLowerCase('tr-TR').includes(kw))
  );
  if (hasPremium) {
    value *= 1.04;
    reasons.push('Premium paket/etiket küçük prim sağladı');
  }

  return { estimated: Math.round(value), reasons };
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {{ estimated: number, reasons: string[] }}
 */
function estimateHousingBaseline(listing) {
  const sqm = safeNumber(readAttribute(listing.attributes, ['sqm', 'metrekare', 'size_sqm'])) || 100;
  const cityKey = normalizeCityKey(listing.location);
  const perSqm = HOUSING_SQM_BENCHMARK[cityKey] ?? HOUSING_SQM_BENCHMARK.default;
  return {
    estimated: Math.round(sqm * perSqm),
    reasons: ['Konut kategorisi için metrekare ve konum tabanlı deterministik tahmin uygulandı']
  };
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {{ estimated: number, reasons: string[] }}
 */
function estimateGenericBaseline(listing) {
  const price = safeNumber(listing.price);
  if (price > 0) {
    return {
      estimated: Math.round(price),
      reasons: ['Yeterli fiyat bilgisi ile deterministik referans oluşturuldu']
    };
  }
  return { estimated: 0, reasons: ['Tahmin için yeterli alan bulunamadı'] };
}
