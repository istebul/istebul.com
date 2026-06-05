/**
 * Pure Auto results model builders (testable, no side effects).
 */
import { buildRecommendationIntelligence } from './recommendation-intelligence.js';
import { buildWhyNotRanked } from '../engines/decision-consultant.js';
import { toRecommendationVehicle } from './vehicle-image.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function computeAnnualFuelCost(vehicle) {
  const annual = vehicle?.costs?.ownership?.annual;
  if (annual?.fuel != null) return safeNumber(annual.fuel);
  return safeNumber(vehicle?.costs?.fuel);
}

function computeFiveYearOwnershipTotal(vehicle) {
  const own = vehicle?.costs?.ownership;
  if (!own) return 0;

  const annual = own.annual || {};
  const years = 5;
  const vehiclePrice = safeNumber(own.purchaseCost || vehicle.price);
  const creditCost = Math.round(safeNumber(own.financing?.annual) * years);
  const insurance = Math.round((safeNumber(annual.insurance) + safeNumber(annual.kasko)) * years);
  const fuel = Math.round(safeNumber(annual.fuel) * years);
  const maintenance = Math.round(
    (safeNumber(annual.maintenance) + safeNumber(annual.inspection) + safeNumber(annual.tires)) * years
  );
  return vehiclePrice + creditCost + insurance + fuel + maintenance;
}

function confidenceTierLabel(vehicle, fallbackScore = 0) {
  const meta = vehicle?.confidenceMeta;
  if (meta?.label) return meta.label;
  const score = safeNumber(meta?.score ?? vehicle?.confidence ?? fallbackScore);
  if (score >= 80) return 'Yüksek';
  if (score >= 60) return 'Orta';
  return 'Düşük';
}

export function buildRecommendationPayload(topResult, formData, results, intel) {
  const vehicle = toRecommendationVehicle(topResult);
  const intelScores = topResult?.recommendationIntelligence
    || buildRecommendationIntelligence(topResult, formData, { alternatives: results, rank: 0, leader: topResult });

  return {
    vehicle,
    decisionScore: intel.decisionScore,
    confidenceLabel: confidenceTierLabel(topResult, intel.confidenceScore),
    confidenceScore: intel.confidenceScore,
    annualFuelCost: computeAnnualFuelCost(topResult),
    fiveYearOwnership: computeFiveYearOwnershipTotal(topResult),
    aiSummary: intel.executiveSummary || (topResult?.reasons || [])[0] || '',
    intelligence: intelScores,
    recommendationLabel: intel.recommendationLabel || 'En Uygun'
  };
}

function scoreBandLabel(score) {
  if (score >= 80) return 'Güçlü';
  if (score >= 65) return 'İyi';
  if (score >= 50) return 'Orta';
  return 'Zayıf';
}

export function buildWhyRecommendedCards(recommendation, formData) {
  const vehicle = recommendation.vehicle;
  const intel = recommendation.intelligence || {};
  const usage = String(formData?.usage || '');

  return [
    {
      icon: '⛽',
      title: 'Yakıt ekonomisi',
      score: intel.operatingCostScore ?? 70,
      text: vehicle.fuel === 'electric'
        ? 'Elektrikli segment — düşük işletme maliyeti profili.'
        : vehicle.fuel === 'hybrid'
          ? 'Hibrit motor — şehir içi tüketimde verimli profil.'
          : 'Yakıt maliyeti profilinize göre segment ortalamasıyla uyumlu.'
    },
    {
      icon: '💰',
      title: 'Bütçe uyumu',
      score: intel.budgetFitScore ?? 70,
      text: intel.budgetFitScore >= 75
        ? 'Referans fiyat bandı bütçe hedefinize yakın.'
        : 'Bütçe baskısı var — finansman ve alternatif teklifleri karşılaştırın.'
    },
    {
      icon: '🛣️',
      title: 'Kullanım senaryosu uyumu',
      score: clamp(Math.round((Number(vehicle[usage] || vehicle.city || 7) / 10) * 100), 40, 95),
      text: usage === 'family'
        ? 'Aile ve bagaj ihtiyacına uygun segment profili.'
        : usage === 'long'
          ? 'Uzun yol konforu ve işletme dengesi değerlendirildi.'
          : 'Şehir içi kullanım profiline uygun segment seçimi.'
    },
    {
      icon: '📈',
      title: 'İkinci el değeri',
      score: intel.resaleScore ?? clamp(Math.round((Number(vehicle.resale || 6) / 10) * 85 + 10), 25, 92),
      text: intel.resaleScore >= 75
        ? 'Likidite sinyalleri segment ortalamasının üzerinde.'
        : 'İkinci el değeri segment ortalamasına yakın — sahiplik süresi önemli.'
    },
    {
      icon: '🛡️',
      title: 'Güvenlik avantajı',
      score: intel.reliabilityScore ?? clamp(Math.round((Number(vehicle.maintenance || 6) / 10) * 90 + 8), 30, 95),
      text: 'Bakım güvenilirliği ve segment dayanıklılığı profilinize dahil edildi.'
    }
  ];
}

export function buildVehicleAlternatives(results = [], leader, formData) {
  return results.slice(1, 4).map((vehicle, idx) => {
    const rank = idx + 2;
    const whyNot = buildWhyNotRanked(vehicle, rank, leader, formData);
    const pros = (vehicle.reasons || []).slice(0, 2).filter(Boolean);
    if (whyNot?.strengths?.length) {
      pros.push(...whyNot.strengths.slice(0, 1));
    }

    return {
      vehicle: toRecommendationVehicle(vehicle),
      score: safeNumber(vehicle.score),
      pros: pros.length ? pros : ['Profilinize uygun alternatif segment'],
      whySecond: whyNot?.summary
        || vehicle.recommendationIntelligence?.whyNotAlternatives
        || 'Birincil öneriye göre toplam uyum skoru daha düşük.'
    };
  });
}

export { scoreBandLabel };
