/**
 * Heuristic depreciation & resale liquidity (deterministic, not market quotes).
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inferVehicleAgeYears(vehicle = {}) {
  const year = Number(vehicle.year || vehicle.model_year || 0);
  if (year >= 1995 && year <= new Date().getFullYear()) {
    return clamp(new Date().getFullYear() - year, 0, 25);
  }
  const price = Number(vehicle.price || 0);
  if (price < 650000) return 6;
  if (price < 1200000) return 4;
  if (price < 2200000) return 2;
  return 1;
}

function segmentDemandFactor(vehicle = {}) {
  const body = String(vehicle.body || '').toLowerCase();
  const fuel = String(vehicle.fuel || '').toLowerCase();
  let demand = 6;
  if (body === 'suv') demand += 1.2;
  if (body === 'hatchback') demand += 0.3;
  if (fuel === 'hybrid') demand += 1;
  if (fuel === 'electric') demand += 0.6;
  if (fuel === 'diesel') demand -= 0.4;
  const resale = Number(vehicle.resale || 6);
  return clamp((demand + resale) / 2, 3, 10);
}

function annualDepreciationRate(vehicle = {}, form = {}) {
  const profile = vehicle.costProfile || null;
  if (profile?.depreciation_3y) {
    return Number(profile.depreciation_3y) / 3;
  }
  if (profile?.depreciation_5y) {
    return Number(profile.depreciation_5y) / 5;
  }

  const age = inferVehicleAgeYears(vehicle);
  let rate = 0.18;
  const price = Number(vehicle.price || 0);
  if (price >= 2500000) rate += 0.04;
  if (age <= 1) rate += 0.06;
  else if (age <= 3) rate += 0.03;
  else if (age >= 8) rate -= 0.04;

  const fuel = String(vehicle.fuel || '');
  if (fuel === 'electric') rate += 0.02;
  if (fuel === 'diesel') rate -= 0.01;

  const months = Number(form.ownership_months || 36);
  if (months >= 48) rate -= 0.01;

  return clamp(rate, 0.08, 0.32);
}

/**
 * @param {object} vehicle
 * @param {object} form
 */
export function computeDepreciationProfile(vehicle = {}, form = {}) {
  const price = Number(vehicle.price || 0);
  const rate = annualDepreciationRate(vehicle, form);
  const age = inferVehicleAgeYears(vehicle);
  const demand = segmentDemandFactor(vehicle);

  const year1Loss = Math.round(price * rate * 0.95);
  const year2Loss = Math.round(price * rate * 0.88);
  const value12 = Math.max(0, price - year1Loss);
  const value24 = Math.max(0, price - year1Loss - year2Loss);

  const resaleRiskScore = clamp(
    Math.round(100 - demand * 8 - (rate > 0.22 ? 12 : 0) - (age > 10 ? 8 : 0)),
    15,
    92
  );
  const liquidityScore = clamp(Math.round(demand * 9 + (100 - resaleRiskScore) * 0.15), 20, 95);

  const transmission = String(vehicle.transmission || vehicle.gear || '').toLowerCase();
  const transmissionNote =
    transmission.includes('otomatik') || transmission === 'auto'
      ? 'Otomatik segment talebi genelde daha yüksek'
      : 'Manuel / belirsiz şanzıman — likidite segmente bağlı';

  return {
    purchasePrice: price,
    annualRate: Math.round(rate * 1000) / 10,
    estimatedAgeYears: age,
    value12,
    value24,
    depreciationLoss12: year1Loss,
    depreciationLoss24: year1Loss + year2Loss,
    resaleRiskScore,
    liquidityScore,
    demandCategory: demand >= 7.5 ? 'yüksek talep' : demand >= 5.5 ? 'orta talep' : 'niş / dikkatli segment',
    transmissionNote,
    heuristicDisclaimer:
      'Değer kaybı sezgisel modeldir; gerçek piyasa fiyatı marka, km ve donanıma göre değişir.'
  };
}
