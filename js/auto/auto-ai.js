import { estimateAnnualCost } from './auto-cost-engine.js?v=cost2';

function buildReason(vehicle, form, budget) {
  const reasons = [];

  if (vehicle.price <= budget) reasons.push('bütçe disiplininize uyumlu');

  if (form.body === vehicle.body) {
    reasons.push(`${vehicle.body} tercihinizle uyumlu`);
  }

  if (form.usage === 'family' && vehicle.family >= 7) {
    reasons.push('aile kullanımı için güçlü segment uyumu');
  }

  if (form.usage === 'city' && (vehicle.fuel === 'hybrid' || vehicle.fuel === 'electric')) {
    reasons.push('şehir içi kullanımda düşük sahip olma maliyeti');
  }

  if (vehicle.resale >= 8) {
    reasons.push('güçlü ikinci el likiditesi');
  }

  return reasons.slice(0, 3);
}

function buildRisks(vehicle, form, budget) {
  const risks = [];

  if (vehicle.price > budget) risks.push('bütçe üstü fiyat riski');
  if (form.loan === 'yes' && vehicle.price > budget * 0.75) risks.push('finansman yükü dikkat gerektiriyor');
  if (vehicle.resale <= 6) risks.push('ikinci el likiditesi sınırlı');

  return risks.length ? risks : ['dengeli toplam sahip olma riski'];
}

function confidence(score) {
  return Math.min(94, Math.max(62, score));
}

function isPremiumBrand(vehicle) {
  const name = String(vehicle.name || '').toLowerCase();
  return ['bmw', 'mercedes', 'tesla', 'audi', 'volvo', 'lexus'].some(brand => name.includes(brand));
}

export function recommendVehicles(form, catalog = []) {
  const budget = Number(form.budget || 0);
  const requestedFuel = form.fuel || 'any';
  const requestedBody = form.body || '';
  const usage = form.usage || '';
  const isPremiumBudget = budget >= 2500000;

  const sourceVehicles = Array.isArray(catalog) ? catalog : [];

  const strictMatches = sourceVehicles.filter(vehicle =>
    (!requestedBody || vehicle.body === requestedBody) &&
    (requestedFuel === 'any' || vehicle.fuel === requestedFuel)
  );

  const bodyMatches = sourceVehicles.filter(vehicle =>
    !requestedBody || vehicle.body === requestedBody
  );

  const fuelMatches = sourceVehicles.filter(vehicle =>
    requestedFuel === 'any' || vehicle.fuel === requestedFuel
  );

  const candidateVehicles = strictMatches.length >= 3
    ? strictMatches
    : bodyMatches.length >= 3
      ? bodyMatches
      : fuelMatches.length >= 3
        ? fuelMatches
        : sourceVehicles;

  return candidateVehicles
    .map(vehicle => {
      let score = 42;

      const overBudgetRatio = budget > 0 ? (vehicle.price - budget) / budget : 0;
      const underBudgetRatio = budget > 0 ? (budget - vehicle.price) / budget : 0;

      if (vehicle.price <= budget) {
        score += 18;
        if (underBudgetRatio <= 0.18) score += 7;
        if (underBudgetRatio > 0.45 && isPremiumBudget) score -= 12;
      } else {
        score -= Math.min(42, Math.round(overBudgetRatio * 100));
      }

      if (requestedBody && requestedBody === vehicle.body) score += 24;
      else if (requestedBody) score -= 18;

      if (requestedFuel === 'any') {
        score += 6;
      } else if (requestedFuel === vehicle.fuel) {
        score += 24;
      } else {
        score -= requestedFuel === 'electric' ? 34 : 18;
      }

      if (usage === 'family') score += vehicle.family * 1.7;
      if (usage === 'city') score += vehicle.city * 1.7;
      if (usage === 'long') score += vehicle.long * 1.7;

      score += vehicle.resale * 1.4;

      if (isPremiumBudget && vehicle.price >= budget * 0.65) score += 10;
      if (isPremiumBudget && vehicle.price < budget * 0.55) score -= 18;
      if (isPremiumBudget && isPremiumBrand(vehicle)) score += 42;
      if (isPremiumBudget && !isPremiumBrand(vehicle)) score -= 28;
      if (isPremiumBudget && requestedBody && vehicle.body !== requestedBody) score -= 24;
      if (isPremiumBudget && requestedFuel !== 'any' && vehicle.fuel !== requestedFuel) score -= 34;

      if (form.loan === 'yes') {
        if (vehicle.price > budget * 0.9) score -= 16;
        if (vehicle.price <= budget * 0.75) score += 6;
      }

      const costs = estimateAnnualCost(vehicle, form);

      score = Math.round(Math.max(35, Math.min(94, score)));

      return {
        ...vehicle,
        score,
        confidence: confidence(score),
        reasons: buildReason(vehicle, form, budget),
        risks: buildRisks(vehicle, form, budget),
        costs
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
