/**
 * Full ownership cost intelligence — deterministic TCO (facts vs estimates labeled).
 */
import { computeDepreciationProfile } from './depreciation-engine.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeOwnershipForm(form = {}) {
  const km = clamp(Number(form.km || 15000), 1000, 200000);
  let cityRatio = Number(form.city_ratio);
  if (!Number.isFinite(cityRatio)) {
    const usage = String(form.usage || '');
    if (usage === 'city') cityRatio = 0.85;
    else if (usage === 'long') cityRatio = 0.25;
    else if (usage === 'business') cityRatio = 0.55;
    else cityRatio = 0.6;
  }
  cityRatio = clamp(cityRatio, 0.1, 0.95);

  const ownershipMonths = clamp(Number(form.ownership_months || 36), 12, 60);
  const loan = form.loan === 'yes' || form.loan === true;

  return { ...form, km, city_ratio: cityRatio, ownership_months: ownershipMonths, loan };
}

function estimateFinancingAnnual(price, form) {
  if (form.loan !== 'yes' && form.loan !== true) {
    return { annual: 0, monthly: 0, principal: 0, rate: 0, termMonths: 0, note: 'Peşin senaryo — finansman maliyeti dahil değil' };
  }
  const principal = Math.round(price * 0.6);
  const rate = 0.0325;
  const termMonths = 48;
  const monthly =
    principal > 0
      ? Math.round(
          (principal * (rate / 12) * Math.pow(1 + rate / 12, termMonths)) /
            (Math.pow(1 + rate / 12, termMonths) - 1)
        )
      : 0;
  return {
    annual: monthly * 12,
    monthly,
    principal,
    rate: rate * 100,
    termMonths,
    note: 'Simülasyon — banka onayı ve faiz ayrı değerlendirilir'
  };
}

function vehicleFuelMultiplier(vehicle = {}) {
  const body = String(vehicle.body || vehicle.segment || '').toLowerCase();
  const maintenance = Number(vehicle.maintenance || 6);
  const seedSource = String(vehicle.id || vehicle.catalog_id || vehicle.name || 'vehicle');
  const seed = [...seedSource].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variance = 0.86 + (seed % 28) / 100;
  let bodyFactor = 1;
  if (body.includes('suv') || body.includes('cross')) bodyFactor = 1.16;
  else if (body.includes('hatch') || body.includes('compact')) bodyFactor = 0.9;
  else if (body.includes('sedan')) bodyFactor = 0.96;
  const maintenanceFactor = 1 + (8 - maintenance) * 0.025;
  return variance * bodyFactor * maintenanceFactor;
}

function computeAnnualOperating(vehicle, form) {
  const km = Number(form.km || 15000);
  const profile = vehicle.costProfile || null;
  const cityRatio = Number(form.city_ratio ?? 0.6);
  const fuelMultiplier = vehicleFuelMultiplier(vehicle);

  if (profile) {
    const fuelCity = Number(profile.fuel_city || 0);
    const fuelHighway = Number(profile.fuel_highway || 0);
    const annualEvCharging = Number(profile.annual_ev_charging || 0);
    const fuelUnitCost = { electric: 1, hybrid: 45, diesel: 45, gasoline: 46 }[vehicle.fuel] || 45;
    const averageConsumption =
      vehicle.fuel === 'electric'
        ? 0
        : fuelCity * cityRatio + (fuelHighway || fuelCity) * (1 - cityRatio);

    const fuel =
      vehicle.fuel === 'electric'
        ? Math.round(annualEvCharging * fuelMultiplier)
        : Math.round((km / 100) * averageConsumption * fuelUnitCost * fuelMultiplier);

    const price = Number(vehicle.price || 0);
    const maintenance = Number(profile.annual_maintenance || 0) || Math.round(price * 0.022);
    const insurance = Number(profile.annual_insurance || 0) || Math.round(price * 0.026);
    const kasko = Number(profile.annual_kasko || 0) || Math.round(price * 0.032);
    const mtv = Number(profile.annual_tax || 0) || (price > 1500000 ? 18000 : 12000);
    const tires = Number(profile.annual_tires || 0) || Math.round(price * 0.008);
    const inspection = Number(profile.annual_inspection || 0) || 2500;
    const depProfile = computeDepreciationProfile(vehicle, form);

    return {
      fuel,
      insurance,
      kasko,
      maintenance,
      tax: mtv,
      mtv,
      tires,
      inspection,
      depreciation: depProfile.depreciationLoss12,
      source: 'truth'
    };
  }

  const fuelFactor = { electric: 1.2, hybrid: 2.2, diesel: 3.1, gasoline: 3.8 }[vehicle.fuel] || 3.5;
  const fuel = Math.round(km * fuelFactor * (0.85 + cityRatio * 0.15) * fuelMultiplier);
  const price = Number(vehicle.price || 0);
  const insurance = Math.round(price * 0.028);
  const maintenance = Math.round(price * (vehicle.maintenance >= 8 ? 0.018 : 0.026));
  const mtv = price > 1500000 ? 18000 : 12000;
  const kasko = Math.round(price * 0.032);
  const tires = Math.round(price * 0.008);
  const inspection = 2500;
  const depProfile = computeDepreciationProfile(vehicle, form);

  return {
    fuel,
    insurance,
    kasko,
    maintenance,
    tax: mtv,
    mtv,
    tires,
    inspection,
    depreciation: depProfile.depreciationLoss12,
    source: 'estimate'
  };
}

/**
 * Full ownership breakdown + legacy annual `costs` shape for backward compatibility.
 */
export function buildOwnershipCosts(vehicle, rawForm = {}) {
  const form = normalizeOwnershipForm(rawForm);
  const price = Number(vehicle.price || 0);
  const operating = computeAnnualOperating(vehicle, form);
  const financing = estimateFinancingAnnual(price, form);
  const depreciation = computeDepreciationProfile(vehicle, form);

  const registrationFees = Math.round(price * 0.012 + 8500);
  const purchaseCost = price;

  const annualOperatingTotal =
    operating.fuel +
    operating.insurance +
    operating.kasko +
    operating.maintenance +
    operating.mtv +
    operating.tires +
    operating.inspection +
    operating.depreciation;

  const annualAllIn = annualOperatingTotal + financing.annual;
  const months = Number(form.ownership_months || 36);
  const years = months / 12;
  const total12 = Math.round(annualAllIn + registrationFees * (months >= 12 ? 1 : months / 12));
  const total36 = Math.round(annualAllIn * Math.min(years, 3) + registrationFees);
  const horizonTotal = Math.round(annualAllIn * years + registrationFees);

  const assumptions = {
    km: form.km,
    cityRatio: form.city_ratio,
    ownershipMonths: months,
    financing: financing.note,
    fuel: `Yıllık ${form.km} km, şehir payı %${Math.round(form.city_ratio * 100)}`,
    insurance: operating.source === 'truth' ? 'Katalog sigorta katmanı' : 'Fiyat bandına göre tahmin',
    maintenance: operating.source === 'truth' ? 'Katalog bakım katmanı' : 'Segment bakım skoruna göre tahmin',
    depreciation: depreciation.heuristicDisclaimer
  };

  const legacy = {
    fuel: operating.fuel,
    insurance: operating.insurance,
    kasko: operating.kasko,
    maintenance: operating.maintenance,
    tax: operating.mtv,
    tires: operating.tires,
    depreciation: operating.depreciation,
    total: annualOperatingTotal,
    source: operating.source
  };

  return {
    ...legacy,
    ownership: {
      purchaseCost,
      financing,
      annual: {
        fuel: operating.fuel,
        maintenance: operating.maintenance,
        insurance: operating.insurance,
        kasko: operating.kasko,
        mtv: operating.mtv,
        inspection: operating.inspection,
        tires: operating.tires,
        depreciation: operating.depreciation,
        financing: financing.annual,
        operatingTotal: annualOperatingTotal,
        allInTotal: annualAllIn
      },
      oneTime: { registrationFees },
      totals: { months12: total12, months36: total36, horizonMonths: months, horizonTotal },
      depreciation,
      assumptions,
      dataConfidence: operating.source === 'truth' ? 82 : 58
    }
  };
}

/** @deprecated use buildOwnershipCosts — kept for imports */
export function estimateAnnualCost(vehicle, form) {
  return buildOwnershipCosts(vehicle, form);
}
