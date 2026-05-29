/**
 * Konut Karar Motoru V2 — kural tabanlı; dış API yok.
 */
import { TURKEY_LOCATIONS } from '../data/turkey-locations.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const METRO_PROVINCES = new Set([
  'İstanbul',
  'Ankara',
  'İzmir',
  'Bursa',
  'Antalya',
  'Kocaeli',
  'Konya',
  'Gaziantep',
  'Mersin',
  'Adana'
]);

const HIGH_EARTHQUAKE_PROVINCES = new Set([
  'İstanbul',
  'İzmir',
  'Bursa',
  'Kocaeli',
  'Tekirdağ',
  'Sakarya',
  'Yalova',
  'Düzce',
  'Bolu',
  'Van',
  'Elazığ',
  'Malatya',
  'Kahramanmaraş',
  'Hatay',
  'Adıyaman',
  'Gaziantep'
]);

const TRANSPORT_WEIGHTS = {
  merkezeYakin: 10,
  ulasim: 12,
  topluTasima: 11,
  merkezi: 9,
  iseYakinlik: 10,
  merkeziLokasyon: 8
};

function provinceKnown(city) {
  if (!city) return false;
  return TURKEY_LOCATIONS.some((row) => row.province === city);
}

function computeRegionScore(city, district) {
  if (!String(city || '').trim()) {
    return { score: 42, missingCity: true };
  }
  let score = provinceKnown(city) ? 58 : 50;
  if (METRO_PROVINCES.has(city)) score += 18;
  else score += 8;
  if (String(district || '').trim()) score += 10;
  return { score: clamp(Math.round(score), 35, 96), missingCity: false };
}

function computeEarthquakeRiskScore(city, userInput) {
  const manual = Number(userInput);
  if (Number.isFinite(manual) && manual >= 0) {
    return clamp(Math.round(manual), 10, 95);
  }
  if (!city) return 55;
  if (HIGH_EARTHQUAKE_PROVINCES.has(city)) return 72;
  return 38;
}

function computeTransportScore(locationPreferences = []) {
  const prefs = locationPreferences || [];
  if (!prefs.length) return 58;
  const total = prefs.reduce((sum, key) => sum + (TRANSPORT_WEIGHTS[key] || 4), 0);
  const max = Object.values(TRANSPORT_WEIGHTS).reduce((a, b) => a + b, 0);
  return clamp(Math.round((total / max) * 100), 40, 95);
}

function computeLifeQualityScore({ locationFit = 70, locationPreferences = [], riskPreferences = [] }) {
  const base = Number(locationFit) || 70;
  const prefBonus = Math.min((locationPreferences?.length || 0) * 3, 12);
  const riskPenalty = Math.min((riskPreferences?.length || 0) * 2, 10);
  return clamp(Math.round(base * 0.65 + prefBonus + 18 - riskPenalty), 38, 98);
}

function computeDuesImpactScore(duesExpectation, monthlyCapacity, monthlyIncome) {
  const dues = Number(duesExpectation || 0);
  if (!dues) return 78;
  const capacity = Number(monthlyCapacity || 0) || Number(monthlyIncome || 0) * 0.35;
  if (!capacity) return clamp(88 - Math.round(dues / 500), 35, 88);
  const ratio = (dues / capacity) * 100;
  if (ratio <= 12) return 90;
  if (ratio <= 20) return 76;
  if (ratio <= 30) return 62;
  return clamp(Math.round(55 - ratio * 0.4), 28, 55);
}

function computeRentPotentialScore({ purchasePurpose, rentYield, investmentPotential }) {
  if (purchasePurpose === 'Kiralamak istiyorum') return 82;
  const yieldVal = Number(rentYield || 0);
  if (yieldVal > 0) return clamp(Math.round(50 + yieldVal * 2.2), 45, 95);
  return clamp(Math.round((Number(investmentPotential) || 65) * 0.85), 40, 92);
}

function computeInvestmentScore(investmentPotential, regionScore, earthquakeRisk) {
  const inv = Number(investmentPotential) || 65;
  const eqPenalty = Math.max(0, earthquakeRisk - 50) * 0.15;
  return clamp(Math.round(inv * 0.7 + regionScore * 0.2 - eqPenalty), 32, 97);
}

/**
 * @param {object} state — konut form state
 * @param {object} [legacyMetrics] — mevcut buildMetrics() çıktısı (opsiyonel)
 */
export function computeHousingDecisionV2(state = {}, legacyMetrics = {}) {
  const city = String(state.city || '').trim();
  const district = String(state.district || '').trim();
  const region = computeRegionScore(city, district);
  const earthquakeRisk = computeEarthquakeRiskScore(city, state.earthquakeRiskInput);
  const transportScore = computeTransportScore(state.locationPreferences);
  const lifeQuality = computeLifeQualityScore({
    locationFit: legacyMetrics.locationFit,
    locationPreferences: state.locationPreferences,
    riskPreferences: state.riskPreferences
  });
  const duesImpact = computeDuesImpactScore(
    state.duesExpectation || state.dues,
    state.monthlyCapacity,
    state.monthlyIncome
  );
  const rentPotential = computeRentPotentialScore({
    purchasePurpose: state.purchasePurpose,
    rentYield: state.rentYield,
    investmentPotential: legacyMetrics.investmentPotential
  });
  const investmentScore = computeInvestmentScore(
    legacyMetrics.investmentPotential,
    region.score,
    earthquakeRisk
  );

  let confidence = 92;
  if (region.missingCity) confidence -= 28;
  else if (!district) confidence -= 8;
  if (!Number(state.totalBudget)) confidence -= 12;
  if (!Number(state.monthlyIncome) && state.useFinancing === 'evet') confidence -= 10;
  if (!state.homeType) confidence -= 6;
  confidence = clamp(confidence, 32, 98);

  const finalScore = clamp(
    Math.round(
      region.score * 0.14 +
        (100 - earthquakeRisk) * 0.12 +
        transportScore * 0.12 +
        lifeQuality * 0.14 +
        duesImpact * 0.1 +
        rentPotential * 0.12 +
        investmentScore * 0.16 +
        (legacyMetrics.score || legacyMetrics.budgetFit || 70) * 0.1
    ),
    28,
    98
  );

  return {
    regionScore: region.score,
    earthquakeRisk,
    transportScore,
    lifeQuality,
    duesImpact,
    rentPotential,
    investmentScore,
    finalHousingScore: finalScore,
    confidenceScore: confidence,
    dataGaps: [
      region.missingCity ? 'İl seçimi eksik — bölge puanı sınırlı hesaplandı.' : null,
      !district ? 'İlçe bilgisi eklenirse lokasyon güveni artar.' : null
    ].filter(Boolean)
  };
}
